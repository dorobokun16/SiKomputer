import {
  AlarmClock,
  Bell,
  Bug,
  CalendarClock,
  Check,
  Clock,
  Filter,
  GripVertical,
  Layers,
  ListChecks,
  Plus,
  Repeat,
  Smartphone,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  ProgressRing,
  Select,
  Switch,
} from '@/components/ui/primitives'
import { Modal, Segmented, useToast } from '@/components/ui/overlays'
import { PageHeader } from '@/components/ui/blocks'
import { cn } from '@/lib/cn'
import { db, type BacklogEntity, type ReminderEntity } from '@/db/dexie'
import { downloadIcs } from '@/lib/ics-generator'
import {
  hasNotificationPermission,
  pushNotification,
  requestNotificationPermission,
} from '@/services/notification.service'

const typeMeta = {
  epic: { icon: Layers, color: '#a855f7', label: 'Epic' },
  story: { icon: Zap, color: '#22c55e', label: 'Story' },
  bug: { icon: Bug, color: '#ef4444', label: 'Bug' },
} as const

const statusTone = {
  backlog: 'neutral',
  todo: 'info',
  doing: 'warning',
  done: 'success',
} as const

const INITIAL_BACKLOG: Omit<BacklogEntity, 'id'>[] = [
  { projectId: 'p1', type: 'epic', title: 'Modul Otentikasi Biometrik & WebAuthn', status: 'doing', sprint: 'Sprint 1', points: 13, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'story', title: 'Integrasi Dexie IndexedDB Backup JSON', status: 'done', sprint: 'Sprint 1', points: 5, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'bug', title: 'Perbaikan offset zona waktu UTC+7 pada kalender', status: 'done', sprint: 'Sprint 1', points: 3, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'story', title: 'NLP Parser untuk Quick Task Input', status: 'done', sprint: 'Sprint 1', points: 8, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'story', title: 'In-Memory SQL Spreadsheet Analyzer', status: 'doing', sprint: 'Sprint 1', points: 8, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'bug', title: 'Perbaikan responsivitas layout mobile portrait', status: 'todo', sprint: 'Sprint 1', points: 2, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'story', title: 'RFC 5545 iCalendar generator download', status: 'todo', sprint: 'Sprint 1', points: 3, createdAt: new Date().toISOString() },
  { projectId: 'p1', type: 'epic', title: 'Studio Konten YouTube Shorts Sync', status: 'backlog', sprint: 'Sprint 2', points: 13, createdAt: new Date().toISOString() },
]

export function BacklogPage() {
  const toast = useToast()
  const [items, setItems] = useState<BacklogEntity[]>([])
  const [sprintFilter, setSprintFilter] = useState('Sprint 1')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'epic' | 'story' | 'bug'>('story')
  const [newPoints, setNewPoints] = useState(3)
  const [newSprint, setNewSprint] = useState('Sprint 1')
  const [newStatus, setNewStatus] = useState<'backlog' | 'todo' | 'doing' | 'done'>('todo')

  const loadItems = async () => {
    try {
      let data = await db.backlog.toArray()
      if (data.length === 0 && !localStorage.getItem('sk-has-seeded')) {
        // Auto-seed
        for (const item of INITIAL_BACKLOG) {
          await db.backlog.add({
            id: crypto.randomUUID(),
            ...item,
          })
        }
        data = await db.backlog.toArray()
      }
      setItems(data)
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  // Filter items
  const filtered = sprintFilter === 'all' ? items : items.filter((i) => i.sprint === sprintFilter)

  // Calculations
  const sprintItems = items.filter((i) => i.sprint === 'Sprint 1')
  const totalPoints = sprintItems.reduce((acc, i) => acc + (i.points || 0), 0)
  const donePoints = sprintItems.filter((i) => i.status === 'done').reduce((acc, i) => acc + (i.points || 0), 0)
  const doingPoints = sprintItems.filter((i) => i.status === 'doing').reduce((acc, i) => acc + (i.points || 0), 0)
  const percentDone = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  // Burndown dynamic points
  const remainingPoints = totalPoints - donePoints
  const burndown = [
    { d: 'H1', ideal: totalPoints, real: totalPoints },
    { d: 'H2', ideal: Math.round(totalPoints * 0.85), real: Math.max(remainingPoints, Math.round(totalPoints * 0.9)) },
    { d: 'H3', ideal: Math.round(totalPoints * 0.7), real: Math.max(remainingPoints, Math.round(totalPoints * 0.78)) },
    { d: 'H4', ideal: Math.round(totalPoints * 0.55), real: Math.max(remainingPoints, Math.round(totalPoints * 0.65)) },
    { d: 'H5', ideal: Math.round(totalPoints * 0.4), real: Math.max(remainingPoints, Math.round(totalPoints * 0.52)) },
    { d: 'H6', ideal: Math.round(totalPoints * 0.2), real: remainingPoints + 3 },
    { d: 'H7', ideal: 0, real: remainingPoints },
  ]

  const handleCreateItem = async () => {
    if (!newTitle.trim()) {
      toast({ title: 'Judul tidak boleh kosong', tone: 'danger' })
      return
    }

    const newItem: BacklogEntity = {
      id: crypto.randomUUID(),
      projectId: 'p1',
      title: newTitle.trim(),
      type: newType,
      points: Number(newPoints),
      sprint: newSprint,
      status: newStatus,
      createdAt: new Date().toISOString(),
    }

    await db.backlog.add(newItem)
    setNewTitle('')
    setIsModalOpen(false)
    await loadItems()
    toast({ title: 'Item backlog berhasil ditambahkan', tone: 'success' })
  }

  const handleStatusCycle = async (item: BacklogEntity) => {
    const cycleMap: Record<string, 'backlog' | 'todo' | 'doing' | 'done'> = {
      backlog: 'todo',
      todo: 'doing',
      doing: 'done',
      done: 'backlog',
    }
    const nextStatus = cycleMap[item.status]
    await db.backlog.update(item.id, { status: nextStatus })
    await loadItems()
    toast({ title: `Status diubah ke ${nextStatus.toUpperCase()}`, tone: 'info' })
  }

  const handleDeleteItem = async (id: string) => {
    await db.backlog.delete(id)
    await loadItems()
    toast({ title: 'Item dihapus dari backlog', tone: 'info' })
  }

  return (
    <>
      <PageHeader
        title="Project Backlog"
        description="Kelola tiket Epic, User Story, dan Bug dengan estimasi poin Fibonacci & Burndown Chart"
        icon={<ListChecks className="size-5" />}
        color="var(--mod-productivity)"
        actions={
          <>
            <Link to="/productivity/tasks">
              <Button>Papan Kanban</Button>
            </Link>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setIsModalOpen(true)}>
              Item baru
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted" />
              <span className="text-xs font-medium text-muted">Filter Sprint:</span>
              <div className="flex gap-1.5">
                {['Sprint 1', 'Sprint 2', 'all'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSprintFilter(s)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      sprintFilter === s
                        ? 'bg-primary text-primary-fg font-semibold'
                        : 'bg-surface-2 text-muted hover:text-text'
                    )}
                  >
                    {s === 'all' ? 'Semua Sprint' : s}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-muted">
              {filtered.length} item ditemukan ({filtered.reduce((a, b) => a + (b.points || 0), 0)} story points)
            </span>
          </div>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[28px_90px_1fr_70px_110px_90px_40px] gap-3 border-b border-border bg-surface-2/50 px-4 py-2.5 text-xs font-medium text-muted md:grid">
              <span />
              <span>Tipe</span>
              <span>Judul</span>
              <span className="text-right">Poin</span>
              <span>Status</span>
              <span>Sprint</span>
              <span />
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                Belum ada tiket pada sprint ini. Klik tombol <b>"Item baru"</b> untuk menambahkan.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((b) => {
                  const m = typeMeta[b.type] || typeMeta.story
                  return (
                    <li
                      key={b.id}
                      className="grid grid-cols-[28px_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2/50 md:grid-cols-[28px_90px_1fr_70px_110px_90px_40px]"
                    >
                      <GripVertical className="size-4 cursor-grab text-muted/40" />
                      <span className="hidden items-center gap-1.5 text-xs font-medium md:flex" style={{ color: m.color }}>
                        <m.icon className="size-3.5" />
                        {m.label}
                      </span>
                      <div className="min-w-0">
                        <p className={cn('truncate font-medium text-[13.5px]', b.status === 'done' && 'line-through text-muted')}>
                          {b.title}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-muted md:hidden">
                          <span style={{ color: m.color }}>{m.label}</span> · {b.points} pt · {b.sprint}
                        </p>
                      </div>
                      <span className="tnum hidden text-right text-[13px] font-mono font-medium md:block">
                        {b.points} pt
                      </span>
                      <button
                        onClick={() => handleStatusCycle(b)}
                        title="Klik untuk ubah status"
                        className="text-left"
                      >
                        <Badge tone={statusTone[b.status]} className="cursor-pointer hover:opacity-80">
                          {b.status}
                        </Badge>
                      </button>
                      <span className="hidden text-[12px] text-muted md:block">{b.sprint}</span>
                      <button
                        onClick={() => handleDeleteItem(b.id)}
                        className="text-muted hover:text-danger hidden md:inline-flex p-1"
                        title="Hapus item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Sprint 1"
              subtitle="Target aktif minggu ini"
              action={<Badge tone={percentDone >= 80 ? 'success' : 'warning'}>Aktif</Badge>}
            />
            <div className="flex items-center gap-4 p-4">
              <ProgressRing value={percentDone} size={76} stroke={7} color="var(--mod-productivity)">
                {percentDone}%
              </ProgressRing>
              <div className="space-y-1 text-[13px]">
                <p>
                  <span className="tnum font-semibold text-text">{donePoints}</span> / {totalPoints} poin selesai
                </p>
                <p className="text-muted">
                  {sprintItems.length} item · {doingPoints} pt sedang berjalan
                </p>
                <p className={cn('text-xs font-medium', percentDone >= 60 ? 'text-success' : 'text-warning')}>
                  {percentDone >= 80
                    ? 'Sprint melaju sesuai jadwal!'
                    : percentDone >= 50
                    ? 'Progres sprint stabil'
                    : 'Perlu akselerasi pengerjaan'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Burndown Chart" subtitle="Ideal vs Realisasi Poin Tersisa" />
            <div className="h-44 p-3 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndown} margin={{ left: -26, right: 6, top: 4, bottom: 0 }}>
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    isAnimationActive={false}
                    name="Ideal (Target)"
                    dataKey="ideal"
                    stroke="var(--text-muted)"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <Area
                    isAnimationActive={false}
                    name="Realisasi (Sisa)"
                    dataKey="real"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 border-t border-border p-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full border border-dashed border-muted" /> Ideal (Target)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Realisasi Sisa
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Item Baru */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tambah Item Backlog"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateItem}>
              Simpan Item
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Tiket">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Implementasi ekspor data ke JSON / CSV"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipe">
              <Select value={newType} onChange={(e) => setNewType(e.target.value as any)}>
                <option value="story">Zap — User Story</option>
                <option value="epic">Layers — Epic</option>
                <option value="bug">Bug — Bug Fix</option>
              </Select>
            </Field>
            <Field label="Estimasi Poin (Fibonacci)">
              <Select value={newPoints} onChange={(e) => setNewPoints(Number(e.target.value))}>
                <option value={1}>1 Poin (Sangat Ringan)</option>
                <option value={2}>2 Poin (Ringan)</option>
                <option value={3}>3 Poin (Sedang)</option>
                <option value={5}>5 Poin (Kompleks)</option>
                <option value={8}>8 Poin (Besar)</option>
                <option value={13}>13 Poin (Epik)</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sprint">
              <Select value={newSprint} onChange={(e) => setNewSprint(e.target.value)}>
                <option value="Sprint 1">Sprint 1 (Aktif)</option>
                <option value="Sprint 2">Sprint 2</option>
                <option value="Product Backlog">Product Backlog</option>
              </Select>
            </Field>
            <Field label="Status Awal">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)}>
                <option value="todo">To Do</option>
                <option value="backlog">Backlog</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================= Reminder Page ================= */
const INITIAL_REMINDERS: Omit<ReminderEntity, 'id'>[] = [
  {
    title: 'Review PR #12 — modul login & Web Crypto',
    remindAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    repeat: 'Sekali',
    channels: ['Push', 'Audio'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Standup harian tim engineering',
    remindAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    repeat: 'Harian',
    channels: ['Push', 'Audio'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Sinkronisasi backup database lokal',
    remindAt: new Date(Date.now() + 1000 * 60 * 360).toISOString(),
    repeat: 'Harian',
    channels: ['Push'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Evaluasi sprint 1 & rilis v1.0',
    remindAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    repeat: 'Sekali',
    channels: ['Push', 'Kalender'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Perpanjangan SSL dev certificate',
    remindAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    repeat: 'Sekali',
    channels: ['Kalender'],
    active: false,
    createdAt: new Date().toISOString(),
  },
]

export function RemindersPage() {
  const toast = useToast()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const viewOptions: { id: 'list' | 'calendar'; label: string }[] = [
    { id: 'list', label: 'Daftar Pengingat' },
    { id: 'calendar', label: 'Tinjauan Kalender' },
  ]
  const [remindersList, setRemindersList] = useState<ReminderEntity[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [quiet, setQuiet] = useState(true)
  const [quietStart, setQuietStart] = useState('22:00')
  const [quietEnd, setQuietEnd] = useState('06:00')

  // Channel toggles
  const [channelPush, setChannelPush] = useState(true)
  const [channelIcs, setChannelIcs] = useState(true)
  const [channelAudio, setChannelAudio] = useState(true)

  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newTime, setNewTime] = useState('09:00')
  const [newRepeat, setNewRepeat] = useState('Sekali')
  const [sendPush, setSendPush] = useState(true)
  const [sendAudio, setSendAudio] = useState(true)

  const loadReminders = async () => {
    try {
      let data = await db.reminders.toArray()
      if (data.length === 0 && !localStorage.getItem('sk-has-seeded')) {
        for (const r of INITIAL_REMINDERS) {
          await db.reminders.add({
            id: crypto.randomUUID(),
            ...r,
          })
        }
        data = await db.reminders.toArray()
      }
      setRemindersList(data)
    } catch {
      //
    }
  }

  useEffect(() => {
    loadReminders()
  }, [])

  // Toggle active
  const handleToggle = async (id: string, active: boolean) => {
    await db.reminders.update(id, { active })
    await loadReminders()
  }

  // Snooze
  const handleSnooze = async (id: string, minutes: number) => {
    const r = remindersList.find((item) => item.id === id)
    if (!r) return

    const cur = new Date(r.remindAt).getTime()
    const next = new Date(cur + minutes * 60 * 1000).toISOString()
    await db.reminders.update(id, { remindAt: next, active: true })
    await loadReminders()
    toast({ title: `Reminder ditunda ${minutes < 60 ? `${minutes} menit` : minutes === 60 ? '1 jam' : 'sampai besok'}`, tone: 'info' })
  }

  // Selesai / Complete
  const handleComplete = async (id: string) => {
    await db.reminders.update(id, { active: false })
    await loadReminders()
    toast({ title: 'Reminder ditandai selesai', tone: 'success' })
  }

  // Hapus
  const handleDelete = async (id: string) => {
    await db.reminders.delete(id)
    await loadReminders()
    toast({ title: 'Reminder dihapus', tone: 'info' })
  }

  // Unduh seluruh pengingat sebagai berkas .ics
  const handleDownloadAllIcs = () => {
    const activeReminders = remindersList.filter((r) => r.active)
    if (activeReminders.length === 0) {
      toast({ title: 'Tidak ada reminder aktif untuk diekspor', tone: 'warning' })
      return
    }

    // Ambil reminder terdekat atau download per event
    for (const r of activeReminders.slice(0, 3)) {
      downloadIcs(
        {
          title: r.title,
          description: `Pengingat SiKomputer: ${r.title} (Pengulangan: ${r.repeat})`,
          startDate: new Date(r.remindAt),
          endDate: new Date(new Date(r.remindAt).getTime() + 30 * 60 * 1000),
        },
        `sikomputer-${r.title.slice(0, 20).replace(/\s+/g, '-')}`
      )
    }

    toast({
      title: 'Berkas kalender (.ics) berhasil diunduh',
      description: 'Buka atau impor ke Google Calendar, Outlook, atau Apple Calendar',
      tone: 'success',
    })
  }

  // Uji Suara & Notifikasi Browser & In-App
  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission()
    await pushNotification({
      title: 'Uji Pengingat & Notifikasi SiKomputer',
      body: 'Sistem pengingat audio chime, notifikasi desktop, dan in-app notification center berfungsi sempurna!',
      tone: 'success',
      playChime: true,
      showDesktop: perm === 'granted',
      link: '/reminders',
    })
    toast({
      title: 'Notifikasi & Pengingat Berhasil Diuji',
      description:
        perm === 'granted'
          ? 'Audio chime, desktop alert, dan notifikasi header berhasil dipicu.'
          : 'Audio chime dan notifikasi header aktif. Izin desktop belum diaktifkan.',
      tone: 'success',
    })
  }

  // Simpan reminder baru
  const handleSaveReminder = async () => {
    if (!newTitle.trim()) {
      toast({ title: 'Judul reminder tidak boleh kosong', tone: 'danger' })
      return
    }

    const remindDateTime = new Date(`${newDate}T${newTime}:00`).toISOString()
    const channels: string[] = []
    if (sendPush) channels.push('Push')
    if (sendAudio) channels.push('Audio')
    if (channelIcs) channels.push('Kalender')

    const newReminder: ReminderEntity = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      remindAt: remindDateTime,
      repeat: newRepeat,
      channels,
      active: true,
      createdAt: new Date().toISOString(),
    }

    await db.reminders.add(newReminder)
    setNewTitle('')
    setOpenModal(false)
    await loadReminders()
    toast({ title: 'Reminder baru berhasil dijadwalkan', tone: 'success' })
  }

  // Format date grouping
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const todayItems = remindersList.filter((r) => r.remindAt.slice(0, 10) === todayStr)
  const tomorrowItems = remindersList.filter((r) => r.remindAt.slice(0, 10) === tomorrowStr)
  const otherItems = remindersList.filter(
    (r) => r.remindAt.slice(0, 10) !== todayStr && r.remindAt.slice(0, 10) !== tomorrowStr
  )

  const groups = [
    { label: 'Hari ini', items: todayItems },
    { label: 'Besok', items: tomorrowItems },
    { label: 'Mendatang / Lainnya', items: otherItems },
  ]

  return (
    <>
      <PageHeader
        title="Reminder & Pengingat Lokal"
        description="Pengingat terjadwal via notifikasi desktop peramban, nada dering Web Audio, & berkas RFC 5545 .ics"
        icon={<CalendarClock className="size-5" />}
        color="var(--mod-productivity)"
        actions={
          <>
            <Button icon={<Volume2 className="size-4" />} onClick={handleTestNotification}>
              Uji Notifikasi & Suara
            </Button>
            <Button icon={<CalendarClock className="size-4" />} onClick={handleDownloadAllIcs}>
              Unduh .ics
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setOpenModal(true)}>
              Reminder baru
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Segmented<'list' | 'calendar'>
            value={view}
            onChange={(v) => setView(v)}
            options={viewOptions}
          />

          {view === 'list' ? (
            groups.map((group) => {
              if (group.items.length === 0) return null
              return (
                <Card key={group.label}>
                  <CardHeader
                    title={group.label}
                    subtitle={`${group.items.length} jadwal`}
                    action={
                      <span className="text-xs text-muted">
                        {group.items.filter((i) => i.active).length} aktif
                      </span>
                    }
                  />
                  <ul className="divide-y divide-border">
                    {group.items.map((r) => {
                      const d = new Date(r.remindAt)
                      const timeFormatted = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            'flex flex-wrap items-center gap-3 px-4 py-3 transition-opacity',
                            !r.active && 'opacity-50'
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-md',
                              r.active ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-muted'
                            )}
                          >
                            <AlarmClock className="size-5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className={cn('truncate font-medium text-[13.5px]', !r.active && 'line-through text-muted')}>
                              {r.title}
                            </p>
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                              <span className="tnum font-medium text-text flex items-center gap-1">
                                <Clock className="size-3" /> {timeFormatted} WIB
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Repeat className="size-3" /> {r.repeat}
                              </span>
                              {r.channels?.map((c) => (
                                <span key={c} className="inline-flex items-center gap-1 text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">
                                  {c === 'Push' ? <Smartphone className="size-3" /> : c === 'Audio' ? <Volume2 className="size-3" /> : <CalendarClock className="size-3" />}
                                  {c}
                                </span>
                              ))}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              className="w-28 text-xs"
                              defaultValue=""
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                if (val) handleSnooze(r.id, val)
                                e.target.value = ''
                              }}
                            >
                              <option value="">Tunda…</option>
                              <option value="10">10 menit</option>
                              <option value="60">1 jam</option>
                              <option value="1440">Besok</option>
                            </Select>

                            <Button
                              size="sm"
                              icon={<Check className="size-3.5" />}
                              onClick={() => handleComplete(r.id)}
                            >
                              Selesai
                            </Button>

                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 text-muted hover:text-danger rounded"
                              title="Hapus reminder"
                            >
                              <Trash2 className="size-4" />
                            </button>

                            <Switch
                              checked={r.active}
                              onChange={(v) => handleToggle(r.id, v)}
                              label="Status aktif"
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              )
            })
          ) : (
            <Card className="p-8 text-center text-[13px] text-muted">
              <CalendarClock className="mx-auto mb-2 size-8 text-muted/60" />
              <p className="font-medium text-text">Sinkronisasi Kalender SiKomputer</p>
              <p className="mt-1">
                Seluruh {remindersList.filter((r) => r.active).length} reminder aktif dapat diekspor langsung ke berkas <b>.ics standar</b> untuk kalender eksternal Anda.
              </p>
              <Button
                variant="primary"
                className="mt-4 mx-auto"
                icon={<CalendarClock className="size-4" />}
                onClick={handleDownloadAllIcs}
              >
                Unduh Semua Pengingat (.ics)
              </Button>
            </Card>
          )}
        </div>

        {/* Panel Preferensi & Pengaturan Notifikasi */}
        <Card className="h-fit">
          <CardHeader title="Preferensi Notifikasi" icon={<Bell className="size-4 text-muted" />} />
          <div className="space-y-4 p-4 text-[13px]">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Kanal Notifikasi</p>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone className="size-4 text-muted" /> Notifikasi Desktop (Web API)
              </span>
              <Switch checked={channelPush} onChange={setChannelPush} label="Desktop Web API" />
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Volume2 className="size-4 text-muted" /> Alarm Suara (Audio Chime)
              </span>
              <Switch checked={channelAudio} onChange={setChannelAudio} label="Alarm Suara" />
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted" /> Kalender RFC 5545 (.ics)
              </span>
              <Switch checked={channelIcs} onChange={setChannelIcs} label="Kalender .ics" />
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <span>Jam tenang (Hening)</span>
                <Switch checked={quiet} onChange={setQuiet} label="Jam tenang" />
              </div>
              {quiet && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-muted block mb-1">Mulai</span>
                    <Input value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block mb-1">Selesai</span>
                    <Input value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <Field label="Status Izin Peramban">
              <div className="rounded border border-border p-2.5 text-xs flex items-center justify-between">
                <span>Izin Notifikasi Desktop:</span>
                <Badge tone={hasNotificationPermission() ? 'success' : 'warning'}>
                  {hasNotificationPermission() ? 'Diizinkan' : 'Belum Diizinkan'}
                </Badge>
              </div>
            </Field>

            <Button size="sm" className="w-full" onClick={handleTestNotification}>
              Uji Notifikasi Sekarang
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal Reminder Baru */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Jadwalkan Reminder Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveReminder}>
              Simpan Reminder
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Pengingat">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Misal: Review PR merge API client"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </Field>
            <Field label="Jam (WIB)">
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </Field>
          </div>
          <Field label="Pengulangan">
            <Select value={newRepeat} onChange={(e) => setNewRepeat(e.target.value)}>
              <option value="Sekali">Sekali (Tidak Berulang)</option>
              <option value="Harian">Harian (Setiap Hari)</option>
              <option value="Mingguan">Mingguan</option>
              <option value="Bulanan">Bulanan</option>
            </Select>
          </Field>
          <div className="space-y-2">
            <span className="text-[13px] font-medium">Kirim Melalui</span>
            <div className="flex gap-4 text-[13px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={sendPush} onChange={setSendPush} /> Desktop Push
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={sendAudio} onChange={setSendAudio} /> Alarm Suara Chime
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
