# Panduan Pengguna Lengkap (User Guide) — SiKomputer
## Versi Arsitektur: 100% Gratis, Local-First, & PWA Standalone (Offline-Capable)

Selamat datang di Panduan Pengguna resmi **SiKomputer** (*Developer & Creator Productivity Workstation*). Aplikasi ini dirancang untuk dapat Anda gunakan secara **penuh, mandiri, dan 100% gratis** tanpa perlu membayar biaya langganan, tanpa pendaftaran kartu kredit, dan tanpa ketergantungan pada server pihak ketiga.

---

## 1. Mengenal Keunggulan SiKomputer Versi Full Gratis

### 1.1 Konsep "Local-First & Kedaulatan Data"
Berbeda dengan aplikasi cloud yang menyimpan data Anda di server pihak ketiga:
- **Data Tersimpan di Perangkat Anda**: Tugas, backlog, password/token kredensial, dan catatan tersimpan aman di browser (*IndexedDB*) perangkat lokal Anda.
- **100% Dapat Digunakan Offline**: Seluruh modul dapat berjalan tanpa koneksi internet sama sekali.
- **Privasi Terjamin 100%**: Berkas spreadsheet, data monitoring RPA, dan kredensial sensitif tidak pernah dikirimkan atau bocor ke server mana pun.

---

## 2. Navigasi & Pintasan Antarmuka

### 2.1 Palet Perintah Cepat (Command Palette) — `Ctrl + K`
- Tekan **`Ctrl + K`** (atau **`Cmd + K`** pada Mac) di mana saja untuk memunculkan bilah pencarian pintar.
- Ketik nama modul (contoh: `rpa`, `notes`, `kanban`, `pdf`, `image`, `converter`, `kalkulator`) lalu tekan **Enter** untuk langsung melompat ke halaman tersebut dalam hitungan milidetik.

### 2.2 Beralih Mode Gelap & Terang (Dark / Light Theme)
- Klik ikon **Matahari / Bulan** di pojok kanan atas Header untuk beralih antara tampilan terang (*Light Mode*) dan mode gelap (*Dark Mode*).

### 2.3 Pencadangan & Pemulihan Data (Backup & Restore JSON)
- **Cara Membuat Cadangan (Backup)**: Buka menu *Settings* &rarr; tab *Data & Cadangan*, lalu pilih **Unduh Cadangan (.json)**. Berkas `sikomputer-backup.json` akan terunduh ke komputer Anda.
- **Cara Memulihkan Data (Restore)**: Jika Anda berganti komputer atau ingin sinkronisasi manual ke perangkat lain, klik **Pulihkan Data**, pilih berkas `.json` cadangan Anda, dan seluruh data akan kembali seketika.

---

## 3. Panduan Penggunaan Modul Aplikasi

### 3.1 Laporan Monitoring RPA (`/dev/rpa-monitoring`)
Modul khusus bagi RPA Support dan Developer untuk memindai berkas Excel monitoring harian dan menghasilkan format pesan laporan chat secara otomatis:
1. **Unggah Berkas Excel**:
   - Tarik dan lepaskan berkas Excel (*misal: `Monitoring.xlsx`*) ke area dropzone, atau gunakan tombol **"Uji dengan Monitoring.xlsx"** untuk mencoba langsung.
   - Sistem membaca sheet `'Robot List'` secara in-memory (tidak disimpan ke database / server).
2. **Dukungan Kolom Tersembunyi (*Hidden Columns*)**:
   - Sistem secara cerdas membaca seluruh 9 kolom tersembunyi pada sheet Excel, termasuk `Error Remarks Raw`, `Error Remarks`, `Job Completed Time`, dan `Last Queue Success`.
   - Sebuah banner hijau di bagian atas akan mengonfirmasi kolom-kolom tersembunyi yang berhasil diekstrak.
3. **Penyaringan Insiden Otomatis**:
   - **Robot Priority**: Robot dengan kolom `Priority: true` yang statusnya tidak sukses (*Failed, Running, Canceled*) atau melebihi batas waktu (*Threshold Status: NOK*).
   - **Robot Non-Priority**: Robot dengan kolom `Priority: false` yang mengalami kendala serupa.
4. **Format Chat Siap Salin**:
   - Format Priority diawali: `Update monitoring robot PA status :`
   - Format Non-Priority diawali: `Update Monitoring robot Non Prior PA Status :`
   - Setiap entri mencantumkan nomor robot (`ROB-XXX`), waktu relatif kejadian (`... ago`), pesan issue yang bersih, dan baris `> Action:` (dikosongkan secara default untuk diisi tindakan manual).
   - Klik tombol **"Salin Format Chat"** untuk langsung menyalin teks ke papan klip dan tempelkan ke grup chat tim.

---

### 3.2 Notes & Kredensial Vault (`/vault/notes`)
Tempat penyimpanan aman untuk catatan rahasia, password, endpoint API, token lingkungan (*ENV*), dan memo teknis:
1. **Kategori Entitas**:
   - **Password**: Menyimpan akun, username, dan kata sandi dengan fitur masker mata (*eye toggle*) untuk menyembunyikan/menampilkan teks.
   - **Endpoint**: Menyimpan URL API atau layanan microservice.
   - **Environment (ENV)**: Menyimpan variabel konfigurasi lingkungan (*KEY=VALUE*).
   - **Note / Memo**: Catatan umum bebas format.
2. **Keamanan & Salin Cepat**:
   - Data disimpan 100% lokal di IndexedDB perangkat Anda.
   - Klik ikon salin untuk menyalin password atau endpoint dalam 1 klik.
   - Sematkan catatan penting ke posisi paling atas dengan ikon pin bintang.

---

### 3.3 Konverter Spreadsheet CSV & XLSX (`/dev/spreadsheet`)
Alat konversi dua arah antara berkas CSV dan Excel (.xlsx) tanpa perlu membuka Microsoft Excel atau koneksi internet:
1. **Konversi CSV ke XLSX**: Unggah berkas `.csv`, pilih karakter pembatas (*koma, titik koma, atau tab*), lihat pratinjau tabel interaktif, dan klik **"Unduh Excel (.xlsx)"**.
2. **Konversi XLSX ke CSV**: Unggah berkas Excel, pilih pemisah yang diinginkan, dan klik **"Unduh CSV (.csv)"**.

---

### 3.4 Image Studio & Pembuat PDF (`/dev/images`)
Pengolah gambar lokal berbasis HTML5 Canvas & Web Workers:
1. **Kompresi Target Ukuran**: Tentukan batas ukuran maksimal target (misal: *500 KB* atau *1 MB*), sistem akan mengoptimalkan kualitas gambar secara otomatis.
2. **Ubah Resolusi (Scaling)**: Perbesar atau perkecil resolusi dengan skala presisi (*0.5x, 1x, 2x, 3x*) atau kustom lebar & tinggi piksel.
3. **Ekspor Format Gambar**: Konversi antar format WebP (efisien), PNG (transparan), atau JPEG.
4. **Ekspor ke PDF & Gabung Dokumen**:
   - Pilih format output **PDF Document (.pdf)** untuk mengubah gambar menjadi dokumen PDF.
   - Unggah beberapa gambar sekaligus dan gunakan tombol **"Gabung Menjadi 1 PDF Multi-Halaman"** untuk menyatukan banyak foto bukti/dokumen menjadi satu berkas PDF tunggal.

---

### 3.5 Perbaikan PDF & Cetak Ulang Dokumen (`/dev/pdf-repair`)
Modul pemulihan dokumen PDF yang bermasalah (sering gagal diunggah ke sistem e-meterai atau Privy):
1. **Penyebab Masalah**: Dokumen PDF dari scanner atau ekspor aplikasi pihak ketiga sering kali memiliki tabel xref rusak, objek tidak lengkap, atau metadata yang tidak standar.
2. **Metode Rekonstruksi (Cetak Ulang Microsoft Print to PDF Emulation)**:
   - Sistem mem-parsing kanvas vektor halaman menggunakan PDF.js dan menyusun ulang struktur pohon dokumen secara murni menggunakan PDF-lib.
   - Konten, teks, gambar, dan tata letak dokumen dipertahankan 100% tanpa mengubah isi.
3. **Unduh Berkas Normal**: Klik tombol **"Unduh PDF yang Telah Diperbaiki"** untuk mendapatkan berkas yang bersih dan kompatibel dengan sistem validasi digital.

---

### 3.6 Kalkulator Tanggal (`/calc/date`)
Kalkulator utilitas waktu yang disesuaikan dengan kalender hari kerja:
1. **Selisih Dua Tanggal**: Menghitung selisih total hari kalender serta jumlah hari kerja (*Senin–Jumat tanpa akhir pekan*).
2. **Tambah / Kurang Hari Kerja**: Memasukkan tanggal mulai dan jumlah hari kerja untuk menghitung target tenggat waktu (*deadline*) proyek secara otomatis.
3. **Kalkulator Usia Presisi**: Menghitung usia tepat hingga rincian tahun, bulan, dan hari.

---

### 3.7 Tugas & Kanban (`/productivity/tasks`)
Papan kerja visual untuk memantau alur penyelesaian tugas Anda:
- **5 Kolom Status**: `Backlog` &rarr; `To Do` &rarr; `Doing` &rarr; `Review` &rarr; `Done`.
- **Jadwal Tugas Otomatis (Recurring Automation)**:
  - Tersedia template otomatis harian seperti *"Isi Timesheet Harian RPA Developer"* (Senin–Jumat pukul 16:30) dan *"Daily Health Check Bot RPA"*.
  - Tugas akan otomatis muncul di kolom **To Do** setiap hari kerja lengkap dengan daftar sub-tugas checklist.

---

### 3.8 Pengingat & Pusat Notifikasi (`/productivity/reminders` & Header Bell)
1. **Pusat Notifikasi Interaktif (Header)**:
   - Ikon lonceng menampilkan jumlah badge notifikasi yang belum dibaca.
   - Klik notifikasi untuk menandai dibaca atau melompat langsung ke halaman terkait.
   - Tombol **"Tandai semua dibaca"** dan **"Uji Notifikasi Sekarang"** tersedia langsung di popover.
2. **Nada Dering Alarm (Audio Chime Synthesizer)**:
   - Membunyikan nada dual-tone synthesizer lokal saat reminder tiba tanpa perlu berkas audio luar.
3. **Notifikasi Desktop & Mobile**:
   - Berikan izin notifikasi di peramban saat diminta untuk menerima pop-up peringatan di layar komputer maupun notifikasi push HP.

---

## 4. Panduan Pemasangan Permanen PWA ke HP (Offline Standalone)

Anda dapat memasang aplikasi SiKomputer langsung ke ponsel pintar (*smartphone*) Anda dan membukanya mandiri tanpa perlu server laptop menyala:

### 4.1 Langkah Pemasangan di Android (Google Chrome / Edge)
1. Pastikan HP dan laptop terhubung ke jaringan WiFi yang sama.
2. Buka peramban Chrome di HP, lalu ketik alamat IP laptop Anda:
   ```
   https://<ip-laptop>:5173
   ```
   *(Contoh: `https://192.168.1.10:5173`)*
3. Jika muncul peringatan sertifikat mandiri, ketik **Lanjutan (Advanced)** &rarr; **Lanjutkan ke situs (Proceed)**.
4. Buka menu tiga titik **(⋮)** di pojok kanan atas Chrome HP.
5. Ketuk opsi **"Pasang Aplikasi"** atau **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
6. Ikon **SiKomputer** akan muncul di layar utama HP Anda.
7. **Bebas Offline:** Setelah terpasang, Anda bisa mematikan laptop Anda! Aplikasi di HP akan terus dapat dibuka dan digunakan 100% offline berkat Service Worker Offline Cache.

### 4.2 Langkah Pemasangan di iPhone / iPad (Apple Safari)
1. Buka tautan alamat IP laptop di peramban **Safari** iPhone.
2. Ketuk tombol **Bagikan (Share)** berupa ikon kotak dengan panah ke atas di bilah bawah peramban.
3. Gulir ke bawah dan pilih **"Add to Home Screen" (Tambah ke Layar Utama)**.
4. Beri nama aplikasi dan ketuk **Add**. Aplikasi akan berjalan layar penuh (*full screen*) seperti aplikasi native App Store.

---

## 5. Pertanyaan Umum & FAQ

### Q1: Apakah benar aplikasi ini 100% gratis selamanya?
> **Ya, betul**. Seluruh komputasi berjalan di sisi browser pengguna (*Client-Side*) dan data disimpan di IndexedDB perangkat Anda. Tidak ada biaya sewa server atau basis data cloud yang harus dibayar.

### Q2: Bagaimana jika saya ingin memindahkan data ke perangkat baru?
> Buka menu **Settings** &rarr; tab **Data & Cadangan**, klik tombol **Unduh Cadangan (.json)**. Buka SiKomputer di perangkat baru Anda, lalu klik **Pulihkan**. Seluruh data tugas, notes, dan pengaturan akan kembali utuh.

### Q3: Apakah berkas Excel RPA Monitoring saya tersimpan di komputer lain?
> **Sama sekali tidak**. Berkas Excel hanya dibaca sementara di memori RAM browser Anda untuk menghasilkan teks laporan, lalu dilepaskan dari memori tanpa disimpan ke disk atau server.
