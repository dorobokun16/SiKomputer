import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  GitBranch,
  Laptop,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  User,
  Volume2,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '@/db/dexie'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Select, Switch, Textarea } from '@/components/ui/primitives'
import { Modal, useToast } from '@/components/ui/overlays'
import { PageHeader } from '@/components/ui/blocks'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import {
  applyServiceWorkerUpdate,
  isPwaInstallable,
  isRunningStandalone,
  promptPwaInstall,
  PWA_INSTALL_AVAILABLE_EVENT,
  PWA_UPDATE_READY_EVENT,
} from '@/services/pwa.service'
import { pushNotification } from '@/services/notification.service'
import {
  APK_UPDATE_PROGRESS_EVENT,
  applyUpdateNow,
  checkForUpdates,
  detectRuntimeInfo,
  getInstalledVersion,
  GITHUB_PAGES_URL,
  GITHUB_REPO_SLUG,
  GITHUB_REPO_URL,
  resolveStandaloneDownloads,
  type ApkUpdateProgressEvent,
  type RuntimeInfo,
  type UpdateCheckResult,
} from '@/services/update.service'

type Section = 'profile' | 'appearance' | 'notif' | 'data' | 'pwa'

const sections: { id: Section; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profil Pengguna', icon: User },
  { id: 'appearance', label: 'Tampilan', icon: Palette },
  { id: 'notif', label: 'Notifikasi', icon: Bell },
  { id: 'data', label: 'Data & Cadangan', icon: Database },
  { id: 'pwa', label: 'PWA & Akses Multi-Device', icon: Smartphone },
]

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
      <div>
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        {desc && <p className="text-xs text-muted">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as Section | null
  const [sec, setSec] = useState<Section>(
    tabParam && sections.some((s) => s.id === tabParam) ? tabParam : 'profile'
  )
  const toast = useToast()
  const { theme, set } = useTheme()
  const { user, updateProfile } = useAuth()

  useEffect(() => {
    if (tabParam && sections.some((s) => s.id === tabParam)) {
      setSec(tabParam)
    }
  }, [tabParam])

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || 'Iwan Kurniawan')
  const [email, setEmail] = useState(user?.email || 'iwan@sikomputer.local')
  const [role, setRole] = useState(user?.role || 'RPA Developer')
  const [bio, setBio] = useState(user?.bio || 'Pengembang otomasi & workstation lokal.')
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Jakarta')
  const [locale, setLocale] = useState(user?.locale || 'id')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmail(user.email || '')
      setRole(user.role || 'RPA Developer')
      setBio(user.bio || '')
      setTimezone(user.timezone || 'Asia/Jakarta')
      setLocale(user.locale || 'id')
    }
  }, [user])

  // Notification switches
  const [enableAudio, setEnableAudio] = useState(true)
  const [enableBrowserNotif, setEnableBrowserNotif] = useState(true)

  // Data stats
  const [dataStats, setDataStats] = useState({
    tasks: 0,
    backlog: 0,
    reminders: 0,
    notes: 0,
    vault: 0,
  })

  // Modal reset
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // PWA & GitHub Update State
  const [canInstallPwa, setCanInstallPwa] = useState(isPwaInstallable())
  const [isStandalone, setIsStandalone] = useState(isRunningStandalone())
  const [pwaUpdateReady, setPwaUpdateReady] = useState(false)
  const installedMeta = getInstalledVersion()
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo>({
    platform: isRunningStandalone() ? 'pwa' : 'web',
    platformLabel: isRunningStandalone() ? 'Aplikasi PWA Terpasang' : 'Browser Web / PWA',
    version: installedMeta.version,
    versionCode: installedMeta.versionCode,
    canSelfUpdate: true,
  })
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [applyingUpdate, setApplyingUpdate] = useState(false)
  const [apkProgress, setApkProgress] = useState<ApkUpdateProgressEvent | null>(null)
  const standaloneDownloads = resolveStandaloneDownloads()

  useEffect(() => {
    void detectRuntimeInfo().then(setRuntimeInfo)

    const handlePwaUpdate = () => {
      setCanInstallPwa(isPwaInstallable())
      setIsStandalone(isRunningStandalone())
    }
    const handleSwUpdateReady = () => {
      setPwaUpdateReady(true)
    }
    const handleApkProgress = (evt: Event) => {
      const detail = (evt as CustomEvent<ApkUpdateProgressEvent>).detail
      if (!detail) return
      setApkProgress(detail)
      if (detail.status === 'error' || detail.status === 'permission-required' || detail.status === 'installing') {
        setApplyingUpdate(false)
      }
    }

    window.addEventListener(PWA_INSTALL_AVAILABLE_EVENT, handlePwaUpdate)
    window.addEventListener(PWA_UPDATE_READY_EVENT, handleSwUpdateReady)
    window.addEventListener(APK_UPDATE_PROGRESS_EVENT, handleApkProgress)
    return () => {
      window.removeEventListener(PWA_INSTALL_AVAILABLE_EVENT, handlePwaUpdate)
      window.removeEventListener(PWA_UPDATE_READY_EVENT, handleSwUpdateReady)
      window.removeEventListener(APK_UPDATE_PROGRESS_EVENT, handleApkProgress)
    }
  }, [])

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setApkProgress(null)
    try {
      const freshRuntime = await detectRuntimeInfo()
      setRuntimeInfo(freshRuntime)
      const res = await checkForUpdates(freshRuntime)
      setUpdateResult(res)
      if (res.status === 'update-available') {
        toast({ title: `Pembaruan v${res.latestVersion || freshRuntime.version} tersedia!`, tone: 'info' })
      } else if (res.status === 'up-to-date') {
        toast({ title: res.message, tone: 'success' })
      } else if (res.status === 'offline') {
        toast({ title: 'Perangkat sedang offline', tone: 'warning' })
      } else if (res.status === 'repo-not-published') {
        toast({ title: 'Belum ada rilis publik terbaru di GitHub', tone: 'info' })
      } else {
        toast({ title: res.message, tone: 'warning' })
      }
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleApplyUpdate = async () => {
    setApplyingUpdate(true)
    try {
      if (pwaUpdateReady && (!updateResult || updateResult.status !== 'update-available')) {
        toast({ title: 'Menerapkan pembaruan cache PWA...', tone: 'info' })
        await applyServiceWorkerUpdate()
        return
      }
      if (!updateResult) return
      const res = await applyUpdateNow(updateResult, runtimeInfo)
      toast({ title: res.message, tone: 'success' })
      if (res.method === 'desktop-bundle') {
        window.setTimeout(() => window.location.reload(), 650)
      } else if (res.method !== 'android-apk-installer') {
        setApplyingUpdate(false)
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Gagal menerapkan pembaruan',
        tone: 'danger',
      })
      setApplyingUpdate(false)
    }
  }

  const handleInstallPwa = async () => {
    const accepted = await promptPwaInstall()
    if (accepted) {
      toast({ title: 'Aplikasi SiKomputer Berhasil Dipasang', tone: 'success' })
      setCanInstallPwa(false)
      setIsStandalone(true)
    } else {
      toast({ title: 'Instalasi ditunda oleh pengguna', tone: 'info' })
    }
  }

  useEffect(() => {
    async function loadStats() {
      try {
        const [tasks, backlog, reminders, notes, vault] = await Promise.all([
          db.tasks.count(),
          db.backlog.count(),
          db.reminders.count(),
          db.notes.count(),
          db.snippets.count(),
        ])
        setDataStats({ tasks, backlog, reminders, notes, vault })
      } catch {
        // ignore
      }
    }
    if (sec === 'data') {
      void loadStats()
    }
  }, [sec])

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast({ title: 'Nama Lengkap Wajib Diisi', tone: 'danger' })
      return
    }
    setProfileSaving(true)
    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        role: role.trim(),
        bio: bio.trim(),
        timezone,
        locale,
      })
      toast({
        title: 'Profil Berhasil Disimpan',
        description: 'Nama dan peran baru aktif di seluruh aplikasi.',
        tone: 'success',
      })
    } catch {
      toast({ title: 'Gagal Menyimpan Profil', tone: 'danger' })
    } finally {
      setProfileSaving(false)
    }
  }

  // Backup data
  const handleExportBackup = async () => {
    try {
      const [tasks, backlog, reminders, notes, snippets, userProfile] = await Promise.all([
        db.tasks.toArray(),
        db.backlog.toArray(),
        db.reminders.toArray(),
        db.notes.toArray(),
        db.snippets.toArray(),
        db.users.get('u-master'),
      ])

      const backup = {
        app: 'SiKomputer',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        data: { tasks, backlog, reminders, notes, snippets, user: userProfile },
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sikomputer-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast({ title: 'Cadangan Berhasil Diunduh', tone: 'success' })
    } catch {
      toast({ title: 'Gagal Mengekspor Cadangan', tone: 'danger' })
    }
  }

  // Restore data
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const parsed = JSON.parse(text)
        if (!parsed.data) throw new Error('Format file tidak valid')

        const { tasks, backlog, reminders, notes, snippets, user: importedUser } = parsed.data

        if (Array.isArray(tasks)) await db.tasks.bulkPut(tasks)
        if (Array.isArray(backlog)) await db.backlog.bulkPut(backlog)
        if (Array.isArray(reminders)) await db.reminders.bulkPut(reminders)
        if (Array.isArray(notes)) await db.notes.bulkPut(notes)
        if (Array.isArray(snippets)) await db.snippets.bulkPut(snippets)
        if (importedUser) await db.users.put(importedUser)

        toast({ title: 'Data Berhasil Dipulihkan!', tone: 'success' })
        setTimeout(() => window.location.reload(), 1200)
      } catch {
        toast({ title: 'Gagal Memulihkan Data', description: 'File JSON tidak cocok.', tone: 'danger' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Reset database
  const handleResetData = async () => {
    try {
      // Kosongkan seluruh tabel data IndexedDB Dexie (pertahankan profil user agar nama/peran tidak hilang)
      await Promise.all(
        db.tables
          .filter((t) => t.name !== 'users')
          .map((t) => t.clear())
      )

      // Pertahankan preferensi tema user
      const currentTheme = localStorage.getItem('sk-theme') || 'dark'
      localStorage.clear()
      localStorage.setItem('sk-theme', currentTheme)
      // Kunci flag agar reload TIDAK memicu auto-seeding data tiruan
      localStorage.setItem('sk-has-seeded', 'true')
      localStorage.setItem('sk-notif-cleared', 'true')

      setDataStats({ tasks: 0, backlog: 0, reminders: 0, notes: 0, vault: 0 })
      setResetModalOpen(false)
      toast({
        title: 'Database Lokal Telah Dikosongkan!',
        description: 'Seluruh tugas, backlog, pengingat, catatan, kredensial, dan notifikasi telah dibersihkan total.',
        tone: 'success',
      })
      setTimeout(() => window.location.reload(), 800)
    } catch {
      toast({ title: 'Gagal mengosongkan data', tone: 'danger' })
    }
  }

  // Muat ulang data contoh / demo
  const handleLoadDemoData = () => {
    localStorage.removeItem('sk-has-seeded')
    localStorage.removeItem('sk-notif-cleared')
    toast({
      title: 'Memuat Ulang Data Contoh...',
      description: 'Data template tugas, backlog, pengingat, dan jadwal RPA akan di-generate kembali.',
      tone: 'info',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola identitas profil lokal, tampilan antarmuka, notifikasi, dan cadangan data."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Navigasi Sidebar Pengaturan */}
        <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
          {sections.map((s) => {
            const active = sec === s.id
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSec(s.id)
                  setSearchParams({ tab: s.id }, { replace: true })
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap sm:text-sm lg:border-0 lg:px-3.5 lg:py-2.5 ${
                  active
                    ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                    : 'border-border/70 bg-surface-2/40 text-muted hover:bg-surface-2 hover:text-foreground lg:bg-transparent'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Konten Tab */}
        <div className="min-w-0 space-y-6">
          {/* ===================================================================
              1. TAB PROFIL
              =================================================================== */}
          {sec === 'profile' && (
            <Card>
              <CardHeader
                title="Profil Pengguna"
                subtitle="Informasi ini disimpan secara lokal di browser Anda."
                icon={<User className="size-4 text-primary" />}
              />
              <form onSubmit={handleSaveProfile} className="space-y-5 p-5 pt-0">
                {/* Avatar Preview */}
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/40 p-4">
                  <Avatar name={fullName || 'User'} size={56} />
                  <div>
                    <h4 className="text-base font-bold text-foreground">{fullName || 'Nama Anda'}</h4>
                    <p className="text-xs text-muted">{role || 'Peran Pekerjaan'}</p>
                    <Badge tone="success" className="mt-1">Penyimpanan Lokal (Offline)</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nama Lengkap">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Iwan Kurniawan"
                    />
                  </Field>

                  <Field label="Alamat Email">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Contoh: iwan@perusahaan.com"
                    />
                  </Field>
                </div>

                <Field label="Peran / Pekerjaan (Job Title)">
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: RPA Developer / Fullstack Engineer / Analyst"
                  />
                </Field>

                <Field label="Bio / Catatan Diri">
                  <Textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tulis ringkasan singkat profil Anda..."
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Zona Waktu">
                    <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="Asia/Jakarta">WIB — Asia/Jakarta (UTC+7)</option>
                      <option value="Asia/Makassar">WITA — Asia/Makassar (UTC+8)</option>
                      <option value="Asia/Jayapura">WIT — Asia/Jayapura (UTC+9)</option>
                      <option value="UTC">UTC (Universal Time)</option>
                    </Select>
                  </Field>

                  <Field label="Bahasa Antarmuka">
                    <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English (US)</option>
                    </Select>
                  </Field>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={profileSaving}>
                    Simpan Perubahan Profil
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ===================================================================
              2. TAB TAMPILAN
              =================================================================== */}
          {sec === 'appearance' && (
            <Card>
              <CardHeader
                title="Tampilan Antarmuka"
                subtitle="Sesuaikan tema visual workstation Anda."
                icon={<Palette className="size-4 text-primary" />}
              />
              <div className="divide-y divide-border p-5 pt-0">
                <Row title="Tema Gelap & Terang" desc="Pilih tema kenyamanan mata saat bekerja.">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={theme === 'dark' ? 'primary' : 'secondary'}
                      icon={<Moon className="size-4" />}
                      onClick={() => set('dark')}
                    >
                      Gelap
                    </Button>
                    <Button
                      size="sm"
                      variant={theme === 'light' ? 'primary' : 'secondary'}
                      icon={<Sun className="size-4" />}
                      onClick={() => set('light')}
                    >
                      Terang
                    </Button>
                  </div>
                </Row>
                <Row title="Tipografi Modern" desc="Menggunakan font Inter Variable untuk teks dan JetBrains Mono untuk kode/angka.">
                  <Badge tone="info">Inter + JetBrains Mono</Badge>
                </Row>
                <Row title="Mode Offline-First" desc="Seluruh antarmuka dioptimalkan untuk respons instan di browser.">
                  <Badge tone="success">Aktif (Local-First)</Badge>
                </Row>
              </div>
            </Card>
          )}

          {/* ===================================================================
              3. TAB NOTIFIKASI
              =================================================================== */}
          {sec === 'notif' && (
            <Card>
              <CardHeader
                title="Preferensi Notifikasi"
                subtitle="Atur bagaimana pengingat dan alarm menyapa Anda."
                icon={<Bell className="size-4 text-primary" />}
              />
              <div className="divide-y divide-border p-5 pt-0">
                <Row title="Notifikasi Desktop Browser" desc="Tampilkan pop-up notifikasi saat waktu reminder tiba.">
                  <Switch
                    checked={enableBrowserNotif}
                    onChange={(v) => {
                      setEnableBrowserNotif(v)
                      if (v && Notification.permission !== 'granted') {
                        Notification.requestPermission()
                      }
                    }}
                  />
                </Row>
                <Row title="Suara Pengingat (Audio Chime)" desc="Bunyikan nada synthesizer lokal saat alarm berbunyi.">
                  <Switch checked={enableAudio} onChange={(v) => setEnableAudio(v)} />
                </Row>
                <div className="pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Volume2 className="size-4" />}
                    onClick={async () => {
                      await pushNotification({
                        title: 'Uji Suara & Pengingat SiKomputer',
                        body: 'Nada synthesizer audio chime dan pusat notifikasi berfungsi sempurna!',
                        tone: 'success',
                        playChime: true,
                        showDesktop: enableBrowserNotif,
                      })
                      toast({ title: 'Uji Suara & Notifikasi Berhasil Dimainkan', tone: 'success' })
                    }}
                  >
                    Uji Bunyi Audio Pengingat
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ===================================================================
              4. TAB DATA & CADANGAN
              =================================================================== */}
          {sec === 'data' && (
            <div className="space-y-6">
              <Card>
                <CardHeader
                  title="Penyimpanan Lokal (IndexedDB)"
                  subtitle="Statistik entitas data yang tersimpan privat di perangkat Anda."
                  icon={<Database className="size-4 text-primary" />}
                />
                <div className="grid grid-cols-2 gap-3 p-5 pt-0 sm:grid-cols-5">
                  <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{dataStats.tasks}</p>
                    <p className="text-xs text-muted">Tugas</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{dataStats.backlog}</p>
                    <p className="text-xs text-muted">Backlog</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{dataStats.reminders}</p>
                    <p className="text-xs text-muted">Reminder</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{dataStats.notes}</p>
                    <p className="text-xs text-muted">Catatan/Vault</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{dataStats.vault}</p>
                    <p className="text-xs text-muted">Snippet</p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Cadangkan & Pulihkan"
                  subtitle="Ekspor seluruh data ke file JSON agar aman dan bisa dipindahkan antar perangkat."
                  icon={<Download className="size-4 text-primary" />}
                />
                <div className="space-y-4 p-5 pt-0">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      icon={<Download className="size-4" />}
                      onClick={handleExportBackup}
                    >
                      Cadangkan Data (.json)
                    </Button>

                    <label className="inline-flex cursor-pointer">
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={handleImportBackup}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<UploadCloud className="size-4" />}
                        onClick={(e) => {
                          const input = (e.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement)
                          input?.click()
                        }}
                      >
                        Pulihkan Data
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-muted">
                    File cadangan mencakup seluruh tugas, catatan, password vault, backlog, dan preferensi profil Anda.
                  </p>

                  <div className="pt-2 border-t border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Data Sampel / Template Bawaan</p>
                        <p className="text-xs text-muted">Muat kembali data tugas, backlog, reminder, dan jadwal RPA contoh jika database kosong.</p>
                      </div>
                      <Button
                        variant="secondary"
                        icon={<RotateCcw className="size-3.5" />}
                        onClick={handleLoadDemoData}
                      >
                        Muat Data Contoh
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-danger/30">
                <CardHeader
                  title="Zona Berbahaya"
                  subtitle="Tindakan ini menghapus seluruh database lokal dari browser Anda."
                />
                <div className="p-5 pt-0">
                  <Button
                    variant="danger"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setResetModalOpen(true)}
                  >
                    Kosongkan Semua Data Lokal
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ===================================================================
              5. TAB PWA, AUTO-UPDATE GITHUB & AKSES MULTI-DEVICE OFFLINE
              =================================================================== */}
          {sec === 'pwa' && (
            <div className="space-y-6">
              {/* Kartu Update Aplikasi via GitHub */}
              <Card>
                <CardHeader
                  title="Pembaruan Aplikasi & Sinkronisasi GitHub"
                  subtitle="Cek dan terapkan pembaruan langsung saat perangkat terhubung internet tanpa menghapus data lokal Anda."
                  icon={<GitBranch className="size-4 text-primary" />}
                  action={
                    <Badge tone="primary" className="font-mono whitespace-nowrap">
                      v{runtimeInfo.version} (build #{runtimeInfo.versionCode})
                    </Badge>
                  }
                />
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">Platform aktif:</span>
                        <Badge tone="neutral">{runtimeInfo.platformLabel}</Badge>
                        <a
                          href={GITHUB_REPO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                        >
                          {GITHUB_REPO_SLUG}
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        {runtimeInfo.platform === 'windows-exe' || runtimeInfo.platform === 'macos-app'
                          ? 'Aplikasi desktop dapat memperbarui paket web dari GitHub Releases dengan satu klik, dan tetap berjalan 100% offline.'
                          : runtimeInfo.platform === 'android-apk'
                          ? 'Aplikasi Android mengunduh APK bertanda tangan resmi dari GitHub Releases dan menjaga seluruh catatan/tugas lokal tetap utuh.'
                          : 'PWA memperbarui cache offline Service Worker secara aman tanpa menyentuh database IndexedDB.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row">
                      <Button
                        variant="secondary"
                        className="w-full justify-center sm:w-auto"
                        icon={<RefreshCw className={`size-4 ${checkingUpdate ? 'animate-spin' : ''}`} />}
                        onClick={handleCheckUpdate}
                        disabled={checkingUpdate || applyingUpdate}
                      >
                        {checkingUpdate ? 'Mengecek GitHub...' : 'Cek Pembaruan'}
                      </Button>

                      {(updateResult?.status === 'update-available' || pwaUpdateReady) && (
                        <Button
                          variant="primary"
                          className="w-full justify-center sm:w-auto"
                          icon={<Sparkles className="size-4" />}
                          onClick={handleApplyUpdate}
                          disabled={applyingUpdate}
                        >
                          {applyingUpdate
                            ? 'Memperbarui...'
                            : updateResult?.latestVersion
                            ? `Update ke v${updateResult.latestVersion}`
                            : 'Terapkan Update Sekarang'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Hasil Pemeriksaan Update */}
                  {(updateResult || pwaUpdateReady) && (
                    <div
                      className={`rounded-lg border p-4 text-xs space-y-2.5 ${
                        updateResult?.status === 'update-available' || pwaUpdateReady
                          ? 'border-primary/40 bg-primary/10'
                          : updateResult?.status === 'up-to-date'
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-amber-500/30 bg-amber-500/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          {updateResult?.status === 'up-to-date' ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                          ) : updateResult?.status === 'update-available' || pwaUpdateReady ? (
                            <Sparkles className="size-4 shrink-0 text-primary" />
                          ) : (
                            <AlertCircle className="size-4 shrink-0 text-amber-500" />
                          )}
                          <span>
                            {updateResult?.message || 'Versi baru aplikasi PWA telah siap diterapkan.'}
                          </span>
                        </div>
                        {updateResult?.releasePageUrl && (
                          <a
                            href={updateResult.releasePageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            Catatan Rilis GitHub
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      {updateResult && updateResult.notes.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-muted pl-1">
                          {updateResult.notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      )}

                      {apkProgress && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-foreground">
                            <span>{apkProgress.message}</span>
                            <span>{apkProgress.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.max(5, apkProgress.progress)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Link Web App GitHub Pages */}
                  <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-surface-2/30 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">Alamat Web / PWA Resmi (Online Sync)</p>
                      <p className="mt-0.5 font-mono text-muted break-all">{GITHUB_PAGES_URL}</p>
                    </div>
                    <a
                      href={GITHUB_PAGES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
                    >
                      Buka GitHub Pages
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Aplikasi Mandiri (Progressive Web App - PWA Desktop & Mobile)"
                  subtitle="Pasang SiKomputer ke laptop lain atau layar HP untuk penggunaan 100% offline permanen layaknya aplikasi native (.exe / .app / .apk)."
                  icon={<Smartphone className="size-4 text-primary" />}
                />
                <div className="space-y-5 p-4 sm:p-5">
                  {/* Status Banner */}
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">Status PWA:</span>
                        {isStandalone ? (
                          <Badge tone="success" className="px-2 py-0.5 whitespace-nowrap">
                            <CheckCircle2 className="mr-1 inline-block size-3" />
                            Aplikasi Terpasang (Standalone)
                          </Badge>
                        ) : canInstallPwa ? (
                          <Badge tone="info" className="px-2 py-0.5 whitespace-nowrap">
                            <Download className="mr-1 inline-block size-3" />
                            Siap Dipasang ke Laptop / HP
                          </Badge>
                        ) : (
                          <Badge tone="neutral" className="px-2 py-0.5 whitespace-nowrap">
                            Mode Browser Web
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {isStandalone
                          ? 'Aplikasi berjalan mandiri di jendela native tanpa tab/bilah alamat browser.'
                          : 'Aplikasi dapat di-install permanen ke Laptop atau HP Anda langsung melalui peramban Chrome / Edge.'}
                      </p>
                    </div>

                    {!isStandalone && canInstallPwa && (
                      <Button
                        variant="primary"
                        className="w-full justify-center sm:w-auto"
                        icon={<Download className="size-4" />}
                        onClick={handleInstallPwa}
                      >
                        Pasang Aplikasi Sekarang
                      </Button>
                    )}
                  </div>

                  {/* Offline Cache Status */}
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
                    <div className="flex items-start gap-2 font-semibold text-emerald-900 dark:text-emerald-200 sm:items-center">
                      <WifiOff className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400 sm:mt-0" />
                      <span>Offline Cache Penuh Aktif (PWA Service Worker + Precache Bundle)</span>
                    </div>
                    <p className="mt-1.5 text-muted leading-relaxed">
                      Seluruh halaman, font lokal, pustaka SheetJS, PDF worker, dan modul utilitas telah di-precache ke memori lokal perangkat Anda. Semua fitur (kecuali panggilan eksternal API Tester ke internet) berjalan 100% mandiri <strong>tanpa koneksi internet dan tanpa server laptop aktif</strong>.
                    </p>
                  </div>

                  {/* Unduh File Standalone Executable (.exe, .app & .apk) */}
                  <div className="rounded-lg border border-border bg-surface-2/40 p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Unduh Berkas Aplikasi Standalone (.exe, .app &amp; .apk)</h4>
                        <p className="mt-0.5 text-xs text-muted">
                          Bawa aplikasi di flashdisk atau kirim ke HP untuk dipasang dan dijalankan secara mandiri 100% offline tanpa perlu server menyala.
                        </p>
                      </div>
                      <Badge tone="success" className="self-start whitespace-nowrap sm:self-auto">100% Offline Portabel</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <a
                        href={standaloneDownloads.exeUrl}
                        download="SiKomputer.exe"
                        target={standaloneDownloads.exeUrl.startsWith('http') ? '_blank' : undefined}
                        rel={standaloneDownloads.exeUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90 sm:w-auto sm:py-2"
                      >
                        <Laptop className="size-4 shrink-0" />
                        Unduh SiKomputer.exe (Windows)
                      </a>

                      <a
                        href={standaloneDownloads.macUrl}
                        download="SiKomputer-macOS.zip"
                        target={standaloneDownloads.macUrl.startsWith('http') ? '_blank' : undefined}
                        rel={standaloneDownloads.macUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface-2 sm:w-auto sm:py-2"
                      >
                        <Download className="size-4 shrink-0 text-primary" />
                        Unduh SiKomputer.app (macOS)
                      </a>

                      <a
                        href={standaloneDownloads.apkUrl}
                        download="SiKomputer.apk"
                        target={standaloneDownloads.apkUrl.startsWith('http') ? '_blank' : undefined}
                        rel={standaloneDownloads.apkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm transition hover:bg-emerald-500/25 sm:w-auto sm:py-2"
                      >
                        <Smartphone className="size-4 shrink-0" />
                        Unduh SiKomputer.apk (Android)
                      </a>
                    </div>
                  </div>

                  {/* Panduan Instalasi ke Laptop & HP */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold tracking-wider text-muted uppercase">
                      Panduan Pemasangan Permanen (Laptop Windows / Mac, Android, & iOS)
                    </h4>
                    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
                      {/* Opsi 1: Laptop Lain */}
                      <div className="rounded-lg border border-border bg-surface-2/30 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                            1
                          </span>
                          <Laptop className="size-4 text-primary" />
                          Laptop Lain (Windows / Mac)
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted leading-relaxed pl-1">
                          <li>Hubungkan laptop lain ke jaringan WiFi yang sama.</li>
                          <li>Buka Chrome atau Microsoft Edge di laptop tersebut, ketik alamat: <code className="text-foreground">https://&lt;ip-laptop&gt;:5173</code>.</li>
                          <li>Klik ikon <strong>Install SiKomputer</strong> (simbol monitor kecil dengan panah bawah di bilah URL Chrome/Edge) atau klik tombol <strong>&quot;Pasang Aplikasi Sekarang&quot;</strong> di atas.</li>
                          <li>Ikon SiKomputer otomatis muncul di <strong>Desktop &amp; Start Menu Windows</strong>! Aplikasi akan membuka jendela native tersendiri layaknya berkas <code className="text-foreground">.exe</code> tanpa perlu tab browser.</li>
                        </ol>
                      </div>

                      {/* Opsi 2: Android */}
                      <div className="rounded-lg border border-border bg-surface-2/30 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                            2
                          </span>
                          <Smartphone className="size-4 text-emerald-500" />
                          Smartphone Android
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted leading-relaxed pl-1">
                          <li>Buka alamat IP laptop di Chrome HP.</li>
                          <li>Ketuk tombol menu titik tiga <strong className="text-foreground">(⋮)</strong> di pojok kanan atas.</li>
                          <li>Pilih opsi <strong className="text-foreground">&quot;Pasang Aplikasi&quot;</strong> atau <strong className="text-foreground">&quot;Tambahkan ke Layar Utama&quot;</strong>.</li>
                          <li>Aplikasi akan terpasang di daftar aplikasi HP Anda dan bisa dibuka kapan pun secara offline!</li>
                        </ol>
                      </div>

                      {/* Opsi 3: iPhone / iPad */}
                      <div className="rounded-lg border border-border bg-surface-2/30 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                            3
                          </span>
                          <Smartphone className="size-4 text-sky-500" />
                          iPhone / iPad (Safari)
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted leading-relaxed pl-1">
                          <li>Buka alamat IP laptop di peramban Safari iPhone.</li>
                          <li>Ketuk tombol <strong className="text-foreground">Bagikan (Share)</strong> di bilah bawah.</li>
                          <li>Pilih <strong className="text-foreground">&quot;Add to Home Screen&quot; (Tambah ke Layar Utama)</strong>.</li>
                          <li>Aplikasi akan berjalan layar penuh (*full screen*) tanpa bilah peramban.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Reset */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Hapus Seluruh Data Lokal?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleResetData}>
              Ya, Hapus Semua Data
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Apakah Anda yakin ingin menghapus seluruh tugas, backlog, reminder, catatan, dan snippet? Tindakan ini tidak dapat dibatalkan jika Anda belum mengunduh berkas cadangan JSON.
        </p>
      </Modal>
    </div>
  )
}
