/**
 * SiKomputer - GitHub Auto-Update & Multi-Platform Release Service
 * Mengecek pembaruan dari repository GitHub (GitHub Releases & GitHub Pages) saat online
 * dan menerapkan update secara langsung untuk Web/PWA, Windows .exe, macOS .app, & Android .apk.
 */

import { applyServiceWorkerUpdate, checkServiceWorkerUpdate, isCapacitorNative, isRunningStandalone } from './pwa.service'
import { pushNotification } from './notification.service'

export type RuntimePlatform = 'android-apk' | 'windows-exe' | 'macos-app' | 'pwa' | 'web'

export interface RuntimeInfo {
  platform: RuntimePlatform
  platformLabel: string
  version: string
  versionCode: number
  canSelfUpdate: boolean
  canRequestPackageInstalls?: boolean
}

export interface ReleaseDownloads {
  apkUrl: string
  exeUrl: string
  macUrl: string
  webBundleUrl?: string
}

export interface RemoteVersionManifest {
  version: string
  versionCode?: number
  publishedAt?: string
  releasePageUrl: string
  downloads: ReleaseDownloads
  notes: string[]
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'offline'
  | 'repo-not-published'
  | 'error'

export interface UpdateCheckResult {
  status: UpdateStatus
  checkedAt: string
  currentVersion: string
  currentVersionCode: number
  latestVersion?: string
  latestVersionCode?: number
  publishedAt?: string
  releasePageUrl: string
  downloads: ReleaseDownloads
  notes: string[]
  swUpdateDetected?: boolean
  message: string
}

export interface ApkUpdateProgressEvent {
  status: 'downloading' | 'installing' | 'permission-required' | 'error'
  message: string
  progress: number
}

export const APK_UPDATE_PROGRESS_EVENT = 'sikomputer:apk-update-status'

export const GITHUB_OWNER = typeof __GITHUB_OWNER__ !== 'undefined' ? __GITHUB_OWNER__ : 'dorobokun16'
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : 'SiKomputer'
export const GITHUB_REPO_SLUG = `${GITHUB_OWNER}/${GITHUB_REPO}`
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_SLUG}`
export const GITHUB_PAGES_URL = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/`
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`

const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO_SLUG}/releases/latest`
const PAGES_MANIFEST_URL = `${GITHUB_PAGES_URL}version.json`
const RAW_MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_SLUG}/main/public/version.json`

const DEFAULT_DOWNLOADS: ReleaseDownloads = {
  apkUrl: `${GITHUB_REPO_URL}/releases/latest/download/SiKomputer.apk`,
  exeUrl: `${GITHUB_REPO_URL}/releases/latest/download/SiKomputer.exe`,
  macUrl: `${GITHUB_REPO_URL}/releases/latest/download/SiKomputer-macOS.zip`,
  webBundleUrl: `${GITHUB_REPO_URL}/releases/latest/download/SiKomputer-web-dist.zip`,
}

interface AndroidUpdaterBridge {
  getAppInfo?: () => string
  openDownloadUrl?: (url: string) => void
  downloadAndInstallApk?: (apkUrl: string) => void
}

function getAndroidUpdaterBridge(): AndroidUpdaterBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { AndroidUpdater?: AndroidUpdaterBridge }).AndroidUpdater
}

export function getInstalledVersion(): { version: string; versionCode: number; builtAt: string } {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0'
  const versionCode = typeof __APP_VERSION_CODE__ !== 'undefined' ? Number(__APP_VERSION_CODE__) : 2
  const builtAt = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : ''
  return { version, versionCode, builtAt }
}

/**
 * Bandingkan dua semver string ("1.2.0" > "1.1.0" -> 1)
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = a.replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  const cleanB = b.replace(/^v/i, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(cleanA.length, cleanB.length)
  for (let i = 0; i < len; i++) {
    const va = cleanA[i] || 0
    const vb = cleanB[i] || 0
    if (va > vb) return 1
    if (va < vb) return -1
  }
  return 0
}

/**
 * Tentukan sumber unduhan biner terbaik: pakai jalur lokal /downloads/ saat dijalankan
 * dari server lokal laptop, atau GitHub Releases saat berjalan dari GitHub Pages / APK.
 */
export function resolveStandaloneDownloads(): ReleaseDownloads {
  if (typeof window === 'undefined') return DEFAULT_DOWNLOADS
  const baseUrl = import.meta.env.BASE_URL || '/'
  const isGitHubPages = window.location.hostname.endsWith('github.io') || baseUrl !== '/'
  if (isCapacitorNative() || isGitHubPages) {
    return DEFAULT_DOWNLOADS
  }
  return {
    exeUrl: `${baseUrl}downloads/SiKomputer.exe`,
    macUrl: `${baseUrl}downloads/SiKomputer-macOS.zip`,
    apkUrl: `${baseUrl}downloads/SiKomputer.apk`,
    webBundleUrl: DEFAULT_DOWNLOADS.webBundleUrl,
  }
}

export async function detectRuntimeInfo(): Promise<RuntimeInfo> {
  const installed = getInstalledVersion()

  // 1. Cek Native APK bridge
  const androidBridge = getAndroidUpdaterBridge()
  if (isCapacitorNative() && androidBridge?.getAppInfo) {
    try {
      const info = JSON.parse(androidBridge.getAppInfo()) as {
        versionName?: string
        versionCode?: number
        canRequestPackageInstalls?: boolean
      }
      return {
        platform: 'android-apk',
        platformLabel: 'Android APK (Native)',
        version: info.versionName || installed.version,
        versionCode: Number(info.versionCode) || installed.versionCode,
        canSelfUpdate: true,
        canRequestPackageInstalls: info.canRequestPackageInstalls,
      }
    } catch {
      return {
        platform: 'android-apk',
        platformLabel: 'Android APK (Native)',
        version: installed.version,
        versionCode: installed.versionCode,
        canSelfUpdate: true,
      }
    }
  }

  // 2. Cek Launcher Desktop Windows .exe / macOS .app via localhost endpoint
  if (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')) {
    try {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), 1200)
      const res = await fetch('/__launcher/info', { cache: 'no-store', signal: ctrl.signal })
      window.clearTimeout(timer)
      if (res.ok) {
        const data = (await res.json()) as {
          platform?: string
          canSelfUpdateWeb?: boolean
          webVersion?: string
          webVersionCode?: number
        }
        if (data.platform === 'windows-exe' || data.platform === 'macos-app') {
          return {
            platform: data.platform,
            platformLabel: data.platform === 'windows-exe' ? 'Desktop Windows (.exe)' : 'Desktop macOS (.app)',
            version: data.webVersion || installed.version,
            versionCode: Number(data.webVersionCode) || installed.versionCode,
            canSelfUpdate: Boolean(data.canSelfUpdateWeb),
          }
        }
      }
    } catch {
      // Bukan launcher desktop (misal vite dev/preview)
    }
  }

  // 3. Web / PWA
  if (isRunningStandalone()) {
    return {
      platform: 'pwa',
      platformLabel: 'Aplikasi PWA Terpasang',
      version: installed.version,
      versionCode: installed.versionCode,
      canSelfUpdate: true,
    }
  }

  return {
    platform: 'web',
    platformLabel: 'Browser Web / PWA',
    version: installed.version,
    versionCode: installed.versionCode,
    canSelfUpdate: true,
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; data?: T }> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { ok: false, status: res.status }
    }
    const data = (await res.json()) as T
    return { ok: true, status: res.status, data }
  } catch {
    return { ok: false, status: 0 }
  } finally {
    window.clearTimeout(timer)
  }
}

interface GitHubReleaseApiResponse {
  tag_name?: string
  name?: string
  body?: string
  published_at?: string
  html_url?: string
  assets?: Array<{ name?: string; browser_download_url?: string }>
}

interface ManifestJsonShape {
  version?: string
  versionCode?: number
  builtAt?: string
  releasePageUrl?: string
  downloads?: Partial<ReleaseDownloads>
  notes?: string[]
}

async function fetchRemoteRelease(): Promise<{ found: boolean; statusCode: number; manifest?: RemoteVersionManifest }> {
  // 1. Prioritaskan GitHub Releases API (langsung membawa daftar asset apk/exe/zip/web-dist)
  const relRes = await fetchJsonWithTimeout<GitHubReleaseApiResponse>(`${RELEASE_API_URL}?_t=${Date.now()}`, 8000)
  let releaseManifest: RemoteVersionManifest | undefined

  if (relRes.ok && relRes.data?.tag_name) {
    const rel = relRes.data
    const tagVersion = (rel.tag_name || '').replace(/^v/i, '')
    const assets = rel.assets || []
    const findAsset = (name: string) => assets.find((a) => a.name === name)?.browser_download_url
    const parsedNotes = (rel.body || '')
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 6)

    releaseManifest = {
      version: tagVersion,
      publishedAt: rel.published_at,
      releasePageUrl: rel.html_url || GITHUB_LATEST_RELEASE_URL,
      downloads: {
        apkUrl: findAsset('SiKomputer.apk') || DEFAULT_DOWNLOADS.apkUrl,
        exeUrl: findAsset('SiKomputer.exe') || DEFAULT_DOWNLOADS.exeUrl,
        macUrl: findAsset('SiKomputer-macOS.zip') || DEFAULT_DOWNLOADS.macUrl,
        webBundleUrl: findAsset('SiKomputer-web-dist.zip') || DEFAULT_DOWNLOADS.webBundleUrl,
      },
      notes: parsedNotes,
    }
  }

  // 2. Cek version.json (GitHub Pages atau raw main branch) untuk mencocokkan versionCode & releaseNotes
  for (const manifestUrl of [
    `${PAGES_MANIFEST_URL}?_t=${Date.now()}`,
    `${RAW_MANIFEST_URL}?_t=${Date.now()}`,
  ]) {
    const mfRes = await fetchJsonWithTimeout<ManifestJsonShape>(manifestUrl, 7000)
    const mf = mfRes.data
    const mfVersion = mf?.version
    if (mfRes.ok && mf && mfVersion) {
      if (!releaseManifest || compareSemver(mfVersion, releaseManifest.version) >= 0) {
        return {
          found: true,
          statusCode: 200,
          manifest: {
            version: mfVersion,
            versionCode: mf.versionCode,
            publishedAt: mf.builtAt || releaseManifest?.publishedAt,
            releasePageUrl: mf.releasePageUrl || releaseManifest?.releasePageUrl || GITHUB_LATEST_RELEASE_URL,
            downloads: {
              apkUrl: mf.downloads?.apkUrl || releaseManifest?.downloads.apkUrl || DEFAULT_DOWNLOADS.apkUrl,
              exeUrl: mf.downloads?.exeUrl || releaseManifest?.downloads.exeUrl || DEFAULT_DOWNLOADS.exeUrl,
              macUrl: mf.downloads?.macUrl || releaseManifest?.downloads.macUrl || DEFAULT_DOWNLOADS.macUrl,
              webBundleUrl: mf.downloads?.webBundleUrl || releaseManifest?.downloads.webBundleUrl || DEFAULT_DOWNLOADS.webBundleUrl,
            },
            notes: mf.notes && mf.notes.length > 0 ? mf.notes : releaseManifest?.notes || [],
          },
        }
      }
      // Kalau release tag lebih baru daripada manifest, perkaya versionCode jika selaras
      return {
        found: true,
        statusCode: 200,
        manifest: releaseManifest,
      }
    }
  }

  if (releaseManifest) {
    return { found: true, statusCode: 200, manifest: releaseManifest }
  }

  return { found: false, statusCode: relRes.status }
}

/**
 * Cek ketersediaan pembaruan dari GitHub & Service Worker PWA
 */
export async function checkForUpdates(runtime?: RuntimeInfo): Promise<UpdateCheckResult> {
  const info = runtime || (await detectRuntimeInfo())
  const nowIso = new Date().toISOString()

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      status: 'offline',
      checkedAt: nowIso,
      currentVersion: info.version,
      currentVersionCode: info.versionCode,
      releasePageUrl: GITHUB_LATEST_RELEASE_URL,
      downloads: DEFAULT_DOWNLOADS,
      notes: [],
      message: 'Perangkat sedang offline. Hubungkan internet untuk mengecek pembaruan dari GitHub.',
    }
  }

  const [swUpdateDetected, remote] = await Promise.all([
    info.platform === 'pwa' || info.platform === 'web' ? checkServiceWorkerUpdate() : Promise.resolve(false),
    fetchRemoteRelease(),
  ])

  if (!remote.found || !remote.manifest) {
    if (swUpdateDetected) {
      return {
        status: 'update-available',
        checkedAt: nowIso,
        currentVersion: info.version,
        currentVersionCode: info.versionCode,
        latestVersion: info.version,
        releasePageUrl: GITHUB_LATEST_RELEASE_URL,
        downloads: DEFAULT_DOWNLOADS,
        notes: ['Pembaruan aset PWA telah terdeteksi dari server host.'],
        swUpdateDetected: true,
        message: 'Pembaruan cache aplikasi PWA siap diterapkan.',
      }
    }

    if (remote.statusCode === 404) {
      return {
        status: 'repo-not-published',
        checkedAt: nowIso,
        currentVersion: info.version,
        currentVersionCode: info.versionCode,
        releasePageUrl: GITHUB_REPO_URL,
        downloads: DEFAULT_DOWNLOADS,
        notes: [],
        message: `Repository ${GITHUB_REPO_SLUG} belum mempublikasikan rilis di GitHub, atau berstatus Private.`,
      }
    }

    return {
      status: 'error',
      checkedAt: nowIso,
      currentVersion: info.version,
      currentVersionCode: info.versionCode,
      releasePageUrl: GITHUB_LATEST_RELEASE_URL,
      downloads: DEFAULT_DOWNLOADS,
      notes: [],
      message: 'Tidak dapat menghubungi server GitHub saat ini. Coba lagi saat koneksi stabil.',
    }
  }

  const mf = remote.manifest
  const semverCmp = compareSemver(mf.version, info.version)
  const codeNewer = typeof mf.versionCode === 'number' && mf.versionCode > info.versionCode
  const isNewer = semverCmp > 0 || codeNewer || swUpdateDetected

  return {
    status: isNewer ? 'update-available' : 'up-to-date',
    checkedAt: nowIso,
    currentVersion: info.version,
    currentVersionCode: info.versionCode,
    latestVersion: mf.version,
    latestVersionCode: mf.versionCode,
    publishedAt: mf.publishedAt,
    releasePageUrl: mf.releasePageUrl,
    downloads: mf.downloads,
    notes: mf.notes,
    swUpdateDetected,
    message: isNewer
      ? `Versi baru v${mf.version} tersedia di GitHub (terpasang saat ini v${info.version}).`
      : `Aplikasi sudah menggunakan versi terbaru (v${info.version}).`,
  }
}

/**
 * Terapkan pembaruan sesuai platform berjalan
 */
export async function applyUpdateNow(
  result: UpdateCheckResult,
  runtime: RuntimeInfo
): Promise<{ started: boolean; method: string; message: string }> {
  // 1. Desktop Windows .exe atau macOS .app -> unduh web-dist.zip via launcher lokal & reload
  if (runtime.platform === 'windows-exe' || runtime.platform === 'macos-app') {
    const bundleUrl = result.downloads.webBundleUrl
    if (runtime.canSelfUpdate && bundleUrl) {
      const res = await fetch('/__launcher/apply-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webBundleUrl: bundleUrl }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        return {
          started: true,
          method: 'desktop-bundle',
          message: 'Pembaruan berhasil diunduh ke desktop. Memuat ulang aplikasi...',
        }
      }
      throw new Error(data.error || 'Launcher gagal menerapkan paket pembaruan.')
    }
    const fallbackUrl = runtime.platform === 'windows-exe' ? result.downloads.exeUrl : result.downloads.macUrl
    window.open(fallbackUrl, '_blank', 'noopener,noreferrer')
    return {
      started: true,
      method: 'external-download',
      message: 'Mengunduh installer terbaru dari GitHub Releases...',
    }
  }

  // 2. Android APK -> panggil AndroidUpdater native bridge untuk mengunduh & memicu Package Installer
  if (runtime.platform === 'android-apk') {
    const androidBridge = getAndroidUpdaterBridge()
    if (androidBridge?.downloadAndInstallApk) {
      androidBridge.downloadAndInstallApk(result.downloads.apkUrl)
      return {
        started: true,
        method: 'android-apk-installer',
        message: 'Mengunduh SiKomputer.apk terbaru dari GitHub Releases...',
      }
    }
    window.open(result.downloads.apkUrl, '_blank', 'noopener,noreferrer')
    return {
      started: true,
      method: 'external-download',
      message: 'Membuka tautan unduhan SiKomputer.apk terbaru...',
    }
  }

  // 3. Web / PWA -> update Service Worker & reload
  await applyServiceWorkerUpdate()
  return {
    started: true,
    method: 'pwa-sw',
    message: 'Cache PWA diperbarui. Memuat ulang aplikasi...',
  }
}

/**
 * Cek pembaruan ringan otomatis satu kali per sesi jika perangkat sedang online
 */
export async function silentStartupUpdateCheck(): Promise<void> {
  if (typeof window === 'undefined' || navigator.onLine === false) return
  const SESSION_KEY = 'sikomputer-update-checked-session'
  try {
    if (window.sessionStorage.getItem(SESSION_KEY)) return
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore
  }

  try {
    const runtime = await detectRuntimeInfo()
    const result = await checkForUpdates(runtime)
    if (result.status === 'update-available' && result.latestVersion) {
      await pushNotification({
        title: `Pembaruan SiKomputer v${result.latestVersion} Tersedia`,
        body: 'Klik notifikasi ini untuk memperbarui aplikasi langsung melalui GitHub.',
        tone: 'info',
        link: '/settings?tab=pwa',
        playChime: false,
        showDesktop: false,
      })
    }
  } catch {
    // Jangan ganggu pengalaman offline/lokal bila pengecekan latar belakang gagal
  }
}
