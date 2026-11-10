import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {
  initAndroidDownloadBridge,
  initPwaInstallListener,
  registerServiceWorker,
} from './services/pwa.service'
import { silentStartupUpdateCheck } from './services/update.service'

// Inisialisasi PWA Service Worker, Install Listener & Jembatan Unduhan APK Android
initPwaInstallListener()
initAndroidDownloadBridge()
void registerServiceWorker()

// Cek pembaruan ringan dari GitHub di latar belakang setelah halaman termuat penuh
if (typeof window !== 'undefined') {
  window.addEventListener(
    'load',
    () => {
      window.setTimeout(() => {
        void silentStartupUpdateCheck()
      }, 4500)
    },
    { once: true }
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
