import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './primitives'

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEscape(open, onClose)
  if (!open) return null
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('shadow-card relative flex max-h-[90dvh] w-full flex-col rounded-t-lg border border-border bg-surface sm:rounded-lg', 'anim-slide-up sm:anim-pop', widths[size])}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Tutup" onClick={onClose} className="-mr-2">
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Drawer (kanan di desktop, bottom sheet di mobile) ---------- */
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEscape(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute right-0 bottom-0 flex max-h-[88dvh] w-full flex-col rounded-t-lg border border-border bg-surface shadow-2xl anim-slide-up sm:top-0 sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-lg sm:anim-slide-left">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <IconButton label="Tutup" onClick={onClose} className="-mr-2">
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </aside>
    </div>
  )
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
}

/* ---------- Popover ---------- */
export function Popover({ trigger, children, align = 'right', mobileFull, className }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; mobileFull?: boolean; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'shadow-card anim-pop z-40 rounded-lg border border-border bg-surface',
            mobileFull
              ? 'fixed inset-x-3 top-14 sm:inset-x-auto sm:top-full sm:mt-2 sm:absolute'
              : 'absolute top-full mt-2 max-w-[calc(100vw-1.5rem)]',
            align === 'right' ? (mobileFull ? 'sm:right-0' : 'right-0') : (mobileFull ? 'sm:left-0' : 'left-0'),
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/* ---------- Tabs & Segmented ---------- */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; icon?: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('scrollbar-none flex gap-1 overflow-x-auto border-b border-border', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-[13px] font-medium transition-colors',
            value === t.id ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text',
          )}
        >
          {t.icon}
          {t.label}
          {t.count != null && <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', className }: { options: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cn('scrollbar-none inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-surface-2 p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-[7px] font-medium whitespace-nowrap transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
            value === o.id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Toast ---------- */
type ToastItem = { id: number; title: string; description?: string; tone: 'success' | 'danger' | 'warning' | 'info' }
const ToastCtx = createContext<((t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastItem['tone'] }) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastItem['tone'] }) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { id, tone: 'success', ...t }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3500)
  }, [])
  const icons = { success: CheckCircle2, danger: XCircle, warning: AlertTriangle, info: Info }
  const colors = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', info: 'text-info' }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end">
        {items.map((t) => {
          const Icon = icons[t.tone]
          return (
            <div key={t.id} className="shadow-card anim-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-3">
              <Icon className={cn('mt-0.5 size-5 shrink-0', colors[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="text-xs text-muted">{t.description}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

