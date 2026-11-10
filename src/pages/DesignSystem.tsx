import { Compass, Palette } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Checkbox, Chip, Field, IconButton, Input, Kbd, Progress, ProgressRing, Select, Skeleton, Switch, Textarea, type Tone } from '@/components/ui/primitives'
import { Drawer, Modal, Segmented, Tabs, useToast } from '@/components/ui/overlays'
import { CodeBlock, EmptyState, ErrorState, HttpMethodBadge, PageHeader, PriorityBadge, ScoreRing, StatCard, StatusBadge } from '@/components/ui/blocks'
import { Plus, Trash2 } from 'lucide-react'

const swatches: [string, string, string][] = [
  ['bg', '--bg', 'Latar aplikasi'],
  ['surface', '--surface', 'Kartu & panel'],
  ['surface-2', '--surface-2', 'Hover / input'],
  ['border', '--border', 'Garis'],
  ['text', '--text', 'Teks utama'],
  ['muted', '--text-muted', 'Teks sekunder'],
  ['primary', '--primary', 'Aksi utama'],
  ['accent', '--accent', 'Highlight'],
  ['success', '--success', 'Berhasil'],
  ['warning', '--warning', 'Peringatan'],
  ['danger', '--danger', 'Error'],
  ['info', '--info', 'Informasi'],
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <Card className="p-5">{children}</Card>
    </section>
  )
}

export function DesignSystemPage() {
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [sw, setSw] = useState(true)
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [chk, setChk] = useState(true)
  const tones: Tone[] = ['neutral', 'primary', 'accent', 'success', 'warning', 'danger', 'info', 'pink']
  return (
    <div className="space-y-8">
      <PageHeader title="Design System" description="Katalog token dan komponen SiKomputer" icon={<Palette className="size-5" />} color="var(--accent)" actions={<Link to="/"><Button icon={<Compass className="size-4" />}>Ke aplikasi</Button></Link>} />

      <Section title="Warna">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {swatches.map(([n, v, d]) => (
            <div key={n} className="space-y-1.5">
              <div className="h-14 rounded-md border border-border" style={{ background: `var(${v})` }} />
              <p className="text-[13px] font-medium">{n}</p>
              <p className="font-mono text-[11px] text-muted">{v}</p>
              <p className="text-[11px] text-muted">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Warna modul</p>
        <div className="flex flex-wrap gap-2">
          {[['Dev Utilities', 'var(--mod-dev)'], ['Productivity', 'var(--mod-productivity)']].map(([n, c]) => (
            <span key={n} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[13px]"><span className="size-3 rounded-full" style={{ background: c }} />{n}</span>
          ))}
        </div>
      </Section>

      <Section title="Tipografi">
        <div className="space-y-2">
          <p className="text-[28px] font-semibold tracking-tight">Heading 1 — 28px</p>
          <p className="text-[22px] font-semibold">Heading 2 — 22px</p>
          <p className="text-lg font-semibold">Heading 3 — 18px</p>
          <p>Teks isi 14px — Inter, nyaman dibaca untuk antarmuka padat informasi.</p>
          <p className="text-[13px] text-muted">Teks sekunder 13px</p>
          <p className="font-mono text-[13px]">const kode = "JetBrains Mono 13px";</p>
          <p className="tnum text-3xl font-semibold">12.400</p>
        </div>
      </Section>

      <Section title="Tombol">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon={<Trash2 className="size-4" />}>Hapus</Button>
          <Button variant="primary" loading>Memuat</Button>
          <Button variant="primary" disabled>Nonaktif</Button>
          <Button size="sm">Kecil</Button>
          <Button size="lg" variant="primary">Besar</Button>
          <IconButton label="Tambah"><Plus className="size-4" /></IconButton>
        </div>
      </Section>

      <Section title="Badge & Chip">
        <div className="flex flex-wrap items-center gap-2">
          {tones.map((t) => <Badge key={t} tone={t}>{t}</Badge>)}
          <PriorityBadge level="tinggi" /><PriorityBadge level="sedang" /><PriorityBadge level="rendah" />
          <Chip>Chip</Chip><Chip active>Aktif</Chip>
          <Kbd>Ctrl K</Kbd>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <HttpMethodBadge key={m} method={m} />)}
          <StatusBadge code={200} text="OK" /><StatusBadge code={301} text="Moved" /><StatusBadge code={404} text="Not Found" /><StatusBadge code={500} text="Error" />
        </div>
      </Section>

      <Section title="Form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Input"><Input placeholder="Teks…" /></Field>
          <Field label="Input error" error="Format tidak valid"><Input error defaultValue="abc" /></Field>
          <Field label="Select"><Select><option>Pilihan 1</option><option>Pilihan 2</option></Select></Field>
          <Field label="Textarea mono"><Textarea mono defaultValue="{ }" /></Field>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-[13px]"><Switch checked={sw} onChange={setSw} />Switch</label>
            <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={chk} onChange={setChk} />Checkbox</label>
          </div>
        </div>
      </Section>

      <Section title="Navigasi & overlay">
        <div className="space-y-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'a', label: 'Tab A' }, { id: 'b', label: 'Tab B', count: 3 }]} />
          <Segmented value={seg} onChange={setSeg} options={[{ id: 'a', label: 'Satu' }, { id: 'b', label: 'Dua' }, { id: 'c', label: 'Tiga' }]} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setModal(true)}>Buka modal</Button>
            <Button onClick={() => setDrawer(true)}>Buka drawer / sheet</Button>
            <Button onClick={() => toast({ title: 'Berhasil', description: 'Contoh toast sukses' })}>Toast sukses</Button>
            <Button onClick={() => toast({ title: 'Gagal', description: 'Contoh toast error', tone: 'danger' })}>Toast error</Button>
          </div>
        </div>
      </Section>

      <Section title="Data & feedback">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Stat card" value="1.284" hint="+12% minggu ini" />
          <Card className="flex items-center justify-around p-4"><ProgressRing value={72} /><ScoreRing score={92} /><ScoreRing score={65} /><ScoreRing score={40} /></Card>
          <Card className="space-y-3 p-4"><Progress value={30} /><Progress value={60} tone="success" /><Progress value={85} tone="warning" /><Avatar name="Iwan Kurniawan" /></Card>
        </div>
        <div className="mt-4 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-16 w-full" /></div>
        <div className="mt-4"><CodeBlock label="json" code={'{\n  "komponen": "CodeBlock"\n}'} /></div>
      </Section>

      <Section title="State kosong & error">
        <div className="grid gap-4 md:grid-cols-2"><EmptyState title="Belum ada data" description="Mulai dengan menambahkan item pertama." action={<Button variant="primary">Tambah</Button>} /><ErrorState onRetry={() => toast({ title: 'Mencoba lagi…', tone: 'info' })} /></div>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Contoh modal" footer={<><Button variant="ghost" onClick={() => setModal(false)}>Batal</Button><Button variant="primary" onClick={() => setModal(false)}>Simpan</Button></>}>
        <p className="text-[13.5px] text-muted">Modal tampil di tengah pada desktop dan menjadi bottom sheet pada mobile.</p>
      </Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Contoh drawer"><p className="text-[13.5px] text-muted">Drawer muncul dari kanan di desktop dan dari bawah di mobile.</p></Drawer>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="bg-gradient-to-br from-primary to-accent bg-clip-text text-7xl font-bold text-transparent">404</p>
      <h1 className="mt-3 text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-1 max-w-sm text-[13px] text-muted">Alamat yang Anda tuju tidak ada atau sudah dipindahkan.</p>
      <Link to="/" className="mt-6"><Button variant="primary">Kembali ke Dashboard</Button></Link>
    </div>
  )
}

