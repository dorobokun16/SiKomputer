import {
  Binary,
  Bot,
  Braces,
  CalendarClock,
  CalendarDays,
  FileSpreadsheet,
  Images,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Lock,
  Palette,
  Printer,
  Send,
  Settings,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  path: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  emptyTitle: string
  emptyDesc: string
  badge?: number
}
export type NavSection = { title?: string; items: NavItem[] }

const dev = 'var(--mod-dev)'
const prod = 'var(--mod-productivity)'

export const navSections: NavSection[] = [
  {
    items: [
      { path: '/', label: 'Dashboard', description: 'Ringkasan aktivitas hari ini', icon: LayoutDashboard, color: 'var(--primary)', emptyTitle: 'Belum ada aktivitas', emptyDesc: 'Mulai gunakan tool untuk melihat ringkasan di sini.' },
    ],
  },
  {
    title: 'Dev Utilities',
    items: [
      { path: '/dev/base64', label: 'Base64 Studio', description: 'Konversi teks dan berkas dua arah dengan Base64', icon: Binary, color: dev, emptyTitle: 'Belum ada input', emptyDesc: 'Ketik teks, tarik file, atau tempel string Base64.' },
      { path: '/dev/pdf-repair', label: 'PDF Repair', description: 'Cetak ulang PDF untuk memperbaiki file rusak', icon: Printer, color: dev, emptyTitle: 'Belum ada PDF', emptyDesc: 'Pilih PDF yang gagal diupload untuk dicetak ulang.' },
      { path: '/dev/image-studio', label: 'Image Studio', description: 'Kompres, ubah resolusi, dan edit gambar', icon: Images, color: dev, emptyTitle: 'Belum ada gambar', emptyDesc: 'Tarik satu atau beberapa gambar untuk diolah.' },
      { path: '/dev/spreadsheet', label: 'Konverter CSV & XLSX', description: 'Konversi dua arah CSV ke Excel dan sebaliknya', icon: FileSpreadsheet, color: dev, emptyTitle: 'Belum ada berkas', emptyDesc: 'Pilih CSV atau Excel untuk dikonversi.' },
      { path: '/dev/rpa-monitoring', label: 'Monitoring RPA', description: 'Ekstrak status insiden robot dari Excel Monitoring', icon: Bot, color: dev, emptyTitle: 'Belum ada data', emptyDesc: 'Unggah berkas Monitoring.xlsx untuk mengekstrak laporan.' },
      { path: '/dev/api-tester', label: 'API Tester', description: 'Uji endpoint HTTP dengan cepat', icon: Send, color: dev, emptyTitle: 'Belum ada request', emptyDesc: 'Buat request pertama Anda atau impor dari cURL.' },
    ],
  },
  {
    title: 'Productivity',
    items: [
      { path: '/productivity/tasks', label: 'Tugas & Kanban', description: 'Kelola to-do dan papan kerja', icon: KanbanSquare, color: prod, emptyTitle: 'Belum ada tugas', emptyDesc: 'Tambahkan tugas pertama untuk memulai.' },
      { path: '/productivity/backlog', label: 'Project Backlog', description: 'Urutkan epic, story, dan bug', icon: ListChecks, color: prod, emptyTitle: 'Backlog kosong', emptyDesc: 'Buat epic atau story baru.' },
      { path: '/productivity/reminders', label: 'Reminder', description: 'Pengingat dan notifikasi terjadwal', icon: CalendarClock, color: prod, emptyTitle: 'Belum ada reminder', emptyDesc: 'Atur pengingat agar tidak ada yang terlewat.' },
      { path: '/productivity/notes', label: 'Catatan & Kredensial', description: 'Simpan password, endpoint, dan catatan rahasia', icon: Lock, color: prod, emptyTitle: 'Belum ada catatan', emptyDesc: 'Simpan kredensial atau catatan pertama Anda.' },
      { path: '/productivity/date-calc', label: 'Kalkulator Tanggal', description: 'Selisih hari, hari kerja, deadline proyek, dan usia', icon: CalendarDays, color: prod, emptyTitle: 'Kalkulator Tanggal', emptyDesc: 'Pilih mode perhitungan tanggal.' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { path: '/tools/toolbox', label: 'Dev Toolbox', description: 'JSON, JWT, Regex, Cron, dan lainnya', icon: Wrench, color: dev, emptyTitle: 'Tidak ada tool', emptyDesc: 'Pilih salah satu tool dari daftar.' },
      { path: '/tools/vault', label: 'Snippet & Prompt Vault', description: 'Simpan snippet, payload, dan prompt', icon: Braces, color: dev, emptyTitle: 'Vault kosong', emptyDesc: 'Simpan snippet atau prompt pertama Anda.' },
    ],
  },
]

export const allNav: NavItem[] = navSections.flatMap((s) => s.items)

export const extraNav: NavItem[] = [
  { path: '/settings', label: 'Pengaturan', description: 'Profil, keamanan, tampilan, dan AI', icon: Settings, color: 'var(--text-muted)', emptyTitle: '', emptyDesc: '' },
  { path: '/design-system', label: 'Design System', description: 'Katalog komponen dan token', icon: Palette, color: 'var(--accent)', emptyTitle: '', emptyDesc: '' },
]

export function findNav(pathname: string): NavItem | undefined {
  return [...allNav, ...extraNav].find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path)))
}
