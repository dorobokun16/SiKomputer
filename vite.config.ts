import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, type Plugin } from 'vite'

interface PackageMeta {
  version?: string
  sikomputer?: {
    versionCode?: number
    githubOwner?: string
    githubRepo?: string
    releaseNotes?: string[]
  }
}

const pkgPath = path.resolve(import.meta.dirname, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageMeta
const appVersion = pkg.version || '1.1.0'
const appVersionCode = pkg.sikomputer?.versionCode ?? 2
const githubOwner = process.env.VITE_GITHUB_OWNER || pkg.sikomputer?.githubOwner || 'dorobokun16'
const githubRepo = process.env.VITE_GITHUB_REPO || pkg.sikomputer?.githubRepo || 'SiKomputer'
const releaseNotes = pkg.sikomputer?.releaseNotes || []
const buildTime = new Date().toISOString()

const rawBase = process.env.VITE_BASE_PATH || '/'
const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

function buildVersionManifest() {
  const repoSlug = `${githubOwner}/${githubRepo}`
  return {
    name: 'SiKomputer',
    version: appVersion,
    versionCode: appVersionCode,
    builtAt: buildTime,
    repository: repoSlug,
    releasePageUrl: `https://github.com/${repoSlug}/releases/latest`,
    pagesUrl: `https://${githubOwner}.github.io/${githubRepo}/`,
    downloads: {
      apkUrl: `https://github.com/${repoSlug}/releases/latest/download/SiKomputer.apk`,
      exeUrl: `https://github.com/${repoSlug}/releases/latest/download/SiKomputer.exe`,
      macUrl: `https://github.com/${repoSlug}/releases/latest/download/SiKomputer-macOS.zip`,
      webBundleUrl: `https://github.com/${repoSlug}/releases/latest/download/SiKomputer-web-dist.zip`,
    },
    notes: releaseNotes,
  }
}

/**
 * Injeksi seluruh aset hasil build (JS, MJS Worker, CSS, WOFF2 Font) ke dalam dist/sw.js,
 * hasilkan dist/version.json untuk auto-update GitHub, dan sesuaikan subpath bila dibangun untuk GitHub Pages.
 */
function offlinePrecachePlugin(basePath: string): Plugin {
  return {
    name: 'sikomputer-offline-precache',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, 'dist')
      const swPath = path.join(distDir, 'sw.js')
      const assetsDir = path.join(distDir, 'assets')

      // 1. Tulis manifest versi dist/version.json (dan sinkronkan public/version.json pada build root)
      const manifest = buildVersionManifest()
      fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
      if (basePath === '/') {
        const publicVersionPath = path.resolve(import.meta.dirname, 'public', 'version.json')
        fs.writeFileSync(publicVersionPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
      }

      // 2. Sesuaikan basePath pada manifest PWA & fallback SPA 404.html jika di-deploy di subpath (GitHub Pages)
      if (basePath !== '/') {
        for (const mfName of ['manifest.webmanifest', 'manifest.json']) {
          const mfPath = path.join(distDir, mfName)
          if (fs.existsSync(mfPath)) {
            try {
              const data = JSON.parse(fs.readFileSync(mfPath, 'utf-8')) as {
                start_url?: string
                scope?: string
                icons?: Array<{ src?: string }>
              }
              data.start_url = basePath
              data.scope = basePath
              if (Array.isArray(data.icons)) {
                data.icons = data.icons.map((ic) => ({
                  ...ic,
                  src: ic.src ? `${basePath}${ic.src.replace(/^\//, '')}` : ic.src,
                }))
              }
              fs.writeFileSync(mfPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
            } catch {
              // ignore
            }
          }
        }

        const indexHtmlPath = path.join(distDir, 'index.html')
        if (fs.existsSync(indexHtmlPath)) {
          let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8')
          for (const pubAsset of [
            '/favicon.ico',
            '/favicon.png',
            '/favicon.svg',
            '/pwa-192.png',
            '/pwa-512.png',
            '/manifest.webmanifest',
            '/manifest.json',
          ]) {
            indexHtml = indexHtml.replaceAll(`"${pubAsset}"`, `"${basePath}${pubAsset.slice(1)}"`)
          }
          fs.writeFileSync(indexHtmlPath, indexHtml, 'utf-8')
          fs.copyFileSync(indexHtmlPath, path.join(distDir, '404.html'))
        }
      }

      if (!fs.existsSync(swPath) || !fs.existsSync(assetsDir)) return

      const assetFiles = fs
        .readdirSync(assetsDir)
        .filter((f) => /\.(js|mjs|css|woff2|png|svg|ico)$/i.test(f))
        .map((f) => `'${basePath}assets/${f}'`)

      let swContent = fs.readFileSync(swPath, 'utf-8')
      swContent = swContent.replace("const BASE_PATH = '/'", `const BASE_PATH = '${basePath}'`)
      swContent = swContent.replace('/* __VITE_PRECACHE_ASSETS__ */', assetFiles.join(',\n  '))
      swContent = swContent.replace(
        "const CACHE_NAME = 'sikomputer-offline-v2'",
        `const CACHE_NAME = 'sikomputer-offline-${appVersion}-${Date.now()}'`
      )
      fs.writeFileSync(swPath, swContent, 'utf-8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: normalizedBase,
  plugins: [react(), tailwindcss(), basicSsl(), offlinePrecachePlugin(normalizedBase)],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_VERSION_CODE__: JSON.stringify(appVersionCode),
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
    __GITHUB_OWNER__: JSON.stringify(githubOwner),
    __GITHUB_REPO__: JSON.stringify(githubRepo),
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
