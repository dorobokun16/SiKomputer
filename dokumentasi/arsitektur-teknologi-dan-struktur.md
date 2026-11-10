# Arsitektur Teknologi & Panduan Struktur Direktori
## SiKomputer — Workstation Produktivitas & RPA Developer

Dokumen ini ditujukan untuk mempermudah pemahaman teknis, pemeliharaan, serta penambahan fitur baru dalam pengembangan aplikasi **SiKomputer**.

---

## 1. Arsitektur Sistem & Prinsip Utama

Aplikasi SiKomputer dibangun di atas arsitektur **Local-First & Client-Side Only**:
1. **Zero Server Dependency:** Tidak ada backend server terpusat. Seluruh komputasi (parsing Excel, kompresi gambar, perbaikan PDF, kalkulasi tanggal) dieksekusi langsung di runtime browser klien (V8 engine).
2. **Kedaulatan Data Penuh (True Privacy):** Data sensitif seperti catatan password, endpoint API, token kredensial, dan berkas spreadsheet tidak pernah dikirim ke internet, melainkan disimpan di **IndexedDB** melalui **Dexie.js**.
3. **PWA Standalone & 100% Offline Cache:** Menggunakan **Service Worker** (`sw.js`) dan **Web App Manifest** sehingga dapat dipasang permanen di ponsel (Android/iOS) dan dibuka mandiri tanpa laptop harus menyala.

---

## 2. Rincian Teknologi yang Digunakan (Tech Stack)

### A. Inti Aplikasi (*Core Framework & Runtime*)
* **React 19 (`react`, `react-dom`):** Pustaka frontend modern dengan optimasi render hooks dan concurrent rendering.
* **TypeScript (`typescript ~7.0`):** Menjamin keamanan tipe data (*type safety*) di seluruh layer servis, database, dan antarmuka.
* **Vite 8 (`vite`, `@vitejs/plugin-react`):** Tooling bundler generasi terbaru yang sangat cepat dengan Hot Module Replacement (HMR).
* **React Router v7 (`react-router-dom`):** Routing sisi klien berbasis SPA (Single Page Application).

### B. Desain & Antarmuka Pengguna (*UI & Styling*)
* **Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`):** Framework utilitas CSS generasi ke-4 berkecepatan tinggi tanpa overhead konfigurasi rumit.
* **Lucide React (`lucide-react`):** Set ikon vektor minimalis, modern, dan ringan.
* **Tipografi Lokal (@fontsource-variable):**
  * `Inter Variable` — Huruf sans-serif antarmuka.
  * `JetBrains Mono Variable` — Huruf monospaced untuk editor kode, format laporan RPA, dan kredensial.
  * *Disimpan lokal di bundel aplikasi, 0 koneksi ke Google Fonts.*
* **Drag and Drop (`@dnd-kit/core`, `@dnd-kit/sortable`):** Pustaka interaksi seret-lepas untuk papan Kanban tugas.
* **Command Palette (`cmdk`):** Navigasi cepat pintasan keyboard (`Ctrl+K` / `Cmd+K`).
* **Visualisasi Data (`recharts`):** Komponen diagram batang dan area chart lokal tanpa pelacak analytics.

### C. Basis Data & Persistensi Lokal
* **Dexie.js v4 (`dexie`):** Abstraksi IndexedDB tingkat tinggi dengan dukungan indeks komposit, skema multi-versi, dan transaksi asinkron.
  * *Tabel Aktif:* `users`, `tasks`, `backlog`, `reminders`, `taskSchedules`, `notes` (Vault), `snippets`, `notifications`, `apiCollections`, `apiRequests`.

### D. Pemrosesan Berkas & Dokumen
* **SheetJS (`xlsx`):**
  * Mengonversi format berkas dua arah CSV &harr; XLSX.
  * Memproses lembar kerja monitoring RPA (*sheet 'Robot List'*).
  * Membaca kolom tersembunyi (*hidden columns*) melalui parameter `cellStyles` dan `sheetStubs`.
* **PDF-lib (`pdf-lib`):**
  * Membangun dan memperbaiki berkas PDF rusak (*xref rebuild*).
  * Menggabungkan banyak gambar menjadi satu berkas PDF multi-halaman (*Image to PDF*).
* **PDF.js (`pdfjs-dist`):**
  * Rendering kanvas halaman PDF untuk pratinjau cetak ulang dokumen.
* **HTML5 Canvas API:**
  * Kompresi gambar, pengubahan resolusi (*upscaling/downscaling*), serta konversi format (WebP, PNG, JPEG).

### E. Audio & Notifikasi Terpadu
* **Web Audio API:**
  * Sintesis audio nada ganda (*dual-tone oscillator*: 587.33 Hz & 880 Hz) untuk alarm dan pengingat tanpa berkas MP3 eksternal.
* **Unified Notification Dispatcher:**
  * Menyinkronkan pusat notifikasi di Header (*bell icon*), notifikasi sistem operasi (*Desktop & Mobile Service Worker*), dan nada dering suara.

### F. Progressive Web App (PWA) & Offline Engine
* **Service Worker (`public/sw.js`):**
  * Strategi *Cache-First* untuk aset statis (HTML, JS, CSS, fonts, workers).
  * Strategi *Network-First dengan Fallback ke `/index.html`* untuk navigasi rute SPA saat offline.
* **Web App Manifest (`public/manifest.webmanifest`):**
  * Konfigurasi standalone, ikon adaptive/maskable, dan tema warna sistem.

---

## 3. Struktur Direktori Proyek

Berikut adalah peta struktur folder proyek `SiKomputer`:

```
d:\Antigravity\SiKomputer\
├── public/                          # Aset statis publik & file PWA
│   ├── favicon.svg                  # Ikon aplikasi (SVG format)
│   ├── pwa-192.png                  # Ikon PWA ukuran 192x192
│   ├── pwa-512.png                  # Ikon PWA ukuran 512x512
│   ├── pwa-maskable-512.png         # Ikon PWA Maskable (layar Android adaptive)
│   ├── manifest.webmanifest         # Manifest PWA standar W3C
│   ├── manifest.json                # Alias manifest untuk kompatibilitas
│   └── sw.js                        # Service Worker untuk Offline Cache
│
├── src/                             # Sumber kode utama aplikasi (TypeScript & React)
│   ├── app/                         # Konfigurasi aplikasi
│   │   └── nav.ts                   # Definisi menu sidebar, grup navigasi, dan rute
│   │
│   ├── components/                  # Komponen antarmuka pengguna
│   │   ├── layout/                  # Struktur tata letak umum
│   │   │   ├── AppShell.tsx         # Wrapper utama, background scheduler, bottom nav
│   │   │   ├── Header.tsx           # Bilah atas (Search, Notifikasi Bell, Profil, DB Sync)
│   │   │   ├── Sidebar.tsx          # Navigasi samping desktop
│   │   │   └── Navigation.tsx       # Item navigasi dan logo
│   │   └── ui/                      # Pustaka komponen desain sistem
│   │       ├── primitives.tsx       # Button, Card, Input, Badge, Switch, Select, Avatar
│   │       ├── overlays.tsx         # Modal, Popover, Segmented, Toast
│   │       └── blocks.tsx           # PageHeader, Dropzone, StateBoundary
│   │
│   ├── db/                          # Lapisan database lokal
│   │   └── dexie.ts                 # Skema IndexedDB, versi migrasi, dan antarmuka entitas
│   │
│   ├── lib/                         # Utilitas umum & Context Provider
│   │   ├── auth.tsx                 # Context profil pengguna lokal (tanpa password cloud)
│   │   ├── theme.tsx                # Context mode gelap/terang (Dark/Light mode)
│   │   ├── cn.ts                    # Penggabung class Tailwind (clsx + tailwind-merge)
│   │   └── ics-generator.ts         # Generator berkas kalender RFC 5545 (.ics)
│   │
│   ├── pages/                       # Halaman modul fungsional
│   │   ├── Dashboard.tsx            # Ringkasan produktivitas harian
│   │   ├── KanbanTasks.tsx          # Manajemen tugas & papan Kanban seret-lepas
│   │   ├── BacklogReminders.tsx     # Backlog proyek sprint & alarm pengingat
│   │   ├── NotesVault.tsx           # Catatan, Password, Token & Endpoint Vault
│   │   ├── SpreadsheetConverter.tsx # Konverter CSV <-> XLSX dengan preview tabel
│   │   ├── ImageStudio.tsx          # Studio kompresi, resize & konversi gambar/PDF
│   │   ├── PdfRepair.tsx            # Perbaikan dokumen PDF rusak & cetak ulang
│   │   ├── DateCalculator.tsx       # Kalkulator selisih tanggal, hari kerja, dan usia
│   │   ├── RpaMonitoring.tsx        # Parser Excel RPA Monitoring (Priority/Non-Priority)
│   │   ├── ApiTester.tsx            # Penguji HTTP/REST API lokal
│   │   ├── Settings.tsx             # Pengaturan profil, tema, notifikasi & install PWA
│   │   ├── DevToolbox.tsx           # Utilitas konversi Base64, UUID, URL Encoder
│   │   ├── SnippetVault.tsx         # Bank kode & snippet prompt
│   │   └── DesignSystem.tsx         # Showcase komponen UI primitives
│   │
│   ├── services/                    # Logika bisnis & modul servis klien
│   │   ├── notification.service.ts  # Pusat notifikasi in-app, Web Audio chime, desktop alert
│   │   ├── pwa.service.ts           # Pendaftaran Service Worker & prompt instalasi PWA
│   │   ├── rpa-monitoring.service.ts# Parser sheet 'Robot List' & pembaca kolom tersembunyi
│   │   ├── spreadsheet.service.ts   # Logika konversi spreadsheet CSV <-> XLSX
│   │   ├── image.service.ts         # Pemrosesan gambar, kompresi, dan builder PDF multi-halaman
│   │   ├── pdf-repair.service.ts    # Rekonstruksi berkas PDF rusak
│   │   ├── date-calculator.service.ts# Algoritma perhitungan hari kerja & selisih tanggal
│   │   └── task-scheduler.service.ts# Scheduler latar belakang tugas berulang otomatis
│   │
│   ├── App.tsx                      # Konfigurasi perutean halaman (React Router)
│   ├── main.tsx                     # Entry point aplikasi & inisialisasi PWA
│   └── index.css                    # Definisi gaya global & tema warna Tailwind v4
│
├── scripts/                         # Skrip pengujian otomatis E2E (Puppeteer)
│   ├── test-rpa-monitoring.cjs      # Uji end-to-end fitur RPA monitoring
│   ├── test-hidden-cols.cjs         # Uji ekstraksi kolom tersembunyi Excel
│   ├── test-notification.cjs        # Uji audio chime & in-app notification
│   ├── test-pwa.cjs                 # Uji Service Worker & status PWA
│   └── gen-icons.cjs                # Generator ikon PWA resolusi tinggi
│
├── dokumentasi/                     # Panduan pengguna, arsitektur, dan referensi
│   ├── README.md                    # Indeks utama dokumentasi
│   ├── arsitektur-teknologi-dan-struktur.md # Dokumen ini (Tech stack & panduan struktur)
│   ├── user-guide.md                # Panduan langkah demi langkah bagi pengguna
│   ├── estimasi-biaya.md            # Rincian arsitektur Rp 0 (Zero Cost)
│   ├── kelebihan-dan-kekurangan.md  # Analisis keunggulan & batasan sistem
│   ├── ui-plan.md                   # Blueprint UI/UX & Design System
│   └── plan-pengerjaan-4-fase.md    # Riwayat tahapan fase pengembangan
│
├── package.json                     # Definisi dependensi & skrip npm
├── tsconfig.json                    # Konfigurasi TypeScript
├── vite.config.ts                   # Konfigurasi Vite & sertifikat HTTPS lokal
└── index.html                       # Dokumen HTML utama & link manifest PWA
```

---

## 4. Panduan Alur Pengembangan (*Developer Guidelines*)

### A. Menambahkan Halaman / Fitur Baru
1. Buat berkas komponen di `src/pages/NamaFitur.tsx`.
2. Jika fitur memiliki logika bisnis atau pengolahan berkas khusus, buat servis pendukung di `src/services/nama-fitur.service.ts`.
3. Daftarkan rute baru di `src/App.tsx`:
   ```tsx
   <Route path="/fitur/nama-fitur" element={<NamaFiturPage />} />
   ```
4. Tambahkan item menu di `src/app/nav.ts` agar muncul di navigasi samping desktop dan bilah bawah mobile.

### B. Menambahkan Tabel atau Entitas Baru di Database Lokal (Dexie)
1. Buka `src/db/dexie.ts`.
2. Definisikan antarmuka TypeScript entitas:
   ```typescript
   export interface CustomEntity {
     id: string
     title: string
     createdAt: string
   }
   ```
3. Tambahkan deklarasi properti di kelas `SiKomputerDB`:
   ```typescript
   customEntities!: EntityTable<CustomEntity, 'id'>
   ```
4. Naikkan nomor versi skema (misal `this.version(5).stores({ customEntities: 'id, createdAt' })`).

### C. Menjalankan Server & Membangun Aplikasi
* **Menjalankan Dev Server Lokal:**
  ```powershell
  npm run dev
  ```
  Aplikasi akan berjalan di `https://localhost:5173` dan dapat diakses dari perangkat lain pada jaringan WiFi yang sama via `https://<ip-laptop>:5173`.
* **Memeriksa Type & Build Produksi:**
  ```powershell
  npm run build
  ```
* **Linting Kode:**
  ```powershell
  npm run lint
  ```

---

## 5. Ringkasan Fitur Unggulan

| Modul | Lokasi Berkas | Kemampuan Utama |
|---|---|---|
| **Laporan Monitoring RPA** | `src/pages/RpaMonitoring.tsx` | Pindai Excel sheet *Robot List*, baca 9 kolom tersembunyi, format laporan Priority & Non-Priority siap salin. |
| **Notes & Kredensial Vault** | `src/pages/NotesVault.tsx` | Simpan password, endpoint API, token rahasia, pin note, mask/unmask mata, 100% lokal di browser. |
| **Konverter Spreadsheet** | `src/pages/SpreadsheetConverter.tsx` | Konversi bolak-balik CSV &harr; XLSX dengan pemilihan pembatas (koma, titik koma, tab) & pratinjau tabel. |
| **Image Studio & PDF** | `src/pages/ImageStudio.tsx` | Kompresi ukuran gambar target KB, ubah resolusi (1x/2x/3x), ekspor WebP/PNG/JPG/PDF multi-halaman. |
| **PDF Repair & Cetak Ulang** | `src/pages/PdfRepair.tsx` | Rekonstruksi struktur xref PDF rusak agar lolos upload ke sistem validasi (seperti Privy). |
| **Kalkulator Tanggal** | `src/pages/DateCalculator.tsx` | Hitung selisih hari, penambahan/pengurangan hari kerja kalender Indonesia, dan usia presisi. |
| **Pusat Notifikasi & Alarm** | `src/services/notification.service.ts` | Notifikasi in-app bell, audio chime synthesizer, dan desktop/mobile PWA notification. |
| **PWA Standalone Engine** | `public/sw.js` & `src/services/pwa.service.ts` | Pemasangan permanen ke HP dengan Offline Cache penuh tanpa perlu server laptop aktif. |
| **Portable Desktop (.exe & .app)** | `dokumentasi/SiKomputer.exe` & `dokumentasi/SiKomputer.app` | Berkas aplikasi portabel standalone untuk Windows (.exe 1.88MB) dan macOS (.app / .zip 1.95MB). |

