/**
 * SiKomputer - PWA Service Worker Registration, Installation & Update Manager
 * Mengelola pendaftaran Service Worker, penangkapan prompt instalasi (A2HS - Add to Home Screen),
 * deteksi mode standalone offline, dan mekanisme pembaruan cache PWA via SKIP_WAITING.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let swRegistration: ServiceWorkerRegistration | null = null

export const PWA_INSTALL_AVAILABLE_EVENT = 'sikomputer:pwa-installable'
export const PWA_UPDATE_READY_EVENT = 'sikomputer:pwa-update-ready'

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  )
}

/**
 * Daftarkan Service Worker dan dengarkan pembaruan versi baru di latar belakang
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isCapacitorNative()) {
    return null
  }
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const reg = await navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
    swRegistration = reg

    if (reg.waiting && navigator.serviceWorker.controller) {
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT, { detail: true }))
    }

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent(PWA_UPDATE_READY_EVENT, { detail: true }))
        }
      })
    })

    console.log('[PWA] Service Worker aktif terdaftar:', reg.scope)
    return reg
  } catch (err) {
    console.warn('[PWA] Pendaftaran Service Worker gagal:', err)
    return null
  }
}

/**
 * Periksa apakah Service Worker memiliki update terbaru di server
 */
export async function checkServiceWorkerUpdate(): Promise<boolean> {
  if (isCapacitorNative() || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }
  try {
    const reg = swRegistration || (await navigator.serviceWorker.getRegistration()) || null
    if (!reg) return false
    swRegistration = reg
    await reg.update()
    return Boolean(reg.waiting || reg.installing)
  } catch {
    return false
  }
}

/**
 * Terapkan pembaruan Service Worker & bersihkan cache usang lalu muat ulang halaman
 */
export async function applyServiceWorkerUpdate(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.getRegistration())
      if (reg?.waiting) {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 1500)
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => {
              window.clearTimeout(timer)
              resolve()
            },
            { once: true }
          )
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
        })
      } else if (reg) {
        await reg.update()
      }
    }
  } catch {
    // Tetap muat ulang sebagai fallback
  }
  window.location.reload()
}

/**
 * Inisialisasi pendengar event instalasi PWA
 */
export function initPwaInstallListener(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_AVAILABLE_EVENT, { detail: true }))
    console.log('[PWA] Event instalasi ditangkap, aplikasi siap di-install permanen ke HP / Desktop')
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    console.log('[PWA] Aplikasi SiKomputer berhasil di-install permanen!')
  })
}

export function isPwaInstallable(): boolean {
  return deferredPrompt !== null
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false
  }

  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_AVAILABLE_EVENT, { detail: false }))
    return choice.outcome === 'accepted'
  } catch {
    return false
  }
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    isCapacitorNative() ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

/**
 * Interseptor unduhan blob/data URL khusus saat berjalan di dalam APK Android (WebView)
 * agar hasil ekspor XLSX, CSV, PDF, PNG, JSON, SQL, dan TXT tersimpan langsung ke folder Downloads HP.
 */
export function initAndroidDownloadBridge(): void {
  if (typeof window === 'undefined') return
  const androidBridge = (
    window as unknown as {
      AndroidDownloader?: { saveFile: (base64: string, fileName: string, mimeType: string) => void }
    }
  ).AndroidDownloader

  if (!androidBridge) return

  const originalClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    const downloadName = this.getAttribute('download')
    const href = this.href || ''
    if (downloadName !== null && (href.startsWith('blob:') || href.startsWith('data:'))) {
      const fileName = downloadName || `sikomputer-${Date.now()}`
      void fetch(href)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = typeof reader.result === 'string' ? reader.result : ''
            const base64 = result.includes(',') ? result.split(',')[1] : result
            if (base64) {
              androidBridge.saveFile(base64, fileName, blob.type || 'application/octet-stream')
            }
          }
          reader.readAsDataURL(blob)
        })
        .catch(() => originalClick.call(this))
      return
    }
    return originalClick.call(this)
  }
}
