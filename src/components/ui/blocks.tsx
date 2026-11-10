import { AlertOctagon, Check, Copy, Inbox, Plus, Trash2, UploadCloud } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Badge, Button, Card, Checkbox, Input, ProgressRing } from './primitives'

/* ---------- PageHeader ---------- */
export function PageHeader({ title, description, icon, color, actions }: { title: string; description?: string; icon?: ReactNode; color?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md" style={{ background: `color-mix(in srgb, ${color ?? 'var(--primary)'} 16%, transparent)`, color: color ?? 'var(--primary)' }}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-[22px]">{title}</h1>
          {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- StatCard ---------- */
export function StatCard({ label, value, hint, icon, tone, children }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: string; children?: ReactNode }) {
  return (
    <Card className="min-w-0 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 text-muted">
        <span className="truncate text-[12px] sm:text-[13px]">{label}</span>
        <span className="shrink-0" style={{ color: tone }}>{icon}</span>
      </div>
      <div className="tnum mt-2 text-2xl leading-none font-semibold sm:text-[30px]">{value}</div>
      {hint && <div className="mt-2 truncate text-[11px] text-muted sm:text-xs">{hint}</div>}
      {children}
    </Card>
  )
}

/* ---------- Empty / Error ---------- */
export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-2 text-muted">{icon ?? <Inbox className="size-6" />}</span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Terjadi kesalahan', description = 'Data gagal dimuat. Periksa koneksi Anda lalu coba lagi.', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/5 px-6 py-14 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertOctagon className="size-6" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

/* ---------- CodeBlock ---------- */
export function CodeBlock({ code, label, className, maxHeight }: { code: string; label?: string; className?: string; maxHeight?: number }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-bg', className)}>
      <div className="flex items-center justify-between border-b border-border bg-surface-2/60 px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted uppercase">{label ?? 'code'}</span>
        <button
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
          onClick={() => {
            void navigator.clipboard?.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <pre className="overflow-auto p-3 font-mono text-[13px] leading-relaxed" style={{ maxHeight }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ---------- Dropzone (visual saja) ---------- */
export function Dropzone({ title, hint, accept, onPick, onFile, compact }: { title: string; hint?: string; accept?: string; onPick?: (name: string) => void; onFile?: (file: File) => void; compact?: boolean }) {
  const [over, setOver] = useState(false)
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) {
          onPick?.(f.name)
          onFile?.(f)
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        over ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/60 hover:bg-surface-2/50',
      )}
    >
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <UploadCloud className="size-6" />
      </span>
      <span className="text-[15px] font-medium">{title}</span>
      {hint && <span className="mt-1 text-xs text-muted">{hint}</span>}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            onPick?.(f.name)
            onFile?.(f)
          }
        }}
      />
    </label>
  )
}

/* ---------- Domain badges ---------- */
const methodColors: Record<string, string> = {
  GET: '#22c55e',
  POST: '#f59e0b',
  PUT: '#3b82f6',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
}
export function HttpMethodBadge({ method, className }: { method: string; className?: string }) {
  const c = methodColors[method] ?? '#8b97ad'
  return (
    <span className={cn('inline-block min-w-12 rounded-sm px-1.5 py-0.5 text-center font-mono text-[11px] font-bold', className)} style={{ color: c, background: `color-mix(in srgb, ${c} 15%, transparent)` }}>
      {method}
    </span>
  )
}

export function StatusBadge({ code, text }: { code: number; text: string }) {
  const tone = code < 300 ? 'success' : code < 400 ? 'info' : code < 500 ? 'warning' : 'danger'
  return (
    <Badge tone={tone} className="font-mono">
      {code} {text}
    </Badge>
  )
}

export function PriorityBadge({ level }: { level: 'tinggi' | 'sedang' | 'rendah' }) {
  const map = { tinggi: 'danger', sedang: 'warning', rendah: 'neutral' } as const
  return <Badge tone={map[level]}>{level[0].toUpperCase() + level.slice(1)}</Badge>
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-muted)'
  return <ProgressRing value={score} size={size} color={color} />
}

/* ---------- KeyValueEditor ---------- */
export type KV = { key: string; value: string; on: boolean }
export function KeyValueEditor({ rows, onChange }: { rows: KV[]; onChange: (r: KV[]) => void }) {
  const set = (i: number, patch: Partial<KV>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Checkbox checked={r.on} onChange={(v) => set(i, { on: v })} label="Aktif" />
          <Input value={r.key} placeholder="Key" onChange={(e) => set(i, { key: e.target.value })} className="font-mono text-[13px]" />
          <Input value={r.value} placeholder="Value" onChange={(e) => set(i, { value: e.target.value })} className="font-mono text-[13px]" />
          <button aria-label="Hapus baris" className="text-muted hover:text-danger" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => onChange([...rows, { key: '', value: '', on: true }])}>
        Tambah baris
      </Button>
    </div>
  )
}

