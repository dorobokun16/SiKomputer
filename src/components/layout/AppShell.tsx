import { useEffect, useState } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { findNav } from '@/app/nav'
import { Skeleton } from '@/components/ui/primitives'
import { Card } from '@/components/ui/primitives'
import { EmptyState, ErrorState } from '@/components/ui/blocks'
import { Button } from '@/components/ui/primitives'
import { BottomNav, Sidebar } from './Navigation'
import { CommandPalette, Header } from './Header'
import { checkAndRunTaskSchedules, seedRpaDefaultSchedules } from '@/services/task-scheduler.service'
import { checkDueReminders } from '@/services/notification.service'

function LoadingPage() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-40" />
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-10 w-full" />
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}

function StateBoundary() {
  const [params, setParams] = useSearchParams()
  const loc = useLocation()
  const state = params.get('state')
  const nav = findNav(loc.pathname)
  const reset = () => {
    const next = new URLSearchParams(params)
    next.delete('state')
    setParams(next, { replace: true })
  }
  if (state === 'loading') return <LoadingPage />
  if (state === 'empty' && nav?.emptyTitle)
    return <EmptyState title={nav.emptyTitle} description={nav.emptyDesc} icon={<nav.icon className="size-6" />} action={<Button variant="primary" onClick={reset}>Lihat contoh data</Button>} />
  if (state === 'error') return <ErrorState onRetry={reset} />
  return <Outlet />
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [palette, setPalette] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((o) => !o)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Auto-run recurring task scheduler & reminder checks in background
  useEffect(() => {
    void seedRpaDefaultSchedules().then(() => {
      void checkAndRunTaskSchedules()
    })
    void checkDueReminders()

    const timer = setInterval(() => {
      void checkAndRunTaskSchedules()
      void checkDueReminders()
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-clip">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onSearch={() => setPalette(true)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onSearch={() => setPalette(true)} />
        <main key={loc.pathname} className="anim-fade-in mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-3.5 pt-4 pb-24 sm:px-6 sm:pt-5 sm:pb-10">
          <StateBoundary />
        </main>
      </div>
      <BottomNav />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  )
}

