import { Binary, ChevronsLeft, ChevronsRight, KanbanSquare, LayoutDashboard, Menu, Search, Wrench } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { allNav, extraNav, navSections, type NavItem } from '@/app/nav'
import { Avatar, Badge, Kbd } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { db } from '@/db/dexie'

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 p-1 ring-1 ring-border/80 shadow-xs transition-transform hover:scale-105">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SiKomputer Logo" className="size-full object-contain drop-shadow-[0_2px_4px_rgba(0,82,204,0.25)]" />
      </div>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">SiKomputer</span>}
    </div>
  )
}

function SideLink({ item, collapsed, badgeOverride }: { item: NavItem; collapsed: boolean; badgeOverride?: number }) {
  const Icon = item.icon
  const badgeVal = badgeOverride !== undefined ? badgeOverride : item.badge
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={item.label}
      className={({ isActive }) =>
        cn(
          'group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] font-medium transition-colors',
          isActive ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface-2/60 hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full" style={{ background: item.color }} />}
          <Icon className="size-[18px] shrink-0" style={{ color: isActive ? item.color : undefined }} strokeWidth={1.75} />
          <span className={cn('flex-1 truncate', collapsed ? 'hidden' : 'hidden lg:block')}>{item.label}</span>
          {badgeVal !== undefined && badgeVal > 0 && (
            <Badge tone="primary" className={cn(collapsed ? 'hidden' : 'hidden lg:inline-flex')}>{badgeVal}</Badge>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ collapsed, onToggle, onSearch }: { collapsed: boolean; onToggle: () => void; onSearch: () => void }) {
  const { user: authUser } = useAuth()
  const loc = useLocation()
  const displayName = authUser?.fullName || 'Iwan Kurniawan'
  const displayRole = authUser?.role || 'RPA Developer'
  const [activeReminderCount, setActiveReminderCount] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    const loadCount = async () => {
      try {
        const list = await db.reminders.toArray()
        if (mounted) {
          setActiveReminderCount(list.filter((r) => r.active).length)
        }
      } catch {
        // ignore
      }
    }
    void loadCount()
    const timer = setInterval(loadCount, 10000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [loc.pathname])

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 sm:flex',
        collapsed ? 'w-[68px]' : 'w-[68px] lg:w-60',
      )}
    >
      <div className={cn('flex h-14 items-center border-b border-border px-4', collapsed ? 'justify-center' : 'justify-center lg:justify-between')}>
        <Logo compact />
        {!collapsed && <span className="mr-auto ml-2.5 hidden text-[17px] font-semibold tracking-tight lg:block">SiKomputer</span>}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className={cn('hidden rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text lg:block', collapsed && 'lg:hidden')}
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>
      {collapsed && (
        <button onClick={onToggle} aria-label="Perluas sidebar" className="mx-auto mt-2 hidden rounded-md p-1 text-muted hover:bg-surface-2 lg:block">
          <ChevronsRight className="size-4" />
        </button>
      )}

      <div className="px-3 pt-3">
        <button
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-[13px] text-muted transition-colors hover:border-muted/50"
        >
          <Search className="size-4 shrink-0" />
          <span className={cn('flex-1 text-left', collapsed ? 'hidden' : 'hidden lg:block')}>Cari…</span>
          <span className={cn(collapsed ? 'hidden' : 'hidden lg:block')}>
            <Kbd>Ctrl K</Kbd>
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navSections.map((s, i) => (
          <div key={i} className="space-y-0.5">
            {s.title && <p className={cn('px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted/80 uppercase', collapsed ? 'hidden' : 'hidden lg:block')}>{s.title}</p>}
            {s.title && <div className={cn('mx-2 mb-1 border-t border-border', collapsed ? 'block' : 'block lg:hidden')} />}
            {s.items.map((it) => (
              <SideLink
                key={it.path}
                item={it}
                collapsed={collapsed}
                badgeOverride={it.path === '/productivity/reminders' ? activeReminderCount : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border p-3">
        {extraNav.map((it) => (
          <SideLink key={it.path} item={it} collapsed={collapsed} />
        ))}
        <div className="mt-2 flex items-center gap-2.5 rounded-md px-1.5 py-1.5">
          <Avatar name={displayName} size={30} />
          <div className={cn('min-w-0 leading-tight', collapsed ? 'hidden' : 'hidden lg:block')}>
            <p className="truncate text-[13px] font-medium">{displayName}</p>
            <p className="truncate text-[11px] text-muted">{displayRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ---------- Bottom nav (mobile) ---------- */
export function BottomNav() {
  const [more, setMore] = useState(false)
  const loc = useLocation()
  const tabs = [
    { to: '/', label: 'Beranda', icon: LayoutDashboard, match: (p: string) => p === '/' },
    { to: '/dev/base64', label: 'Dev', icon: Binary, match: (p: string) => p.startsWith('/dev') },
    { to: '/productivity/tasks', label: 'Tugas', icon: KanbanSquare, match: (p: string) => p.startsWith('/productivity/tasks') || p.startsWith('/productivity/backlog') },
    { to: '/tools/toolbox', label: 'Toolbox', icon: Wrench, match: (p: string) => p.startsWith('/tools') },
  ]
  const tabPaths = new Set(tabs.map((t) => t.to))
  const moreItems = [...allNav.filter((n) => !tabPaths.has(n.path)), ...extraNav]
  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur sm:hidden">
        {tabs.map((t) => {
          const active = t.match(loc.pathname)
          return (
            <NavLink key={t.to} to={t.to} className={cn('flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-primary' : 'text-muted')}>
              <t.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {t.label}
            </NavLink>
          )
        })}
        <button onClick={() => setMore(true)} className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted">
          <Menu className="size-5" strokeWidth={1.75} />
          Lainnya
        </button>
      </nav>
      <Drawer open={more} onClose={() => setMore(false)} title="Menu lainnya">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {moreItems.map((it) => (
            <NavLink key={it.path} to={it.path} onClick={() => setMore(false)} className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-2 py-3 text-center text-[11px] leading-tight font-medium transition-colors hover:border-primary/50">
              <it.icon className="size-5 shrink-0" style={{ color: it.color }} strokeWidth={1.75} />
              <span className="line-clamp-2">{it.label}</span>
            </NavLink>
          ))}
        </div>
      </Drawer>
    </>
  )
}

