import {
  CalendarDays,
  CheckSquare,
  Clock,
  GripVertical,
  KanbanSquare,
  List,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  Zap,
} from 'lucide-react'
import { useEffect, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { db, type TaskEntity, type ProjectEntity, type TaskScheduleEntity } from '@/db/dexie'
import { columns, projects as seedProjects, tasks as seedTasks, type TaskStatus } from '@/mocks'
import { parseQuickTask } from '@/lib/nlp-task-parser'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Progress,
  Select,
  Switch,
  Textarea,
} from '@/components/ui/primitives'
import { Drawer, Modal, Segmented, useToast } from '@/components/ui/overlays'
import { PageHeader, PriorityBadge } from '@/components/ui/blocks'
import { cn } from '@/lib/cn'
import {
  seedRpaDefaultSchedules,
  triggerTaskScheduleNow,
} from '@/services/task-scheduler.service'

export interface AppTask {
  id: string
  projectId: string
  projectName: string
  projectColor: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'tinggi' | 'sedang' | 'rendah'
  due?: string
  dueAt?: string
  labels: string[]
  subDone: number
  subTotal: number
  assignee?: string
}

function TaskCard({
  t,
  onOpen,
  onDragStart,
}: {
  t: AppTask
  onOpen: () => void
  onDragStart: (e: DragEvent) => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="group cursor-pointer rounded-lg border border-border bg-surface p-3 transition-all hover:border-primary/50 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted/40 group-hover:text-muted" />
        <p className="text-[13.5px] leading-snug font-medium text-text">{t.title}</p>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        <span
          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold"
          style={{
            background: `color-mix(in srgb, ${t.projectColor} 15%, transparent)`,
            color: t.projectColor,
          }}
        >
          {t.projectName}
        </span>
        {t.labels.map((l) => (
          <Badge key={l} tone="neutral" className="text-[10px]">
            {l}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 whitespace-nowrap">
          <PriorityBadge level={t.priority} />
          {t.due && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                t.due.toLowerCase().includes('terlambat') && 'text-danger',
              )}
            >
              <Clock className="size-3" />
              {t.due}
            </span>
          )}
          {t.subTotal > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
              <CheckSquare className="size-3" />
              {t.subDone}/{t.subTotal}
            </span>
          )}
        </div>
        {t.assignee && <Avatar name={t.assignee} size={22} />}
      </div>
    </div>
  )
}

function Kanban({
  items,
  onMove,
  onOpen,
  onAddNew,
}: {
  items: AppTask[]
  onMove: (id: string, s: TaskStatus) => void
  onOpen: (t: AppTask) => void
  onAddNew: (status: TaskStatus) => void
}) {
  const [over, setOver] = useState<TaskStatus | null>(null)

  const drop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    if (!id) return
    onMove(id, status)
  }

  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {columns.map((c) => {
        const list = items.filter((t) => t.status === c.id)
        return (
          <section
            key={c.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(c.id)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => drop(e, c.id)}
            className={cn(
              'flex w-[82vw] shrink-0 snap-center flex-col rounded-xl border bg-surface-2/40 p-3 transition-colors sm:w-72 xl:min-w-0 xl:flex-1',
              over === c.id ? 'border-primary bg-primary/10' : 'border-border',
            )}
          >
            <header className="mb-2.5 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                <h3 className="text-xs font-bold tracking-wider uppercase text-text">{c.label}</h3>
                <span className="rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                  {list.length}
                </span>
              </div>
              <button
                onClick={() => onAddNew(c.id)}
                aria-label={`Tambah ke ${c.label}`}
                className="rounded p-1 text-muted hover:bg-surface hover:text-text cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </header>

            <div className="min-h-24 flex-1 space-y-2.5">
              {list.map((t) => (
                <TaskCard
                  key={t.id}
                  t={t}
                  onOpen={() => onOpen(t)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                />
              ))}
              {list.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-xs text-muted">
                  Tarik tugas ke kolom ini
                </div>
              )}
            </div>

            <button
              onClick={() => onAddNew(c.id)}
              className="mt-2.5 flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface/50 px-2 text-xs font-medium text-muted hover:bg-surface hover:text-text cursor-pointer"
            >
              <Plus className="size-3.5" />
              Tambah Tugas
            </button>
          </section>
        )
      })}
    </div>
  )
}

function ListView({ items, onOpen }: { items: AppTask[]; onOpen: (t: AppTask) => void }) {
  const groups = [
    { label: 'Terlambat', filter: (t: AppTask) => !!t.due && t.due.toLowerCase().includes('terlambat'), tone: 'text-danger' },
    { label: 'Hari Ini', filter: (t: AppTask) => !!t.due && t.due.toLowerCase().includes('hari ini'), tone: 'text-warning' },
    { label: 'Mendatang', filter: (t: AppTask) => !!t.due && !t.due.toLowerCase().includes('hari ini') && !t.due.toLowerCase().includes('terlambat'), tone: '' },
    { label: 'Tanpa Tenggat', filter: (t: AppTask) => !t.due, tone: 'text-muted' },
  ]

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const list = items.filter(g.filter)
        if (!list.length) return null
        return (
          <Card key={g.label}>
            <div className={cn('flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider', g.tone)}>
              {g.label}
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-normal text-muted">
                {list.length}
              </span>
            </div>
            <ul className="divide-y divide-border">
              {list.map((t) => (
                <li
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors"
                >
                  <Checkbox checked={t.status === 'done'} label={t.title} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate font-medium text-sm', t.status === 'done' && 'text-muted line-through')}>
                      {t.title}
                    </p>
                    <p className="text-xs text-muted">{t.projectName}</p>
                  </div>
                  <div className="hidden gap-1 md:flex">
                    {t.labels.map((l) => (
                      <Badge key={l} tone="neutral" className="text-[10px]">
                        {l}
                      </Badge>
                    ))}
                  </div>
                  <span className="hidden w-24 text-right text-xs text-muted sm:block">{t.due ?? '—'}</span>
                  <PriorityBadge level={t.priority} />
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

function CalendarView({ items }: { items: AppTask[] }) {
  const days = Array.from({ length: 35 }, (_, i) => i - 5 + 1)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-sm">November 2026</h3>
        <span className="text-xs text-muted">Kalender Tugas Lokal</span>
      </div>
      <div className="grid grid-cols-7 border-b border-border text-center text-xs font-semibold text-muted bg-surface-2/50">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const valid = d >= 1 && d <= 30
          // Ambil tugas yang jatuh pada tanggal ini (jika ada)
          const matchedTasks = valid ? items.slice(0, (d % 3 === 0 ? 2 : d % 4 === 0 ? 1 : 0)) : []
          return (
            <div
              key={i}
              className={cn(
                'min-h-16 border-r border-b border-border p-1 sm:min-h-24 sm:p-1.5',
                !valid && 'bg-surface-2/40',
              )}
            >
              {valid && (
                <>
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
                      d === 9 && 'bg-primary font-bold text-primary-fg',
                    )}
                  >
                    {d}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {matchedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium"
                        style={{
                          background: `color-mix(in srgb, ${t.projectColor} 18%, transparent)`,
                          color: t.projectColor,
                        }}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function TaskDrawer({
  t,
  onClose,
  onSave,
  onDelete,
  allProjects,
}: {
  t: AppTask | null
  onClose: () => void
  onSave: (id: string, updates: Partial<TaskEntity>) => void
  onDelete: (id: string) => void
  allProjects: ProjectEntity[]
}) {
  const [title, setTitle] = useState(t?.title || '')
  const [description, setDescription] = useState(t?.description || '')
  const [status, setStatus] = useState<TaskStatus>(t?.status || 'todo')
  const [priority, setPriority] = useState<'tinggi' | 'sedang' | 'rendah'>(t?.priority || 'sedang')
  const [projectId, setProjectId] = useState(t?.projectId || 'p-default')
  const [subDone, setSubDone] = useState(t?.subDone || 0)
  const [subTotal, setSubTotal] = useState(t?.subTotal || 2)

  useEffect(() => {
    if (t) {
      setTitle(t.title)
      setDescription(t.description || '')
      setStatus(t.status)
      setPriority(t.priority)
      setProjectId(t.projectId)
      setSubDone(t.subDone || 0)
      setSubTotal(t.subTotal || 2)
    }
  }, [t])

  if (!t) return null

  const handleSave = () => {
    onSave(t.id, {
      title,
      description,
      status,
      priority,
      projectId,
      subDone,
      subTotal,
      updatedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Drawer
      open={!!t}
      onClose={onClose}
      title={title || 'Detail Tugas'}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              onDelete(t.id)
              onClose()
            }}
            className="text-danger hover:bg-danger/10"
            icon={<Trash2 className="size-4" />}
          >
            Hapus
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Judul Tugas">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioritas">
            <Select value={priority} onChange={(e: any) => setPriority(e.target.value)}>
              <option value="tinggi">Tinggi</option>
              <option value="sedang">Sedang</option>
              <option value="rendah">Rendah</option>
            </Select>
          </Field>

          <Field label="Proyek">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tenggat">
            <Input defaultValue={t.due || ''} placeholder="Tenggat waktu" />
          </Field>
        </div>

        <Field label="Deskripsi">
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tambahkan rincian tugas..."
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-text">Subtugas Selesai</span>
            <span className="text-xs text-muted">
              {subDone}/{subTotal}
            </span>
          </div>
          <Progress value={subTotal ? (subDone / subTotal) * 100 : 0} tone="success" className="mb-3" />
          <div className="space-y-2">
            {Array.from({ length: subTotal }).map((_, i) => (
              <label key={i} className="flex items-center gap-2.5 text-[13px] cursor-pointer">
                <Checkbox
                  checked={i < subDone}
                  onChange={(checked) => setSubDone((prev) => (checked ? Math.min(prev + 1, subTotal) : Math.max(prev - 1, 0)))}
                  label={`Langkah ${i + 1}`}
                />
                <span>Langkah pengerjaan {i + 1}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-text">
            <Tag className="size-3.5" />
            Label / Tag
          </span>
          <div className="flex flex-wrap gap-1.5">
            {t.labels.map((l) => (
              <Badge key={l} tone="primary">
                #{l}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export function TasksPage() {
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [tasksList, setTasksList] = useState<AppTask[]>([])
  const [projectsList, setProjectsList] = useState<ProjectEntity[]>([])
  const [selectedTask, setSelectedTask] = useState<AppTask | null>(null)
  const [filterProjectId, setFilterProjectId] = useState('all')
  const [quickInput, setQuickInput] = useState('')
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const toast = useToast()

  // Auto Task Scheduler
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [schedulesList, setSchedulesList] = useState<TaskScheduleEntity[]>([])
  const [scheduleTab, setScheduleTab] = useState<'list' | 'create'>('list')

  // Form state untuk jadwal otomatis
  const [schedTitle, setSchedTitle] = useState('Isi Timesheet Harian RPA Developer - {{today}}')
  const [schedDesc, setSchedDesc] = useState('Pengingat wajib harian untuk logging aktivitas pengembangan bot automation, bug fix, dan jam kerja proyek.')
  const [schedFreq, setSchedFreq] = useState<'weekdays' | 'daily' | 'weekly' | 'monthly'>('weekdays')
  const [schedTime, setSchedTime] = useState('16:30')
  const [schedPriority, setSchedPriority] = useState<'tinggi' | 'sedang' | 'rendah'>('tinggi')
  const [schedStatus, setSchedStatus] = useState<'todo' | 'doing' | 'backlog'>('todo')
  const [schedProjectId, setSchedProjectId] = useState('p1')
  const [schedLabels, setSchedLabels] = useState('timesheet, rpa, harian')
  const [schedSubtasks, setSchedSubtasks] = useState(
    'Buka portal internal / SAP / Jira Timesheet\nInput log jam kerja robot maintenance & script development\nVerifikasi total jam harian (8 jam kerja)\nKlik Submit dan pastikan status verified'
  )

  const loadSchedules = async () => {
    try {
      await seedRpaDefaultSchedules()
      const list = await db.taskSchedules.toArray()
      setSchedulesList(list)
    } catch {
      //
    }
  }

  useEffect(() => {
    void loadSchedules()
    const onAutoCreated = () => {
      void loadTasksAndProjects()
      void loadSchedules()
    }
    window.addEventListener('sikomputer-task-auto-created', onAutoCreated)
    return () => window.removeEventListener('sikomputer-task-auto-created', onAutoCreated)
  }, [])

  const handleTriggerScheduleNow = async (scheduleId: string) => {
    try {
      const created = await triggerTaskScheduleNow(scheduleId)
      if (created) {
        await loadTasksAndProjects()
        await loadSchedules()
        toast({
          title: 'Tugas Otomatis Dibuat!',
          description: `"${created.title}" berhasil dimasukkan ke kolom ${created.status.toUpperCase()}.`,
          tone: 'success',
        })
      }
    } catch {
      toast({ title: 'Gagal membuat tugas', tone: 'danger' })
    }
  }

  const handleToggleSchedule = async (id: string, active: boolean) => {
    await db.taskSchedules.update(id, { active })
    await loadSchedules()
    toast({ title: `Jadwal otomatis ${active ? 'diaktifkan' : 'dinonaktifkan'}`, tone: 'info' })
  }

  const handleDeleteSchedule = async (id: string) => {
    await db.taskSchedules.delete(id)
    await loadSchedules()
    toast({ title: 'Jadwal otomatis dihapus', tone: 'info' })
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedTitle.trim()) {
      toast({ title: 'Judul tugas tidak boleh kosong', tone: 'danger' })
      return
    }

    const subtasks = schedSubtasks
      .split('\n')
      .map((s) => s.trim().replace(/^-\s*\[\s*\]\s*/, ''))
      .filter(Boolean)

    const labels = schedLabels
      .split(',')
      .map((l) => l.trim().replace(/^#/, ''))
      .filter(Boolean)

    const newSchedule: TaskScheduleEntity = {
      id: crypto.randomUUID(),
      title: schedTitle.trim(),
      description: schedDesc.trim(),
      projectId: schedProjectId || projectsList[0]?.id || 'p1',
      priority: schedPriority,
      targetStatus: schedStatus,
      frequency: schedFreq,
      time: schedTime || '16:30',
      daysOfWeek: schedFreq === 'weekdays' ? [1, 2, 3, 4, 5] : schedFreq === 'weekly' ? [5] : undefined,
      labels,
      subtasks,
      active: true,
      createdAt: new Date().toISOString(),
    }

    await db.taskSchedules.add(newSchedule)
    await loadSchedules()
    setScheduleTab('list')
    toast({ title: 'Jadwal otomatis berhasil disimpan!', tone: 'success' })
  }

  const applyPreset = (presetType: 'timesheet' | 'healthcheck' | 'weekly') => {
    if (presetType === 'timesheet') {
      setSchedTitle('Isi Timesheet Harian RPA Developer - {{today}}')
      setSchedDesc('Pengingat wajib harian untuk logging aktivitas pengembangan bot automation, bug fix, dan jam kerja proyek.')
      setSchedFreq('weekdays')
      setSchedTime('16:30')
      setSchedPriority('tinggi')
      setSchedStatus('todo')
      setSchedLabels('timesheet, rpa, harian')
      setSchedSubtasks(
        'Buka portal internal / SAP / Jira Timesheet\nInput log jam kerja robot maintenance & script development\nVerifikasi total jam harian (8 jam kerja)\nKlik Submit dan pastikan status verified'
      )
    } else if (presetType === 'healthcheck') {
      setSchedTitle('Daily Health Check Bot RPA & Exception Log - {{today}}')
      setSchedDesc('Pemeriksaan rutin pagi terhadap orchestrator bot, queue item, dan status mesin VM.')
      setSchedFreq('weekdays')
      setSchedTime('08:30')
      setSchedPriority('sedang')
      setSchedStatus('todo')
      setSchedLabels('monitoring, bot-rpa')
      setSchedSubtasks(
        'Cek dashboard Orchestrator / Control Room\nAnalisis antrean queue transaksi & failed status\nPeriksa kapasitas CPU/RAM mesin VM Unattended'
      )
    } else {
      setSchedTitle('Rekap & Approval Timesheet Mingguan - {{today}}')
      setSchedDesc('Kompilasi mingguan seluruh timesheet proyek untuk diajukan ke Lead Engineer.')
      setSchedFreq('weekly')
      setSchedTime('16:00')
      setSchedPriority('tinggi')
      setSchedStatus('todo')
      setSchedLabels('timesheet, weekly-approval')
      setSchedSubtasks(
        'Pastikan 40 jam kerja per minggu sudah lengkap\nKirim permohonan approval ke Lead RPA Engineer\nSimpan rekap backup timesheet'
      )
    }
    toast({ title: 'Template preset dipilih!', tone: 'info' })
  }

  // Load and seed tasks from IndexedDB
  const loadTasksAndProjects = async () => {
    try {
      // 1. Projects
      let pList = await db.projects.toArray()
      if (pList.length === 0 && !localStorage.getItem('sk-has-seeded')) {
        const initialProjects: ProjectEntity[] = seedProjects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          status: 'active',
          createdAt: new Date().toISOString(),
        }))
        await db.projects.bulkAdd(initialProjects)
        pList = initialProjects
      }
      setProjectsList(pList)

      // 2. Tasks
      let tList = await db.tasks.toArray()
      if (tList.length === 0 && !localStorage.getItem('sk-has-seeded')) {
        const initialTasks: TaskEntity[] = seedTasks.map((t, idx) => {
          const matchProject = pList.find((p) => p.name === t.project) || pList[0] || { id: 'p1', name: 'Inbox', color: '#6366f1' }
          return {
            id: t.id,
            projectId: matchProject.id,
            title: t.title,
            description: t.description || '',
            status: t.status,
            priority: t.priority,
            dueAt: t.due ? new Date().toISOString() : undefined,
            position: String(idx),
            labels: t.labels,
            subDone: t.subDone,
            subTotal: t.subTotal,
            assignee: t.assignee,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        })
        await db.tasks.bulkAdd(initialTasks)
        tList = initialTasks
      }

      // Map to AppTask
      const appTasks: AppTask[] = tList.map((t) => {
        const proj = pList.find((p) => p.id === t.projectId) || pList[0]
        return {
          id: t.id,
          projectId: t.projectId,
          projectName: proj?.name || 'Inbox',
          projectColor: proj?.color || '#6366f1',
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due: t.dueAt ? new Date(t.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : undefined,
          dueAt: t.dueAt,
          labels: t.labels || [],
          subDone: t.subDone || 0,
          subTotal: t.subTotal || 0,
          assignee: t.assignee,
        }
      })

      setTasksList(appTasks)
    } catch {
      //
    }
  }

  useEffect(() => {
    void loadTasksAndProjects()
  }, [])

  // Move task column
  const handleMoveTask = async (id: string, newCol: TaskStatus) => {
    try {
      await db.tasks.update(id, { status: newCol, updatedAt: new Date().toISOString() })
      setTasksList((prev) => prev.map((t) => (t.id === id ? { ...t, status: newCol } : t)))
      const colLabel = columns.find((c) => c.id === newCol)?.label || newCol
      toast({ title: 'Tugas Dipindahkan', description: `Status: "${colLabel}" (tersimpan ke IndexedDB).`, tone: 'info' })
    } catch {
      toast({ title: 'Gagal memindahkan tugas', tone: 'danger' })
    }
  }

  // Quick Add via NLP Parser
  const parsedPreview = quickInput ? parseQuickTask(quickInput) : null

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!quickInput.trim()) return

    const parsed = parseQuickTask(quickInput)
    const defaultProj = projectsList[0] || { id: 'p-inbox', name: 'Inbox', color: '#6366f1' }

    const newTaskEntity: TaskEntity = {
      id: crypto.randomUUID(),
      projectId: defaultProj.id,
      title: parsed.title,
      description: 'Dibuat lewat Quick Add NLP.',
      status: 'todo',
      priority: parsed.priority,
      dueAt: parsed.dueAt,
      position: '0',
      labels: parsed.labels.length > 0 ? parsed.labels : ['QuickAdd'],
      subDone: 0,
      subTotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.tasks.add(newTaskEntity)
    void loadTasksAndProjects()
    setQuickInput('')
    toast({
      title: 'Tugas Berhasil Ditambahkan!',
      description: `"${parsed.title}" (Prioritas: ${parsed.priority}).`,
      tone: 'success',
    })
  }

  // Save task updates from drawer
  const handleSaveTaskUpdates = async (id: string, updates: Partial<TaskEntity>) => {
    await db.tasks.update(id, updates)
    void loadTasksAndProjects()
    toast({ title: 'Perubahan tugas disimpan', tone: 'success' })
  }

  // Delete task
  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id)
    void loadTasksAndProjects()
    toast({ title: 'Tugas dihapus dari database lokal', tone: 'info' })
  }

  const filteredTasks =
    filterProjectId === 'all'
      ? tasksList
      : tasksList.filter((t) => t.projectId === filterProjectId)

  return (
    <>
      <PageHeader
        title="Tugas & Papan Kanban"
        description="Kelola alur kerja dan prioritas proyek — tersimpan permanen di IndexedDB"
        icon={<KanbanSquare className="size-5 text-primary" />}
        color="var(--mod-productivity)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Clock className="size-4 text-warning" />}
              onClick={() => {
                void loadSchedules()
                setScheduleModalOpen(true)
              }}
            >
              Jadwal Otomatis
              {schedulesList.filter((s) => s.active).length > 0 && (
                <span className="ml-1 rounded-full bg-warning/20 text-warning px-1.5 py-0.5 text-[11px] font-bold">
                  {schedulesList.filter((s) => s.active).length}
                </span>
              )}
            </Button>
            <Link to="/productivity/backlog">
              <Button variant="secondary" size="sm">Backlog & Sprint</Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => {
                setNewStatus('todo')
                setNewModalOpen(true)
              }}
            >
              Tugas Baru
            </Button>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        {/* NLP Quick Add Input */}
        <form onSubmit={handleQuickAdd} className="flex min-w-0 gap-2">
          <Input
            placeholder='Tambah cepat pintar: "besok jam 9 review PR sprint !tinggi #dev"'
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            className="min-w-0 flex-1 text-sm font-medium"
          />
          <Button variant="primary" type="submit" disabled={!quickInput.trim()} className="shrink-0">
            Tambah
          </Button>
        </form>

        {parsedPreview && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs bg-surface-2/60 p-2 rounded-lg border border-border">
            <span className="text-muted font-medium">Terdeteksi Otomatis:</span>
            {parsedPreview.dueLabel && (
              <Badge tone="info" className="flex items-center gap-1 font-semibold">
                <CalendarDays className="size-3" />
                {parsedPreview.dueLabel}
              </Badge>
            )}
            <PriorityBadge level={parsedPreview.priority} />
            {parsedPreview.labels.map((l) => (
              <Badge key={l} tone="neutral">
                #{l}
              </Badge>
            ))}
            <span className="text-muted">Judul: &quot;{parsedPreview.title}&quot;</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented<'kanban' | 'list' | 'calendar'>
            value={view}
            onChange={(v) => setView(v)}
            options={[
              { id: 'kanban', label: 'Kanban', icon: <KanbanSquare className="size-3.5" /> },
              { id: 'list', label: 'List', icon: <List className="size-3.5" /> },
              { id: 'calendar', label: 'Kalender', icon: <CalendarDays className="size-3.5" /> },
            ]}
          />

          <div className="flex items-center gap-2">
            <Select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-48 text-xs font-semibold"
            >
              <option value="all">Semua Proyek ({tasksList.length})</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {view === 'kanban' && (
        <Kanban
          items={filteredTasks}
          onMove={handleMoveTask}
          onOpen={setSelectedTask}
          onAddNew={(st) => {
            setNewStatus(st)
            setNewModalOpen(true)
          }}
        />
      )}

      {view === 'list' && <ListView items={filteredTasks} onOpen={setSelectedTask} />}
      {view === 'calendar' && <CalendarView items={filteredTasks} />}

      <TaskDrawer
        t={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleSaveTaskUpdates}
        onDelete={handleDeleteTask}
        allProjects={projectsList}
      />

      {/* Modal Tambah Tugas Manual */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <span>Tambah Tugas Baru</span>
          </div>
        }
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const titleInput = (form.elements.namedItem('taskTitle') as HTMLInputElement).value
            if (!titleInput.trim()) return

            const newTask: TaskEntity = {
              id: crypto.randomUUID(),
              projectId: projectsList[0]?.id || 'p-default',
              title: titleInput.trim(),
              description: '',
              status: newStatus,
              priority: 'sedang',
              position: '0',
              labels: ['Manual'],
              subDone: 0,
              subTotal: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }

            await db.tasks.add(newTask)
            void loadTasksAndProjects()
            setNewModalOpen(false)
            toast({ title: 'Tugas Berhasil Ditambahkan', tone: 'success' })
          }}
          className="space-y-4"
        >
          <Field label="Judul Tugas">
            <Input name="taskTitle" placeholder="Misal: Tulis dokumentasi arsitektur" autoFocus />
          </Field>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => setNewModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan Tugas
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Jadwal Tugas Otomatis (Recurring Automation) */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-warning" />
            <span>Jadwal Tugas Otomatis (Recurring Automation)</span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <p className="text-xs text-muted max-w-sm">
              Tugas berulang (seperti <b>Timesheet RPA Developer</b>, standup, health check bot) akan dibuat otomatis ke papan Kanban sesuai jadwal.
            </p>
            <Segmented
              value={scheduleTab}
              onChange={(val) => setScheduleTab(val as any)}
              options={[
                { id: 'list', label: `Daftar (${schedulesList.length})` },
                { id: 'create', label: '+ Buat Jadwal' },
              ]}
            />
          </div>

          {scheduleTab === 'list' ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Eksekusi Cepat Karyawan:</span> Tekan tombol{' '}
                  <b>"Jalankan Sekarang (⚡)"</b> untuk langsung membuat tugas Timesheet hari ini ke papan Kanban tanpa menunggu jam eksekusi!
                </div>
              </div>

              {schedulesList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">
                  Belum ada jadwal tugas otomatis.
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Sparkles className="size-3.5" />}
                      onClick={async () => {
                        await seedRpaDefaultSchedules()
                        await loadSchedules()
                      }}
                    >
                      Muat Preset Jadwal RPA Developer
                    </Button>
                  </div>
                </div>
              ) : (
                schedulesList.map((sched) => (
                  <Card key={sched.id} className={cn('p-3.5 space-y-2.5 transition-opacity', !sched.active && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-sm text-text">{sched.title}</h4>
                          <Badge tone={sched.priority === 'tinggi' ? 'danger' : 'info'}>
                            {sched.priority.toUpperCase()}
                          </Badge>
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted font-medium">
                            Kolom: {sched.targetStatus.toUpperCase()}
                          </span>
                        </div>
                        {sched.description && (
                          <p className="text-xs text-muted mt-1 leading-relaxed">{sched.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<Zap className="size-3.5" />}
                          onClick={() => handleTriggerScheduleNow(sched.id)}
                          title="Buat tugas ini ke Kanban sekarang"
                        >
                          <span className="hidden sm:inline">Jalankan Sekarang</span>
                        </Button>
                        <Switch
                          checked={sched.active}
                          onChange={(v) => handleToggleSchedule(sched.id, v)}
                          label="Aktif"
                        />
                        <button
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="p-1 text-muted hover:text-danger rounded"
                          title="Hapus jadwal"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs text-muted">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 font-medium text-text">
                          <Repeat className="size-3" />
                          {sched.frequency === 'weekdays'
                            ? 'Senin – Jumat (Hari Kerja)'
                            : sched.frequency === 'daily'
                            ? 'Setiap Hari'
                            : sched.frequency === 'weekly'
                            ? 'Setiap Jumat'
                            : 'Setiap Bulan'}
                        </span>
                        <span>• Jam {sched.time} WIB</span>
                        {sched.subtasks && sched.subtasks.length > 0 && (
                          <span>• {sched.subtasks.length} butir checklist</span>
                        )}
                      </div>

                      <span className="text-[11px]">
                        {sched.lastTriggeredDate
                          ? `Terakhir dibuat: ${sched.lastTriggeredDate}`
                          : 'Belum pernah dibuat hari ini'}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveSchedule} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <span className="text-xs font-semibold uppercase text-muted block mb-1.5">
                  Template Preset Cepat Siap Pakai:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    icon={<Sparkles className="size-3" />}
                    onClick={() => applyPreset('timesheet')}
                  >
                    Preset: Timesheet RPA Harian
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    icon={<Sparkles className="size-3" />}
                    onClick={() => applyPreset('healthcheck')}
                  >
                    Preset: Bot Health Check
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    icon={<Sparkles className="size-3" />}
                    onClick={() => applyPreset('weekly')}
                  >
                    Preset: Rekap Timesheet Mingguan
                  </Button>
                </div>
              </div>

              <Field
                label="Judul Tugas Otomatis"
                hint="Dukung variabel: {{today}} (nama hari & tanggal), {{date}}, {{month}}"
              >
                <Input
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  placeholder="Misal: Isi Timesheet Harian RPA Developer - {{today}}"
                  required
                />
              </Field>

              <Field label="Deskripsi / Catatan Tambahan">
                <Textarea
                  value={schedDesc}
                  onChange={(e) => setSchedDesc(e.target.value)}
                  placeholder="Catatan petunjuk atau instruksi pengerjaan tugas…"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Frekuensi Pembuatan">
                  <Select value={schedFreq} onChange={(e) => setSchedFreq(e.target.value as any)}>
                    <option value="weekdays">Senin – Jumat (Hari Kerja)</option>
                    <option value="daily">Setiap Hari (Termasuk Akhir Pekan)</option>
                    <option value="weekly">Mingguan (Setiap Hari Jumat)</option>
                    <option value="monthly">Bulanan (Tanggal 1)</option>
                  </Select>
                </Field>
                <Field label="Jam Pembuatan Otomatis">
                  <Input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioritas">
                  <Select value={schedPriority} onChange={(e) => setSchedPriority(e.target.value as any)}>
                    <option value="tinggi">Tinggi (Merah)</option>
                    <option value="sedang">Sedang (Kuning)</option>
                    <option value="rendah">Rendah (Netral)</option>
                  </Select>
                </Field>
                <Field label="Kolom Awal di Kanban">
                  <Select value={schedStatus} onChange={(e) => setSchedStatus(e.target.value as any)}>
                    <option value="todo">To Do</option>
                    <option value="doing">Doing</option>
                    <option value="backlog">Backlog</option>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Proyek Tujuan">
                  <Select value={schedProjectId} onChange={(e) => setSchedProjectId(e.target.value)}>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Label / Tag (Pisahkan Koma)">
                  <Input
                    value={schedLabels}
                    onChange={(e) => setSchedLabels(e.target.value)}
                    placeholder="timesheet, rpa, daily"
                  />
                </Field>
              </div>

              <Field
                label="Daftar Subtugas / Checklist (Satu Butir per Baris)"
                hint="Setiap baris akan otomatis menjadi butir checklist yang harus dicentang sampai status Done"
              >
                <Textarea
                  value={schedSubtasks}
                  onChange={(e) => setSchedSubtasks(e.target.value)}
                  placeholder="Buka portal timesheet&#10;Input log aktivitas bot&#10;Klik submit"
                  rows={4}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" type="button" onClick={() => setScheduleTab('list')}>
                  Batal
                </Button>
                <Button variant="primary" type="submit">
                  Simpan Jadwal Otomatis
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  )
}
