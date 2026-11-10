import { AlarmClock, ArrowUpRight, Binary, CheckCircle2, Flame, KanbanSquare, Send, Settings, Wrench, Braces, ListChecks, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useEffect, useState } from 'react'
import { db, type ProjectEntity, type ReminderEntity, type TaskEntity } from '@/db/dexie'
import { Badge, Button, Card, Checkbox, Progress } from '@/components/ui/primitives'
import { CardHeader } from '@/components/ui/primitives'
import { PageHeader, PriorityBadge, StatCard } from '@/components/ui/blocks'
import { useAuth } from '@/lib/auth'
import { NOTIFICATION_EVENT } from '@/services/notification.service'

const quick = [
  { to: '/dev/base64', label: 'Base64', icon: Binary, color: 'var(--mod-dev)' },
  { to: '/dev/api-tester', label: 'API Tester', icon: Send, color: 'var(--mod-dev)' },
  { to: '/productivity/tasks', label: 'Tugas', icon: KanbanSquare, color: 'var(--mod-productivity)' },
  { to: '/productivity/backlog', label: 'Backlog', icon: ListChecks, color: 'var(--mod-productivity)' },
  { to: '/productivity/reminders', label: 'Reminder', icon: AlarmClock, color: 'var(--mod-productivity)' },
  { to: '/tools/toolbox', label: 'Toolbox', icon: Wrench, color: 'var(--mod-dev)' },
  { to: '/tools/vault', label: 'Vault', icon: Braces, color: 'var(--mod-dev)' },
  { to: '/settings', label: 'Pengaturan', icon: Settings, color: 'var(--primary)' },
]

const dot = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

interface ActivityItem {
  text: string
  time: string
  timestamp: number
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Kemarin'
  return `${days} hari lalu`
}

export function DashboardPage() {
  const { user: authUser } = useAuth()
  const displayName = authUser?.fullName || 'Iwan Kurniawan'
  const firstName = displayName.split(' ')[0] || displayName

  const [tasksList, setTasksList] = useState<TaskEntity[]>([])
  const [projectsMap, setProjectsMap] = useState<Record<string, ProjectEntity>>({})
  const [remindersList, setRemindersList] = useState<ReminderEntity[]>([])
  const [snippetsCount, setSnippetsCount] = useState(0)
  const [notesCount, setNotesCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [weeklyData, setWeeklyData] = useState<{ name: string; value: number }[]>([])

  const loadDashboardData = async () => {
    try {
      const [tasks, projects, reminders, snippetsCnt, notesCnt, notifications, apiHistory] =
        await Promise.all([
          db.tasks.toArray(),
          db.projects.toArray(),
          db.reminders.toArray(),
          db.snippets.count(),
          db.notes.count(),
          db.notifications.toArray(),
          db.apiHistory.toArray(),
        ])

      setTasksList(tasks)
      const pMap: Record<string, ProjectEntity> = {}
      for (const p of projects) pMap[p.id] = p
      setProjectsMap(pMap)

      setRemindersList(reminders)
      setSnippetsCount(snippetsCnt)
      setNotesCount(notesCnt)

      // Hitung aktivitas nyata dari database lokal
      const acts: ActivityItem[] = []
      for (const n of notifications.slice(-5)) {
        acts.push({
          text: n.title,
          time: formatRelativeTime(n.createdAt),
          timestamp: new Date(n.createdAt).getTime(),
          tone: n.tone === 'danger' ? 'danger' : n.tone === 'warning' ? 'warning' : n.tone === 'success' ? 'success' : 'info',
        })
      }
      for (const t of tasks.slice(-5)) {
        const isDone = t.status === 'done'
        acts.push({
          text: isDone ? `Tugas "${t.title}" selesai` : `Tugas "${t.title}" (${t.status.toUpperCase()})`,
          time: formatRelativeTime(t.updatedAt || t.createdAt),
          timestamp: new Date(t.updatedAt || t.createdAt).getTime(),
          tone: isDone ? 'success' : 'primary',
        })
      }
      for (const api of apiHistory.slice(-4)) {
        acts.push({
          text: `${api.method} ${api.url} (${api.status})`,
          time: formatRelativeTime(api.createdAt),
          timestamp: new Date(api.createdAt).getTime(),
          tone: api.status >= 200 && api.status < 300 ? 'primary' : 'warning',
        })
      }

      acts.sort((a, b) => b.timestamp - a.timestamp)
      setRecentActivity(acts.slice(0, 5))

      // Hitung grafik produktivitas 7 hari terakhir secara dinamis
      const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const chart: { name: string; value: number; dateStr: string }[] = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        chart.push({
          name: dayLabels[d.getDay()],
          value: 0,
          dateStr,
        })
      }
      for (const t of tasks) {
        if (t.status === 'done') {
          const targetDate = (t.updatedAt || t.createdAt).slice(0, 10)
          const bucket = chart.find((c) => c.dateStr === targetDate)
          if (bucket) bucket.value += 1
        }
      }
      setWeeklyData(chart.map(({ name, value }) => ({ name, value })))
    } catch {
      // Fallback jika IndexedDB belum siap
    }
  }

  useEffect(() => {
    void loadDashboardData()
    const handleEvent = () => void loadDashboardData()
    window.addEventListener(NOTIFICATION_EVENT, handleEvent)
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleEvent)
  }, [])

  const handleToggleTaskDone = async (t: TaskEntity, checked: boolean) => {
    const nextStatus = checked ? 'done' : 'todo'
    await db.tasks.update(t.id, {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
    await loadDashboardData()
  }

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const totalTasks = tasksList.length
  const doneCount = tasksList.filter((t) => t.status === 'done').length
  const activeTasks = tasksList.filter((t) => t.status !== 'done')

  const nowMs = Date.now()
  const overdueTasks = activeTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < nowMs)

  // Prioritaskan tugas 'doing' atau tenggat terdekat
  const displayTodayTasks = [...activeTasks]
    .sort((a, b) => {
      if (a.status === 'doing' && b.status !== 'doing') return -1
      if (b.status === 'doing' && a.status !== 'doing') return 1
      return 0
    })
    .slice(0, 5)

  // Cari reminder aktif terdekat
  const activeReminders = remindersList
    .filter((r) => r.active)
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
  const nextReminder = activeReminders[0]

  const totalWeeklyDone = weeklyData.reduce((acc, d) => acc + d.value, 0)

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${firstName}`}
        description={
          activeTasks.length > 0
            ? `${formattedDate} — Anda punya ${activeTasks.length} tugas aktif.`
            : `${formattedDate} — Tidak ada tugas aktif di database lokal saat ini.`
        }
        actions={
          <Link to="/productivity/tasks">
            <Button variant="primary" icon={<KanbanSquare className="size-4" />}>
              Buka Kanban
            </Button>
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Tugas selesai"
          value={
            <>
              {doneCount}
              <span className="text-sm text-muted sm:text-lg">/{totalTasks}</span>
            </>
          }
          icon={<CheckCircle2 className="size-4" />}
          tone="var(--mod-productivity)"
        >
          <Progress value={totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0} tone="success" className="mt-3" />
        </StatCard>

        <StatCard
          label="Terlambat"
          value={String(overdueTasks.length)}
          icon={<Flame className="size-4" />}
          tone={overdueTasks.length > 0 ? 'var(--danger)' : 'var(--success)'}
          hint={
            overdueTasks.length > 0 ? (
              <span className="text-danger">{overdueTasks.length} tugas melewati tenggat</span>
            ) : (
              'Semua tugas terjadwal aman'
            )
          }
        />

        <StatCard
          label="Reminder aktif"
          value={
            nextReminder
              ? new Date(nextReminder.remindAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'
          }
          icon={<AlarmClock className="size-4" />}
          tone="var(--warning)"
          hint={nextReminder ? nextReminder.title : 'Belum ada reminder terjadwal'}
        />

        <StatCard
          label="Snippet tersimpan"
          value={String(snippetsCount)}
          icon={<Braces className="size-4" />}
          tone="var(--mod-dev)"
          hint={notesCount > 0 ? `${notesCount} catatan & kredensial di Vault` : 'Tersimpan di IndexedDB lokal'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Tugas aktif"
            subtitle="Fokus pada tugas prioritas di papan Kanban"
            action={
              <Link to="/productivity/tasks" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Lihat semua <ArrowUpRight className="size-3" />
              </Link>
            }
          />
          {displayTodayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <KanbanSquare className="mb-2 size-8 text-muted/40" />
              <p className="text-sm font-medium text-foreground">Belum ada tugas aktif</p>
              <p className="mt-0.5 text-xs text-muted">
                {totalTasks === 0
                  ? 'Semua data tugas bersih. Mulai buat tugas baru untuk melihat progres di sini.'
                  : 'Semua tugas Anda telah ditandai selesai!'}
              </p>
              <Link to="/productivity/tasks" className="mt-3">
                <Button variant="secondary" size="sm" icon={<Plus className="size-3.5" />}>
                  Tambah Tugas Baru
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {displayTodayTasks.map((t) => {
                const proj = projectsMap[t.projectId]
                const isOverdue = t.dueAt && new Date(t.dueAt).getTime() < nowMs
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      checked={t.status === 'done'}
                      onChange={(v) => void handleToggleTaskDone(t, v)}
                      label={t.title}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={t.status === 'done' ? 'truncate text-muted line-through' : 'truncate font-medium'}>
                        {t.title}
                      </p>
                      <p className="text-xs text-muted">{proj?.name || 'Inbox'}</p>
                    </div>
                    <Badge tone={isOverdue ? 'danger' : 'neutral'} className="hidden sm:inline-flex">
                      {t.dueAt
                        ? new Date(t.dueAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : t.status.toUpperCase()}
                    </Badge>
                    <PriorityBadge level={t.priority} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Akses cepat" />
          <div className="grid grid-cols-4 gap-2 p-3 lg:grid-cols-2 xl:grid-cols-4">
            {quick.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center text-xs font-medium transition-colors hover:border-border hover:bg-surface-2"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-md"
                  style={{ background: `color-mix(in srgb, ${q.color} 15%, transparent)`, color: q.color }}
                >
                  <q.icon className="size-5" strokeWidth={1.75} />
                </span>
                {q.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Aktivitas terbaru" />
          {recentActivity.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted">
              Belum ada aktivitas tercatat di database lokal.
            </div>
          ) : (
            <ol className="space-y-4 p-4">
              {recentActivity.map((a, i) => (
                <li key={i} className="relative flex gap-3 pl-1">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[a.tone]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]" title={a.text}>
                      {a.text}
                    </p>
                    <p className="text-xs text-muted">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Produktivitas 7 hari"
            subtitle="Tugas diselesaikan per hari"
            icon={<ListChecks className="size-4 text-muted" />}
          />
          <div className="h-56 p-4 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)' }}
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar isAnimationActive={false} dataKey="value" name="Selesai" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="px-4 pb-4 text-xs text-muted">
            {totalWeeklyDone > 0
              ? `Halo ${firstName}, total ${totalWeeklyDone} tugas diselesaikan dalam 7 hari terakhir.`
              : `Halo ${firstName}, belum ada tugas yang diselesaikan dalam 7 hari terakhir.`}
          </p>
        </Card>
      </div>
    </>
  )
}
