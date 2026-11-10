# Dokumentasi Sistem SiKomputer
## Versi Arsitektur: 100% Gratis, Local-First, & PWA Standalone (Offline-Capable)

Selamat datang di repositori dokumentasi resmi **SiKomputer** (*Developer & Creator Productivity Workstation*). Platform ini dirancang dengan prinsip **Full Gratis (Rp 0 Selamanya)**, **100% Client-Side**, dan **Privat Tanpa Server Pihak Ketiga**.

---

## 📚 Indeks Berkas Dokumentasi

| No | Berkas | Deskripsi Utama | Target Pembaca |
|---|---|---|---|
| 1 | [**`arsitektur-teknologi-dan-struktur.md`**](./arsitektur-teknologi-dan-struktur.md) | **Arsitektur Teknologi & Struktur Folder**: Penjelasan mendalam tentang stack teknologi (React 19, TypeScript, Dexie.js, PWA Service Worker, SheetJS, PDF-lib), bagan struktur folder, dan panduan teknis pengembangan fitur baru. | Software Engineer, Lead Developer, RPA Dev |
| 2 | [**`user-guide.md`**](./user-guide.md) | **Panduan Pengguna Lengkap (User Manual)**: Cara menggunakan modul RPA Monitoring, Notes Vault, Konverter Spreadsheet, Image Studio, PDF Repair, Kalkulator Tanggal, serta cara memasang aplikasi PWA ke HP Android & iOS. | Pengguna Akhir, Support RPA, Pengembang |
| 3 | [**`estimasi-biaya.md`**](./estimasi-biaya.md) | **Estimasi Biaya Operasional (Rp 0 / Bebas Biaya)**: Rincian arsitektur tanpa biaya hosting, database lokal di IndexedDB pengguna, zero server maintenance, dan notifikasi peramban gratis. | Product Owner, Stakeholder |
| 4 | [**`kelebihan-dan-kekurangan.md`**](./kelebihan-dan-kekurangan.md) | **Analisis Kelebihan & Kekurangan**: Analisis privasi mutlak, kemampuan offline PWA, kecepatan komputasi client-side, serta strategi backup/restore JSON. | System Architect, Tech Lead |
| 5 | [**`ui-plan.md`**](./ui-plan.md) | **Perencanaan UI/UX & Design System**: Fondasi antarmuka Tailwind CSS v4, dark/light mode, token warna status RPA, dan komponen modal popover. | UI/UX Designer, Frontend Dev |
| 6 | [**`plan-pengerjaan-4-fase.md`**](./plan-pengerjaan-4-fase.md) | **Roadmap & Riwayat Rencana Kerja**: Tahapan evolusi modul dev utilities, RPA Monitoring, dan utility offline. | Project Manager, Tim Teknis |

---

## 🛠️ Ringkasan Stack Teknologi Inti

```
[ Frontend Framework ]     React 19 + TypeScript + Vite 8
[ Styling & Antarmuka ]   Tailwind CSS v4 + Lucide Icons + Font Inter & JetBrains Mono Lokal
[ Basis Data Lokal ]       Dexie.js v4 (IndexedDB) — Multi-version Schema 100% Privat
[ Offline & PWA ]          Service Worker (Cache-First / Stale-While-Revalidate) + Web App Manifest
[ Spreadsheet & Excel ]    SheetJS (XLSX) — In-memory processing & Hidden Column Reader
[ Pemrosesan PDF & Img ]   PDF-lib + PDF.js + Canvas API (Repair, Rebuild, Multi-page PDF)
[ Audio & Notifikasi ]     Web Audio API (Synthesizer Chime) + Unified In-App & OS Notification
```

---

## 📱 Kemampuan PWA & Offline di Smartphone

SiKomputer dikonfigurasi sebagai **Progressive Web App (PWA)** dengan **Service Worker Offline Cache**:
* **Pemasangan Mandiri:** Dapat dipasang permanen (*Add to Home Screen*) di Android (Chrome) dan iOS (Safari).
* **Bekerja Tanpa Laptop Menyala:** Setelah aset di-cache, aplikasi dapat dibuka dan dijalankan langsung dari layar utama HP secara penuh kapan pun tanpa koneksi jaringan.
* **Penyimpanan Privat:** Seluruh catatan kredensial (Notes Vault), riwayat tugas, dan pengaturan tersimpan di memori perangkat Anda.

---
*Dokumentasi ini menjadi pedoman resmi arsitektur dan pengembangan SiKomputer.*
