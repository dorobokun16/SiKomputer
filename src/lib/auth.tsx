import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { db, type UserEntity } from '@/db/dexie'
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashPassword,
  verifyPassword,
  verifyTotpCode,
} from './crypto'

export interface AuthContextType {
  user: UserEntity | null
  isLoading: boolean
  isAuthenticated: boolean
  isLocked: boolean
  pendingTwoFactorUser: UserEntity | null
  login: (email: string, pass: string, remember?: boolean) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>
  register: (fullName: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>
  verifyTwoFactor: (code: string) => Promise<{ success: boolean; error?: string }>
  verifyRecoveryCode: (code: string) => Promise<{ success: boolean; error?: string }>
  cancelTwoFactor: () => void
  logout: () => Promise<void>
  lock: () => void
  unlock: (pass: string) => Promise<{ success: boolean; error?: string }>
  setupTwoFactor: () => { secret: string; recoveryCodes: string[] }
  confirmTwoFactor: (secret: string, code: string, recoveryCodes: string[]) => Promise<{ success: boolean; error?: string }>
  disableTwoFactor: (pass: string) => Promise<{ success: boolean; error?: string }>
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (patch: Partial<Pick<UserEntity, 'fullName' | 'email' | 'role' | 'bio' | 'timezone' | 'locale'>>) => Promise<void>
  setAutoLockMinutes: (mins: number) => Promise<void>
  autoLockMinutes: number
}

const defaultMasterUser: UserEntity = {
  id: 'u-master',
  email: 'iwan@sikomputer.app',
  fullName: 'Iwan Kurniawan',
  role: 'admin',
  passwordHash: '',
  passwordSalt: '',
  twoFactorEnabled: false,
  timezone: 'Asia/Jakarta',
  locale: 'id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserEntity | null>(defaultMasterUser)
  const [isLoading, setIsLoading] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [pendingTwoFactorUser, setPendingTwoFactorUser] = useState<UserEntity | null>(null)
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(0)

  const idleTimerRef = useRef<number | null>(null)

  // 1. Inisialisasi Akun Lokal Instan (Tanpa Login)
  useEffect(() => {
    async function initAuth() {
      try {
        const found = await db.users.get('u-master')
        if (found) {
          setUser(found)
        } else {
          await db.users.put(defaultMasterUser)
          setUser(defaultMasterUser)
        }
      } catch {
        setUser(defaultMasterUser)
      } finally {
        setIsLoading(false)
      }
    }

    void initAuth()
  }, [])

  // 2. Auto-Lock Tracker Berdasarkan Aktivitas Mouse & Keyboard
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (autoLockMinutes > 0 && user && !isLocked) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsLocked(true)
      }, autoLockMinutes * 60 * 1000)
    }
  }, [autoLockMinutes, user, isLocked])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }))
    resetIdleTimer()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer))
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  // 3. Login
  const login = async (email: string, pass: string, remember = true) => {
    const cleanEmail = email.trim().toLowerCase()
    const targetUser = await db.users.where('email').equalsIgnoreCase(cleanEmail).first()

    if (!targetUser) {
      return { success: false, error: 'Email atau password salah.' }
    }

    const isValid = await verifyPassword(pass, targetUser.passwordSalt, targetUser.passwordHash)
    if (!isValid) {
      return { success: false, error: 'Email atau password salah.' }
    }

    // Jika 2FA aktif, simpan pending user dan minta kode 6 digit
    if (targetUser.twoFactorEnabled) {
      setPendingTwoFactorUser(targetUser)
      return { success: true, requires2FA: true }
    }

    // Sesi berhasil
    setUser(targetUser)
    setIsLocked(false)
    if (remember) {
      localStorage.setItem('sk_session_user_id', targetUser.id)
    } else {
      sessionStorage.setItem('sk_session_user_id', targetUser.id)
    }

    // Rekam sesi lokal
    await db.sessions.add({
      id: crypto.randomUUID(),
      userId: targetUser.id,
      deviceName: navigator.userAgent.includes('Mobile') ? 'Smartphone (Browser)' : 'Komputer Kerja (Browser)',
      location: 'Jakarta, ID (Lokal)',
      ip: '127.0.0.1',
      active: true,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  }

  // 4. Verifikasi 2FA TOTP
  const verifyTwoFactor = async (code: string) => {
    if (!pendingTwoFactorUser || !pendingTwoFactorUser.twoFactorSecret) {
      return { success: false, error: 'Tidak ada sesi 2FA yang aktif.' }
    }

    const valid = await verifyTotpCode(code, pendingTwoFactorUser.twoFactorSecret)
    if (!valid) {
      return { success: false, error: 'Kode verifikasi salah atau sudah kedaluwarsa.' }
    }

    setUser(pendingTwoFactorUser)
    setPendingTwoFactorUser(null)
    setIsLocked(false)
    localStorage.setItem('sk_session_user_id', pendingTwoFactorUser.id)
    return { success: true }
  }

  // 5. Verifikasi Kode Pemulihan 2FA
  const verifyRecoveryCode = async (code: string) => {
    if (!pendingTwoFactorUser) return { success: false, error: 'Tidak ada sesi 2FA.' }

    const cleanCode = code.trim().toUpperCase()
    const currentCodes = pendingTwoFactorUser.recoveryCodes || []
    const idx = currentCodes.indexOf(cleanCode)

    if (idx === -1) {
      return { success: false, error: 'Kode pemulihan tidak valid atau sudah dipakai.' }
    }

    // Hapus kode pemulihan yang telah dipakai
    const nextCodes = currentCodes.filter((_, i) => i !== idx)
    await db.users.update(pendingTwoFactorUser.id, { recoveryCodes: nextCodes })

    const updatedUser = { ...pendingTwoFactorUser, recoveryCodes: nextCodes }
    setUser(updatedUser)
    setPendingTwoFactorUser(null)
    setIsLocked(false)
    localStorage.setItem('sk_session_user_id', updatedUser.id)
    return { success: true }
  }

  const cancelTwoFactor = () => {
    setPendingTwoFactorUser(null)
  }

  // 6. Registrasi Akun Baru
  const register = async (fullName: string, email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase()
    const existing = await db.users.where('email').equalsIgnoreCase(cleanEmail).first()

    if (existing) {
      return { success: false, error: 'Email ini sudah terdaftar di peramban ini.' }
    }

    const { hash, salt } = await hashPassword(pass)
    const newUser: UserEntity = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      fullName: fullName.trim() || 'Pengguna SiKomputer',
      role: 'admin',
      passwordHash: hash,
      passwordSalt: salt,
      twoFactorEnabled: false,
      timezone: 'Asia/Jakarta',
      locale: 'id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.users.add(newUser)
    await db.securityConfig.add({
      id: crypto.randomUUID(),
      userId: newUser.id,
      autoLockMinutes: 15,
      failedAttempts: 0,
    })

    setUser(newUser)
    setIsLocked(false)
    localStorage.setItem('sk_session_user_id', newUser.id)
    return { success: true }
  }

  // 7. Logout & Lock
  const logout = async () => {
    setUser(null)
    setIsLocked(false)
    setPendingTwoFactorUser(null)
    localStorage.removeItem('sk_session_user_id')
    sessionStorage.removeItem('sk_session_user_id')
  }

  const lock = () => {
    setIsLocked(true)
  }

  const unlock = async (pass: string) => {
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' }
    const isValid = await verifyPassword(pass, user.passwordSalt, user.passwordHash)
    if (!isValid) return { success: false, error: 'Password salah.' }
    setIsLocked(false)
    resetIdleTimer()
    return { success: true }
  }

  // 8. Pengaturan 2FA
  const setupTwoFactor = () => {
    const secret = generateTotpSecret()
    const recoveryCodes = generateRecoveryCodes(8)
    return { secret, recoveryCodes }
  }

  const confirmTwoFactor = async (secret: string, code: string, recoveryCodes: string[]) => {
    if (!user) return { success: false, error: 'Harus login terlebih dahulu.' }

    const valid = await verifyTotpCode(code, secret)
    if (!valid) {
      return { success: false, error: 'Kode TOTP tidak cocok. Pastikan jam perangkat Anda akurat.' }
    }

    await db.users.update(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      recoveryCodes: recoveryCodes,
      updatedAt: new Date().toISOString(),
    })

    const updated = await db.users.get(user.id)
    if (updated) setUser(updated)
    return { success: true }
  }

  const disableTwoFactor = async (pass: string) => {
    if (!user) return { success: false, error: 'Harus login.' }
    const isValid = await verifyPassword(pass, user.passwordSalt, user.passwordHash)
    if (!isValid) return { success: false, error: 'Password salah untuk menonaktifkan 2FA.' }

    await db.users.update(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      recoveryCodes: undefined,
      updatedAt: new Date().toISOString(),
    })

    const updated = await db.users.get(user.id)
    if (updated) setUser(updated)
    return { success: true }
  }

  // 9. Ganti Password
  const changePassword = async (oldPass: string, newPass: string) => {
    if (!user) return { success: false, error: 'Harus login.' }
    const isOldValid = await verifyPassword(oldPass, user.passwordSalt, user.passwordHash)
    if (!isOldValid) return { success: false, error: 'Password lama salah.' }

    const { hash, salt } = await hashPassword(newPass)
    await db.users.update(user.id, {
      passwordHash: hash,
      passwordSalt: salt,
      updatedAt: new Date().toISOString(),
    })

    const updated = await db.users.get(user.id)
    if (updated) setUser(updated)
    return { success: true }
  }

  // 10. Update Profil
  const updateProfile = async (patch: Partial<Pick<UserEntity, 'fullName' | 'email' | 'role' | 'bio' | 'timezone' | 'locale'>>) => {
    if (!user) return
    await db.users.update(user.id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    const updated = await db.users.get(user.id)
    if (updated) setUser(updated)
  }

  const setAutoLockMinutes = async (mins: number) => {
    setAutoLockMinutesState(mins)
    if (user) {
      const cfg = await db.securityConfig.where('userId').equals(user.id).first()
      if (cfg) {
        await db.securityConfig.update(cfg.id, { autoLockMinutes: mins })
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isLocked,
        pendingTwoFactorUser,
        login,
        register,
        verifyTwoFactor,
        verifyRecoveryCode,
        cancelTwoFactor,
        logout,
        lock,
        unlock,
        setupTwoFactor,
        confirmTwoFactor,
        disableTwoFactor,
        changePassword,
        updateProfile,
        setAutoLockMinutes,
        autoLockMinutes,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}

