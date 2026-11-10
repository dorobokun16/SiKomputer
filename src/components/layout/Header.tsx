import { Bell, Check, Database, Download, FlaskConical, Moon, Plus, Search, Settings, Smartphone, Sparkles, Sun, Trash2, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Command } from 'cmdk'
import { allNav, extraNav, findNav } from '@/app/nav'
import { cn } from '@/lib/cn'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth'
import { user } from '@/mocks'
import { Avatar, Badge, Button, IconButton, Kbd } from '@/components/ui/primitives'
import { Popover, Segmented, useToast } from '@/components/ui/overlays'
import { Logo } from './Navigation'
import {
  clearAllNotifications,
  getNotifications,
  hasNotificationPermission,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_EVENT,
  pushNotification,
  requestNotificationPermission,
} from '@/services/notification.service'
import { db, type InAppNotification, type TaskEntity } from '@/db/dexie'

/* ---------- Notifikasi ---------- */
function NotificationPopover() {
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<InAppNotification[]>([])
  const [hasPermission, setHasPermission] = useState(false)

  const loadNotifs = async () => {
    const list = await getNotifications()
    setItems(list)
    setHasPermission(hasNotificationPermission())
  }

  useEffect(() => {
    void loadNotifs()
    const handleUpdate = () => void loadNotifs()
    window.addEventListener(NOTIFICATION_EVENT, handleUpdate)
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleUpdate)
  }, [])

  const unreadCount = items.filter((n) => n.unread).length
  const list = tab === 'all' ? items : items.filter((n) => n.unread)
  const dot = { warning: 'bg-warning', success: 'bg-success', info: 'bg-info', danger: 'bg-danger' }
  const options: { id: 'all' | 'unread'; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'unread', label: `Belum dibaca (${unreadCount})` },
  ]

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead()
    await loadNotifs()
    toast({ title: 'Semua notifikasi ditandai dibaca', tone: 'info' })
  }

  const handleClearAll = async () => {
    await clearAllNotifications()
    await loadNotifs()
    toast({ title: 'Riwayat notifikasi dibersihkan', tone: 'info' })
  }

  const handleItemClick = async (n: InAppNotification, close?: () => void) => {
    if (n.unread) {
      await markNotificationAsRead(n.id)
      await loadNotifs()
    }
    if (n.link) {
      if (close) close()
      navigate(n.link)
    }
  }

  const handleTestNotification = async () => {
    await pushNotification({
      title: 'Uji Notifikasi SiKomputer',
      body: 'Sistem pengingat, audio chime, dan in-app notification berfungsi sempurna!',
      tone: 'success',
      playChime: true,
      showDesktop: true,
    })
    await loadNotifs()
    toast({ title: 'Notifikasi berhasil diuji', tone: 'success' })
  }

  const handleRequestPerm = async () => {
    const res = await requestNotificationPermission()
    setHasPermission(res === 'granted')
    if (res === 'granted') {
      toast({ title: 'Izin notifikasi desktop aktif', tone: 'success' })
    } else {
      toast({ title: 'Izin notifikasi desktop ditolak/diabaikan peramban', tone: 'warning' })
    }
  }

  const formatRelativeTime = (iso: string) => {
    try {
      const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
      if (diffSec < 60) return 'Baru saja'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    } catch {
      return 'Terkini'
    }
  }

  return (
    <Popover
      mobileFull
      className="sm:w-[380px]"
      trigger={({ toggle }) => (
        <IconButton label="Notifikasi" onClick={toggle} className="relative">
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-surface animate-pulse" />
          )}
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifikasi</h3>
              {unreadCount > 0 && (
                <Badge tone="danger" className="px-1.5 py-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="size-3.5" />
                  Tandai dibaca
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center text-xs text-muted hover:text-danger hover:underline"
                  title="Hapus semua notifikasi"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {!hasPermission && (
            <div className="flex items-center justify-between gap-2 border-b border-border bg-warning/10 px-4 py-2 text-xs text-warning">
              <span>Izin notifikasi desktop belum aktif</span>
              <button
                onClick={handleRequestPerm}
                className="font-medium underline hover:text-foreground"
              >
                Aktifkan
              </button>
            </div>
          )}

          <div className="px-3 pt-2">
            <Segmented<'all' | 'unread'>
              size="sm"
              value={tab}
              onChange={setTab}
              options={options}
            />
          </div>

          <ul className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
            {list.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-muted">
                {tab === 'unread' ? 'Tidak ada notifikasi yang belum dibaca.' : 'Belum ada notifikasi.'}
              </li>
            ) : (
              list.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleItemClick(n, close)}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-md px-2.5 py-2.5 transition hover:bg-surface-2',
                    n.unread && 'bg-primary/5 font-normal'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.unread ? dot[n.tone] : 'bg-border'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[13px]', n.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted leading-relaxed">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted/70">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-primary"
              icon={<Sparkles className="size-3.5" />}
              onClick={handleTestNotification}
            >
              Uji Notifikasi Sekarang
            </Button>
          </div>
        </div>
      )}
    </Popover>
  )
}

/* ---------- Demo state (loading / empty / error) ---------- */
function DemoStateSwitch() {
  const [params, setParams] = useSearchParams()
  const current = (params.get('state') ?? 'normal') as 'normal' | 'loading' | 'empty' | 'error'
  const set = (s: string) => {
    const next = new URLSearchParams(params)
    if (s === 'normal') next.delete('state')
    else next.set('state', s)
    setParams(next, { replace: true })
  }
  return (
    <Popover
      mobileFull
      className="sm:w-56 p-3"
      trigger={({ toggle }) => (
        <IconButton label="Pratinjau state UI" onClick={toggle} className={cn(current !== 'normal' && 'text-primary')}>
          <FlaskConical className="size-[18px]" />
        </IconButton>
      )}
    >
      {() => (
        <div className="space-y-2">
          <p className="text-xs font-semibold">Pratinjau state UI</p>
          <p className="text-[11px] text-muted">Lihat tampilan tiap halaman saat memuat, kosong, atau error.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(['normal', 'loading', 'empty', 'error'] as const).map((s) => (
              <button
                key={s}
                onClick={() => set(s)}
                className={cn('h-8 rounded-md border text-xs font-medium capitalize', current === s ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-surface-2 text-muted hover:text-text')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  )
}

/* ---------- Indikator Penyimpanan Lokal & Cadangan ---------- */
function LocalStorageSync() {
  const nav = useNavigate()
  return (
    <Popover
      mobileFull
      className="sm:w-72 p-3"
      trigger={({ toggle }) => (
        <IconButton label="Penyimpanan Lokal & Cadangan" onClick={toggle} className="relative text-muted hover:text-text">
          <Database className="size-[18px]" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-success ring-2 ring-surface" />
        </IconButton>
      )}
    >
      {(close) => (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Penyimpanan Lokal (IndexedDB)</span>
            <Badge tone="success">100% Privat</Badge>
          </div>
          <p className="text-[11.5px] text-muted leading-relaxed">
            Data tugas, catatan, dan berkas tersimpan aman di peramban Anda tanpa dikirim ke server luar.
          </p>

          <div className="rounded-md border border-border/60 bg-surface-2/40 p-2 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted">Offline Cache PWA:</span>
              <span className="font-semibold text-success">Aktif (v1)</span>
            </div>
            <p className="text-[10.5px] text-muted/80">
              Aplikasi dapat di-install permanen ke HP dan dibuka tanpa laptop menyala.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="size-3" />}
              onClick={() => {
                close()
                nav('/settings')
              }}
            >
              Kelola Cadangan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Smartphone className="size-3" />}
              onClick={() => {
                close()
                nav('/settings')
              }}
            >
              Pasang ke HP
            </Button>
          </div>
        </div>
      )}
    </Popover>
  )
}

/* ---------- Menu akun ---------- */
function AccountMenu() {
  const nav = useNavigate()
  const { user: authUser } = useAuth()
  const displayName = authUser?.fullName || user.name
  const displayEmail = authUser?.email || user.email

  return (
    <Popover
      className="w-56"
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label="Menu akun" className="rounded-full ring-offset-2 ring-offset-surface transition hover:ring-2 hover:ring-primary/40">
          <Avatar name={displayName} size={32} />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted">{displayEmail}</p>
          </div>
          <div className="my-1 border-t border-border" />
          {[
            { label: 'Profil Pengguna', icon: User, to: '/settings' },
            { label: 'Pengaturan Sistem', icon: Settings, to: '/settings' },
          ].map((i) => (
            <button key={i.label} onClick={() => { nav(i.to); close() }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] hover:bg-surface-2">
              <i.icon className="size-4 text-muted" />
              {i.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

/* ---------- Header ---------- */
export function Header({ onSearch }: { onSearch: () => void }) {
  const { theme, toggle } = useTheme()
  const loc = useLocation()
  const toast = useToast()
  const nav = findNav(loc.pathname)
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur sm:px-6">
      <div className="sm:hidden">
        <Logo compact />
      </div>
      <div className="hidden min-w-0 items-center gap-2 text-[13px] sm:flex">
        <span className="text-muted">SiKomputer</span>
        <span className="text-muted/50">/</span>
        <span className="truncate font-medium">{nav?.label ?? 'Halaman'}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onSearch}
          className="mr-1 hidden h-9 w-64 items-center gap-2 rounded-md border border-border bg-surface px-3 text-[13px] text-muted transition-colors hover:border-muted/50 md:flex"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Cari tool, tugas…</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <IconButton label="Cari" onClick={onSearch} className="md:hidden">
          <Search className="size-[18px]" />
        </IconButton>
        <Button variant="primary" size="sm" icon={<Plus className="size-4" />} className="hidden sm:inline-flex" onClick={() => toast({ title: 'Menu "Baru"', description: 'Pintasan membuat tugas atau request.', tone: 'info' })}>
          Baru
        </Button>
        <LocalStorageSync />
        <DemoStateSwitch />
        <IconButton label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'} onClick={toggle}>
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </IconButton>
        <NotificationPopover />
        <div className="ml-1">
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

/* ---------- Command Palette ---------- */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const { toggle } = useTheme()
  const [liveTasks, setLiveTasks] = useState<TaskEntity[]>([])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    void db.tasks.toArray().then((list) => setLiveTasks(list.slice(0, 5)))
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const go = (to: string) => {
    nav(to)
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Command label="Command palette" className="shadow-card anim-pop relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-muted" />
          <Command.Input autoFocus placeholder="Ketik perintah atau cari…" className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto py-2">
          <Command.Empty className="px-4 py-8 text-center text-sm text-muted">Tidak ada hasil.</Command.Empty>
          <Command.Group heading="Navigasi">
            {[...allNav, ...extraNav].map((n) => (
              <Command.Item key={n.path} value={`${n.label} ${n.description}`} onSelect={() => go(n.path)}>
                <n.icon className="size-4" style={{ color: n.color }} />
                <span className="flex-1">{n.label}</span>
                <span className="hidden text-xs text-muted sm:block">{n.description}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Aksi">
            <Command.Item value="buat tugas baru" onSelect={() => go('/productivity/tasks')}>
              <Plus className="size-4 text-mod-productivity" />
              Buat tugas baru
            </Command.Item>
            <Command.Item value="ganti tema gelap terang" onSelect={() => { toggle(); onClose() }}>
              <Moon className="size-4 text-muted" />
              Ganti tema
            </Command.Item>
          </Command.Group>
          {liveTasks.length > 0 && (
            <Command.Group heading="Tugas">
              {liveTasks.map((t) => (
                <Command.Item key={t.id} value={`tugas ${t.title}`} onSelect={() => go('/productivity/tasks')}>
                  <span className="size-2 rounded-full bg-mod-productivity" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <Badge>{t.status.toUpperCase()}</Badge>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}

