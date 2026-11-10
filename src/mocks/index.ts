/* Data mock statis — hanya untuk prototipe tampilan. */

export const user = { name: 'Iwan Kurniawan', email: 'iwan@sikomputer.app', role: 'Admin' }

/* ---------- Notifikasi ---------- */
export const notifications = [
  { id: 1, title: 'Reminder: Rapat vendor API', body: 'Dimulai 15:00 hari ini', time: '5 mnt lalu', unread: true, tone: 'warning' as const },
  { id: 2, title: 'Ringkasan video selesai', body: '"Belajar RPA dari Nol" siap dibaca', time: '1 jam lalu', unread: true, tone: 'success' as const },
  { id: 3, title: '3 tugas jatuh tempo besok', body: 'Cek papan Kanban Anda', time: '3 jam lalu', unread: true, tone: 'info' as const },
  { id: 4, title: 'Pengujian endpoint berhasil', body: 'API Tester — Response 200 OK', time: 'Kemarin', unread: false, tone: 'success' as const },
  { id: 5, title: 'Login dari perangkat baru', body: 'Chrome di Windows · Jakarta', time: '2 hari lalu', unread: false, tone: 'danger' as const },
]

/* ---------- Tugas ---------- */
export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'tinggi' | 'sedang' | 'rendah'
export type Task = {
  id: string
  title: string
  status: TaskStatus
  priority: Priority
  project: string
  labels: string[]
  due?: string
  subDone: number
  subTotal: number
  assignee?: string
  description?: string
}

export const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#64748b' },
  { id: 'todo', label: 'To Do', color: '#3b82f6' },
  { id: 'doing', label: 'Doing', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#a855f7' },
  { id: 'done', label: 'Done', color: '#22c55e' },
]

export const projects = [
  { id: 'p1', name: 'SiKomputer', color: '#6366f1' },
  { id: 'p2', name: 'Bot RPA Vendor', color: '#10b981' },
  { id: 'p3', name: 'Channel YouTube', color: '#ec4899' },
]

export const tasks: Task[] = [
  { id: 't1', title: 'Desain skema database', status: 'backlog', priority: 'tinggi', project: 'SiKomputer', labels: ['BE'], due: '12 Nov', subDone: 0, subTotal: 4, description: 'Rancang ERD konseptual untuk modul tugas dan dev utilities.' },
  { id: 't2', title: 'Riset library Base64 & cURL', status: 'backlog', priority: 'rendah', project: 'SiKomputer', labels: ['Riset'], subDone: 0, subTotal: 0 },
  { id: 't3', title: 'Susun daftar snippet toolbox', status: 'backlog', priority: 'sedang', project: 'SiKomputer', labels: ['Tools'], due: '20 Nov', subDone: 0, subTotal: 2 },
  { id: 't4', title: 'Review PR #12 — modul login', status: 'todo', priority: 'tinggi', project: 'SiKomputer', labels: ['FE', 'Review'], due: 'Hari ini', subDone: 1, subTotal: 3, assignee: 'Iwan Kurniawan' },
  { id: 't5', title: 'Kirim MoM sprint 12', status: 'todo', priority: 'sedang', project: 'Bot RPA Vendor', labels: ['Dokumen'], due: 'Hari ini', subDone: 0, subTotal: 0, assignee: 'Iwan Kurniawan' },
  { id: 't6', title: 'Tulis script video "RPA untuk pemula"', status: 'todo', priority: 'sedang', project: 'Channel YouTube', labels: ['Konten'], due: '14 Nov', subDone: 2, subTotal: 6 },
  { id: 't7', title: 'Bangun halaman login', status: 'doing', priority: 'tinggi', project: 'SiKomputer', labels: ['FE'], due: 'Besok', subDone: 3, subTotal: 5, assignee: 'Iwan Kurniawan' },
  { id: 't8', title: 'Integrasi endpoint vendor A', status: 'doing', priority: 'sedang', project: 'Bot RPA Vendor', labels: ['BE', 'API'], due: '15 Nov', subDone: 1, subTotal: 4, assignee: 'Budi Santoso' },
  { id: 't9', title: 'Perbaiki selector bot invoice', status: 'review', priority: 'tinggi', project: 'Bot RPA Vendor', labels: ['Bug'], due: 'Terlambat', subDone: 2, subTotal: 2, assignee: 'Sari Dewi' },
  { id: 't10', title: 'Setup repository & CI', status: 'done', priority: 'sedang', project: 'SiKomputer', labels: ['DevOps'], subDone: 3, subTotal: 3 },
  { id: 't11', title: 'Rancang design system', status: 'done', priority: 'tinggi', project: 'SiKomputer', labels: ['Desain'], subDone: 5, subTotal: 5 },
  { id: 't12', title: 'Edit thumbnail episode 14', status: 'done', priority: 'rendah', project: 'Channel YouTube', labels: ['Konten'], subDone: 0, subTotal: 0 },
]

export const backlog = [
  { id: 'b1', type: 'epic', title: 'Modul Autentikasi', points: 21, status: 'doing', sprint: 'Sprint 1' },
  { id: 'b2', type: 'story', title: 'Login dengan email & password', points: 5, status: 'doing', sprint: 'Sprint 1' },
  { id: 'b3', type: 'story', title: 'Lupa & reset password', points: 3, status: 'todo', sprint: 'Sprint 1' },
  { id: 'b4', type: 'bug', title: 'Token refresh gagal di Safari', points: 2, status: 'todo', sprint: 'Sprint 1' },
  { id: 'b5', type: 'epic', title: 'Dev Utilities Suite', points: 34, status: 'done', sprint: 'Sprint 2' },
  { id: 'b6', type: 'story', title: 'Base64 Studio dua arah', points: 8, status: 'done', sprint: 'Sprint 2' },
  { id: 'b7', type: 'story', title: 'API Tester dengan cURL importer', points: 13, status: 'done', sprint: 'Sprint 2' },
  { id: 'b8', type: 'bug', title: 'Optimasi memori lokal IndexedDB', points: 5, status: 'done', sprint: 'Sprint 2' },
] as const

/* ---------- Reminder ---------- */
export const reminders = [
  { id: 'r1', title: 'Rapat vendor API', time: '15:00', day: 'Hari ini', repeat: 'Sekali', channels: ['Push', 'Email'] },
  { id: 'r2', title: 'Upload video mingguan', time: '17:30', day: 'Hari ini', repeat: 'Mingguan', channels: ['Push'] },
  { id: 'r3', title: 'Backup database lokal', time: '21:00', day: 'Hari ini', repeat: 'Harian', channels: ['Email'] },
  { id: 'r4', title: 'Kirim laporan sprint', time: '09:00', day: 'Besok', repeat: 'Dua mingguan', channels: ['Push', 'Email'] },
  { id: 'r5', title: 'Perpanjang domain', time: '10:00', day: '20 Nov', repeat: 'Tahunan', channels: ['Email'] },
]

/* ---------- API Tester ---------- */
export const apiCollections = [
  { id: 'c1', name: 'Vendor A', requests: [{ method: 'GET', name: 'List users' }, { method: 'POST', name: 'Login' }, { method: 'PUT', name: 'Update profil' }] },
  { id: 'c2', name: 'Internal Service', requests: [{ method: 'GET', name: 'Health check' }, { method: 'DELETE', name: 'Hapus cache' }] },
  { id: 'c3', name: 'Webhook Test', requests: [{ method: 'POST', name: 'Kirim event' }] },
]
export const apiHistory = [
  { method: 'POST', url: 'api.vendor-a.com/v1/login', status: 200, time: '10:42' },
  { method: 'GET', url: 'api.vendor-a.com/v1/users/1', status: 200, time: '10:40' },
  { method: 'GET', url: 'api.internal.id/orders/991', status: 404, time: '10:31' },
  { method: 'PATCH', url: 'api.vendor-a.com/v1/users/1', status: 500, time: '09:58' },
]
export const apiResponseSample = `{
  "id": 1,
  "name": "Iwan Kurniawan",
  "role": "admin",
  "email": "iwan@sikomputer.app",
  "active": true,
  "projects": [
    { "id": "p1", "name": "SiKomputer" },
    { "id": "p2", "name": "Bot RPA Vendor" }
  ],
  "created_at": "2026-01-12T08:30:00Z"
}`

/* ---------- Base64 ---------- */
export const base64Sample =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/* ---------- MoM ---------- */
export const momRaw = `budi: api vendor A telat 2 hari, belum ada kabar
iwan: oke kita eskalasi, minta ETA pasti
sari: bug selector invoice sudah fix, tinggal review
sepakat deploy hari jumat 14 nov
budi nanti eskalasi vendor, sari update dokumen
risiko: kalau vendor telat lagi deploy mundur`

export const momResult = {
  title: 'Sprint Planning 12',
  date: '9 November 2026',
  participants: ['Iwan', 'Budi', 'Sari'],
  agenda: ['Status integrasi vendor A', 'Perbaikan bug selector invoice', 'Jadwal deployment'],
  discussion: [
    { topic: 'Integrasi vendor A', summary: 'API vendor A terlambat dua hari tanpa kabar. Tim sepakat meminta ETA pasti.' },
    { topic: 'Bug selector invoice', summary: 'Perbaikan selesai dan menunggu review.' },
  ],
  decisions: ['Deployment dijadwalkan Jumat, 14 November 2026.', 'Eskalasi resmi ke vendor A.'],
  actions: [
    { task: 'Eskalasi keterlambatan ke vendor A', owner: 'Budi', due: '12 Nov', priority: 'tinggi' as const },
    { task: 'Update dokumentasi integrasi', owner: 'Sari', due: '13 Nov', priority: 'sedang' as const },
    { task: 'Review perbaikan selector invoice', owner: 'Iwan', due: '11 Nov', priority: 'tinggi' as const },
  ],
  risks: ['Jika vendor kembali terlambat, deployment mundur.'],
}
export const momHistory = ['Sprint Planning 12', 'Retrospective Sprint 11', 'Kickoff Bot Invoice', 'Standup 5 Nov']

/* ---------- YouTube ---------- */
export const video = {
  title: 'Belajar RPA dari Nol — Panduan Lengkap untuk Pemula',
  channel: 'Dev Santai',
  duration: '18:42',
  views: '124 rb tayangan',
  url: 'https://youtube.com/watch?v=abc123',
  tldr: 'Video ini memperkenalkan konsep RPA, perbedaan RPA dan automasi biasa, lalu membangun bot sederhana untuk memproses invoice dari awal sampai siap produksi.',
  points: [
    'RPA cocok untuk proses berulang berbasis aturan, bukan keputusan kompleks.',
    'Mayoritas bot gagal karena selector rapuh dan tidak ada penanganan error.',
    'Mulai dari satu proses kecil, ukur waktu yang dihemat, baru perluas.',
    'Gunakan logging dan retry sejak hari pertama.',
  ],
  chapters: [
    { t: '00:00', label: 'Pembukaan' },
    { t: '01:48', label: 'Apa itu RPA?' },
    { t: '05:12', label: 'RPA vs automasi biasa' },
    { t: '09:30', label: 'Membangun bot invoice' },
    { t: '12:34', label: 'Kenapa 90% automation gagal' },
    { t: '16:05', label: 'Tips menuju produksi' },
  ],
}

export const transcript = [
  ['00:00', 'Halo semua, selamat datang kembali di channel ini.'],
  ['00:14', 'Hari ini kita akan bahas RPA dari nol sampai bisa dipakai.'],
  ['00:41', 'Sebelum mulai, pastikan kamu sudah punya contoh proses yang ingin diotomasi.'],
  ['01:48', 'Jadi apa itu RPA? Robotic Process Automation adalah teknologi untuk meniru aksi manusia di komputer.'],
  ['03:05', 'Bayangkan kamu menyalin data dari email ke spreadsheet setiap hari.'],
  ['05:12', 'Bedanya dengan scripting biasa, RPA bekerja di level antarmuka.'],
  ['07:20', 'Tapi ini juga jadi kelemahannya, kalau tampilan berubah bot bisa rusak.'],
  ['09:30', 'Sekarang kita mulai membangun bot untuk memproses invoice.'],
  ['11:02', 'Langkah pertama, ambil file dari folder masuk.'],
  ['12:34', 'Nah ini bagian paling penting: kenapa sembilan puluh persen proyek automasi gagal.'],
  ['13:05', 'Jawabannya hampir selalu sama, tidak ada penanganan error dan selector yang rapuh.'],
  ['16:05', 'Terakhir, beberapa tips supaya bot kamu siap produksi.'],
  ['17:40', 'Kalau video ini membantu, jangan lupa subscribe dan sampai jumpa.'],
]

export const highlights = [
  { id: 'h1', start: '12:34', end: '13:20', category: 'Insight', score: 92, title: 'Kenapa 90% automation gagal', reason: 'Pembicara menjelaskan akar masalah dengan contoh nyata.', hook: 'Hampir semua orang salah soal ini…', pos: 67 },
  { id: 'h2', start: '05:12', end: '05:58', category: 'Tutorial', score: 84, title: 'RPA vs scripting biasa', reason: 'Perbandingan ringkas yang mudah dikutip.', hook: 'Ini beda RPA dan script biasa dalam 30 detik.', pos: 28 },
  { id: 'h3', start: '03:05', end: '03:30', category: 'Lucu', score: 77, title: 'Analogi menyalin data tiap hari', reason: 'Analogi relatable dengan nada humor.', hook: 'Kamu masih copy-paste manual tiap hari?', pos: 17 },
  { id: 'h4', start: '16:05', end: '16:50', category: 'Kutipan', score: 71, title: '"Mulai kecil, ukur, lalu perluas"', reason: 'Kalimat penutup yang kuat dan mudah dibagikan.', hook: 'Satu aturan sebelum kamu otomasi apa pun.', pos: 86 },
  { id: 'h5', start: '01:48', end: '02:20', category: 'Insight', score: 58, title: 'Definisi RPA yang mudah dipahami', reason: 'Definisi singkat, cocok sebagai pembuka klip.', hook: 'RPA itu sebenarnya sederhana.', pos: 10 },
]

/* ---------- Vault ---------- */
export const snippets = [
  { id: 's1', kind: 'code', title: 'Retry dengan exponential backoff', lang: 'python', tags: ['python', 'rpa'], code: `import time\n\ndef retry(fn, tries=5, base=0.5):\n    for i in range(tries):\n        try:\n            return fn()\n        except Exception:\n            time.sleep(base * 2 ** i)\n    raise RuntimeError("gagal setelah retry")` },
  { id: 's2', kind: 'prompt', title: 'Ringkas video jadi thread X', lang: 'text', tags: ['prompt', 'konten'], code: `Kamu adalah penulis konten. Ubah transkrip berikut menjadi thread X berisi 7 tweet.\nGunakan hook kuat di tweet pertama dan CTA di akhir.\n\nTranskrip:\n{{transkrip}}` },
  { id: 's3', kind: 'payload', title: 'Payload login vendor A', lang: 'json', tags: ['api', 'json'], code: `{\n  "username": "{{user}}",\n  "password": "{{pass}}",\n  "remember": true\n}` },
  { id: 's4', kind: 'code', title: 'XPath tombol Submit', lang: 'xml', tags: ['rpa', 'selector'], code: `//button[contains(@class,'btn-primary') and normalize-space()='Submit']` },
]

/* ---------- Dashboard ---------- */
export const weekly = [
  { name: 'Sen', value: 5 },
  { name: 'Sel', value: 8 },
  { name: 'Rab', value: 6 },
  { name: 'Kam', value: 9 },
  { name: 'Jum', value: 7 },
  { name: 'Sab', value: 3 },
  { name: 'Min', value: 4 },
]
export const activity = [
  { text: 'Konversi teks UTF-8 ke Base64 berhasil', time: '10 mnt lalu', tone: 'primary' as const },
  { text: 'Endpoint GET /api/v1/users diuji sukses (200 OK)', time: '1 jam lalu', tone: 'primary' as const },
  { text: 'Tugas "Setup repository & CI" selesai', time: '3 jam lalu', tone: 'success' as const },
  { text: 'Snippet JSON Formatter disimpan ke Vault', time: 'Kemarin', tone: 'warning' as const },
]

/* ---------- Sesi aktif (Pengaturan) ---------- */
export const sessions = [
  { device: 'Chrome · Windows 11', place: 'Jakarta, ID', last: 'Sekarang', current: true },
  { device: 'Safari · iPhone 15', place: 'Jakarta, ID', last: '2 jam lalu', current: false },
  { device: 'Firefox · Ubuntu', place: 'Bandung, ID', last: '3 hari lalu', current: false },
]

/* ---------- Toolbox ---------- */
export const toolboxTools = [
  { id: 'json', name: 'JSON Formatter', desc: 'Format, validasi, dan minify JSON' },
  { id: 'jwt', name: 'JWT Decoder', desc: 'Bedah header dan payload token' },
  { id: 'regex', name: 'Regex Tester', desc: 'Uji pola dengan highlight hasil' },
  { id: 'replace', name: 'Text Replace', desc: 'Cari & ganti teks, batch replace, regex, dan match count' },
  { id: 'sql', name: 'SQL Generator', desc: 'Auto-generate SELECT, INSERT, UPDATE, DELETE & DDL' },
  { id: 'cron', name: 'Cron Builder', desc: 'Susun dan jelaskan jadwal cron' },
  { id: 'uuid', name: 'UUID & Hash', desc: 'Buat UUID, MD5, SHA-256' },
  { id: 'epoch', name: 'Epoch Converter', desc: 'Timestamp ke tanggal, dan sebaliknya' },
  { id: 'diff', name: 'Text Diff', desc: 'Bandingkan dua teks berdampingan' },
] as const

