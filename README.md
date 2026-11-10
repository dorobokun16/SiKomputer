# SiKomputer — Workstation Lokal, RPA Dev & Utilitas Offline

Aplikasi workstation produktivitas, monitoring RPA, manajemen tugas Kanban, catatan terenkripsi lokal, dan dev toolbox 100% *client-side* yang berjalan sepenuhnya **offline** di Browser Web/PWA, Windows (`.exe`), macOS (`.app`), dan Android (`.apk`), dengan dukungan **Cek Pembaruan & Update Otomatis via GitHub** ketika terhubung ke internet.

## Tautan Utama
- **Aplikasi Web / PWA Online:** https://dorobokun16.github.io/SiKomputer/
- **Unduhan Installer (`.apk`, `.exe`, `.app`):** https://github.com/dorobokun16/SiKomputer/releases/latest
- **Repository:** https://github.com/dorobokun16/SiKomputer

## Fitur Utama
- **Produktivitas & Catatan:** Dashboard analitik real-time, Papan Kanban Tugas, Project Backlog, Reminder dengan notifikasi & audio chime, Catatan & Kredensial dengan modal Notepad lebar, serta Kalkulator Tanggal.
- **RPA & Data Developer:** Monitoring RPA Excel (termasuk pembacaan *hidden columns* + format chat siap salin), Konverter CSV/XLSX, PDF Repair, Image Studio, Base64 Studio, API Tester, Dev Toolbox (termasuk Replace Text & Auto-Generate SQL), dan Snippet & Prompt Vault.
- **100% Lokal & Aman:** Seluruh data disimpan di perangkat Anda (`IndexedDB` + `localStorage`) tanpa server eksternal.
- **Auto-Update GitHub Multi-Platform:**
  - **Web / PWA:** Service Worker otomatis mendeteksi rilis terbaru dan memperbarui cache via `SKIP_WAITING`.
  - **Windows `.exe` & macOS `.app`:** Mengunduh paket web rilis terbaru dari GitHub Releases dalam satu klik tanpa menghapus data lokal.
  - **Android `.apk`:** Mengecek `versionCode` rilis terbaru, mengunduh `.apk` bertanda tangan resmi, dan memicu pemasang sistem Android.

## Pengembangan & Rilis dari Laptop

```bash
# 1. Jalankan server pengembangan lokal
npm run dev

# 2. Validasi tipe & bangun bundle produksi
npm run typecheck
npm run build

# 3. Bangun paket portabel (.exe, .app.zip, .apk, web-dist.zip)
npm run build:portables

# 4. Commit, push ke GitHub main, dan terbitkan GitHub Release v<version>
npm run release:publish
```

> **Catatan Keamanan Keystore Android:** Berkas `android/app/sikomputer-release.jks` dan `android/keystore.properties` bersifat rahasia dan otomatis diabaikan oleh `.gitignore`. Untuk rilis otomatis lewat GitHub Actions (`.github/workflows/release.yml`), simpan kredensial tersebut pada GitHub Repository Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
