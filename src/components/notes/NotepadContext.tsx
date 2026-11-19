import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  KeyRound,
  Maximize2,
  Minimize2,
  Minus,
  Save,
  Server,
  Terminal,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { db, type NoteEntity } from '@/db/dexie'
import { Badge, Button } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/overlays'
import { cn } from '@/lib/cn'

export interface NotepadWindowItem {
  windowId: string
  noteId: string
  title: string
  content: string
  username: string
  password: string
  url: string
  category: 'password' | 'endpoint' | 'env' | 'note'
  isPinned: boolean
  updatedAt: string
  isDirty: boolean
  size: 'floating' | 'large' | 'fullscreen'
  minimized: boolean
  zIndex: number
  posX: number
  posY: number
  fontFamily: 'mono' | 'sans'
  fontSize: 'sm' | 'base' | 'lg'
  wordWrap: boolean
  secretVisible: boolean
  confirmCloseOpen: boolean
}

export const sampleSeedNotes: Omit<NoteEntity, 'id'>[] = [
  {
    title: 'Kredensial Server Staging',
    category: 'password',
    username: 'admin@perusahaan.co.id',
    password: 'P@ssw0rdStaging2026!',
    url: 'https://staging.internal.corp',
    content: 'Akun akses pengujian pipeline RPA dan dashboard monitoring.',
    tags: ['staging', 'server', 'rpa'],
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'Webhook Webhook Automation RPA',
    category: 'endpoint',
    url: 'https://api.internal.corp/v1/rpa/trigger-timesheet',
    username: 'Bearer Token',
    password: 'demo_token_rpa_webhook_2026',
    content: 'POST endpoint untuk auto-create tugas & notifikasi bot Telegram.',
    tags: ['api', 'webhook', 'automation'],
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    title: 'DB Connection String .env',
    category: 'env',
    content:
      'DATABASE_URL="postgresql://postgres:secret123@127.0.0.1:5432/sikomputer?schema=public"\nREDIS_HOST="127.0.0.1"\nREDIS_PORT=6379',
    tags: ['env', 'database', 'local'],
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const SYNC_CHANNEL = 'sikomputer_notes_sync'
const SYNC_STORAGE_KEY = 'sk-notes-sync-ts'
let popupCascadeCounter = 0

export async function ensureNotesSeeded(): Promise<NoteEntity[]> {
  let list = await db.notes.toArray()
  if (list.length === 0 && !localStorage.getItem('sk-has-seeded')) {
    for (const s of sampleSeedNotes) {
      await db.notes.add({
        ...s,
        id: 'note-' + Math.random().toString(36).slice(2, 9),
      })
    }
    list = await db.notes.toArray()
  }
  return list
}

export function broadcastNotesSync() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, String(Date.now()))
  } catch {
    // ignore storage quota errors
  }
  if ('BroadcastChannel' in window) {
    try {
      const ch = new BroadcastChannel(SYNC_CHANNEL)
      ch.postMessage({ type: 'notes-updated', ts: Date.now() })
      ch.close()
    } catch {
      // ignore channel errors
    }
  }
}

export function subscribeNotesSync(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  let ch: BroadcastChannel | null = null
  if ('BroadcastChannel' in window) {
    try {
      ch = new BroadcastChannel(SYNC_CHANNEL)
      ch.onmessage = () => cb()
    } catch {
      ch = null
    }
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === SYNC_STORAGE_KEY) cb()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('storage', onStorage)
    ch?.close()
  }
}

export function getNoteWindowUrl(noteId: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${window.location.origin}${base}notepad-window?noteId=${encodeURIComponent(noteId)}`
}

export function openNoteInPopupWindow(noteId: string): Window | null {
  if (typeof window === 'undefined') return null
  const isAndroidWebView =
    typeof navigator !== 'undefined' &&
    /Android/i.test(navigator.userAgent) &&
    /; wv\)/i.test(navigator.userAgent)
  if (isAndroidWebView) return null

  const step = (popupCascadeCounter % 8) * 32
  popupCascadeCounter += 1
  const width = Math.min(920, Math.max(640, (window.screen?.availWidth || 1280) - 180))
  const height = Math.min(720, Math.max(520, (window.screen?.availHeight || 860) - 140))
  const baseLeft = Math.max(40, Math.round(((window.screen?.availWidth || 1280) - width) / 2))
  const baseTop = Math.max(40, Math.round(((window.screen?.availHeight || 860) - height) / 2))
  const left = Math.min(baseLeft + step, Math.max(40, (window.screen?.availWidth || 1280) - width - 16))
  const top = Math.min(baseTop + step, Math.max(40, (window.screen?.availHeight || 860) - height - 16))

  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  const win = window.open(getNoteWindowUrl(noteId), `sikomputer_note_${noteId}`, features)
  if (win) {
    try {
      win.focus()
    } catch {
      // ignore cross-context focus restriction
    }
    return win
  }
  return null
}

interface NotepadContextValue {
  openWindows: NotepadWindowItem[]
  openNoteWindow: (n: NoteEntity, preferredMode?: 'popup' | 'floating') => 'popup' | 'floating'
  openFloatingNote: (n: NoteEntity, initialSize?: NotepadWindowItem['size']) => void
  removeDeletedNoteWindows: (noteId: string) => void
}

const NotepadContext = createContext<NotepadContextValue | null>(null)

export function useNotepadWindows(): NotepadContextValue {
  const ctx = useContext(NotepadContext)
  if (!ctx) {
    throw new Error('useNotepadWindows harus digunakan di dalam NotepadWindowProvider')
  }
  return ctx
}

function getInitialFloatingCoords(cascadeIndex: number) {
  const step = (cascadeIndex % 6) * 28
  if (typeof window === 'undefined') return { posX: 280 + step, posY: 84 + step }
  if (window.innerWidth < 640) return { posX: 8, posY: 64 }
  const defaultWidth = 580
  const maxX = Math.max(260, window.innerWidth - defaultWidth - 36 - step)
  return {
    posX: Math.max(240, maxX),
    posY: Math.min(80 + step, Math.max(40, window.innerHeight - 360)),
  }
}

export function NotepadWindowProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [openWindows, setOpenWindows] = useState<NotepadWindowItem[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const topZRef = useRef(82)
  const dragRef = useRef<{
    windowId: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const nextTopZ = () => {
    topZRef.current += 1
    return topZRef.current
  }

  const updateWindow = useCallback((windowId: string, patch: Partial<NotepadWindowItem>) => {
    setOpenWindows((prev) => prev.map((w) => (w.windowId === windowId ? { ...w, ...patch } : w)))
  }, [])

  const focusWindow = useCallback((windowId: string) => {
    const z = nextTopZ()
    setActiveWindowId(windowId)
    setOpenWindows((prev) =>
      prev.map((w) => (w.windowId === windowId ? { ...w, minimized: false, zIndex: z } : w)),
    )
  }, [])

  const openFloatingNote = useCallback(
    (n: NoteEntity, initialSize: NotepadWindowItem['size'] = 'floating') => {
      const existing = openWindows.find((w) => w.noteId === n.id)
      if (existing) {
        focusWindow(existing.windowId)
        return
      }
      const z = nextTopZ()
      const winId = 'np-' + Math.random().toString(36).slice(2, 9)
      const { posX, posY } = getInitialFloatingCoords(openWindows.length)
      const newWin: NotepadWindowItem = {
        windowId: winId,
        noteId: n.id,
        title: n.title,
        content: n.content || '',
        username: n.username || '',
        password: n.password || '',
        url: n.url || '',
        category: n.category,
        isPinned: n.isPinned,
        updatedAt: n.updatedAt,
        isDirty: false,
        size: initialSize,
        minimized: false,
        zIndex: z,
        posX,
        posY,
        fontFamily: 'mono',
        fontSize: 'base',
        wordWrap: true,
        secretVisible: false,
        confirmCloseOpen: false,
      }
      setOpenWindows((prev) => [...prev, newWin])
      setActiveWindowId(winId)
    },
    [focusWindow, openWindows],
  )

  const openNoteWindow = useCallback(
    (n: NoteEntity, preferredMode: 'popup' | 'floating' = 'popup'): 'popup' | 'floating' => {
      if (preferredMode === 'popup') {
        const popup = openNoteInPopupWindow(n.id)
        if (popup) return 'popup'
        toast({
          title: 'Membuka jendela mengambang di dalam aplikasi',
          description: 'Anda tetap bisa membuka menu & fitur lain sementara catatan ini tampil mengambang.',
          tone: 'info',
        })
      }
      openFloatingNote(n, 'floating')
      return 'floating'
    },
    [openFloatingNote, toast],
  )

  const forceCloseWindow = useCallback(
    (windowId: string) => {
      setOpenWindows((prev) => {
        const remaining = prev.filter((w) => w.windowId !== windowId)
        if (activeWindowId === windowId) {
          const nextTop = [...remaining].sort((a, b) => b.zIndex - a.zIndex)[0]
          setActiveWindowId(nextTop ? nextTop.windowId : null)
        }
        return remaining
      })
    },
    [activeWindowId],
  )

  const removeDeletedNoteWindows = useCallback((noteId: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.noteId !== noteId))
  }, [])

  const requestCloseWindow = useCallback(
    (windowId: string) => {
      const win = openWindows.find((w) => w.windowId === windowId)
      if (!win) return
      if (!win.isDirty) {
        forceCloseWindow(windowId)
        return
      }
      const z = nextTopZ()
      setActiveWindowId(windowId)
      updateWindow(windowId, { confirmCloseOpen: true, minimized: false, zIndex: z })
    },
    [forceCloseWindow, openWindows, updateWindow],
  )

  const requestCloseAllWindows = () => {
    const firstDirty = openWindows.find((w) => w.isDirty)
    if (!firstDirty) {
      setOpenWindows([])
      setActiveWindowId(null)
      return
    }
    requestCloseWindow(firstDirty.windowId)
    toast({
      title: 'Ada catatan yang belum disimpan',
      description: 'Konfirmasi Simpan atau Jangan Simpan sebelum menutup semua jendela.',
      tone: 'warning',
    })
  }

  const handleSaveWindow = useCallback(
    async (windowId: string, closeAfterSave = false) => {
      const win = openWindows.find((w) => w.windowId === windowId)
      if (!win) return
      try {
        const now = new Date().toISOString()
        await db.notes.update(win.noteId, {
          title: win.title.trim() || 'Catatan Tanpa Judul',
          content: win.content,
          username: win.username.trim() || undefined,
          password: win.password || undefined,
          url: win.url.trim() || undefined,
          category: win.category,
          isPinned: win.isPinned,
          updatedAt: now,
        })
        broadcastNotesSync()
        toast({ title: 'Catatan Berhasil Disimpan', tone: 'success' })
        if (closeAfterSave) {
          forceCloseWindow(windowId)
        } else {
          updateWindow(windowId, { isDirty: false, confirmCloseOpen: false, updatedAt: now })
        }
      } catch {
        toast({ title: 'Gagal Menyimpan Catatan', tone: 'danger' })
      }
    },
    [forceCloseWindow, openWindows, toast, updateWindow],
  )

  const handleCopy = (text: string, key: string, label = 'Teks') => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title: `${label} Tersalin ke Clipboard`, tone: 'success' })
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleDownloadWindow = (win: NotepadWindowItem) => {
    const safeTitle = (win.title || 'catatan').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')
    const filename = `${safeTitle}.txt`
    const blob = new Blob([win.content], { type: 'text/plain;charset=utf-8' })
    const fileUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(fileUrl)
    toast({ title: `File ${filename} berhasil diunduh`, tone: 'success' })
  }

  const handlePopOutFloating = async (win: NotepadWindowItem) => {
    if (win.isDirty) {
      await handleSaveWindow(win.windowId, false)
    }
    const popup = openNoteInPopupWindow(win.noteId)
    if (popup) {
      forceCloseWindow(win.windowId)
    } else {
      toast({
        title: 'Popup jendela terpisah diblokir browser',
        description: 'Izinkan popup untuk membuka catatan di jendela OS terpisah.',
        tone: 'warning',
      })
    }
  }

  // Peringatan sebelum menutup browser jika ada jendela mengambang belum disimpan
  useEffect(() => {
    const hasDirty = openWindows.some((w) => w.isDirty)
    if (!hasDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [openWindows])

  // Pointer drag listener untuk jendela mengambang
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const nextX = Math.max(8, Math.min(window.innerWidth - 180, drag.origX + dx))
      const nextY = Math.max(8, Math.min(window.innerHeight - 60, drag.origY + dy))
      setOpenWindows((prev) =>
        prev.map((w) => (w.windowId === drag.windowId ? { ...w, posX: nextX, posY: nextY } : w)),
      )
    }
    const handleUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [])

  // Keyboard shortcuts Ctrl+S / Esc untuk jendela mengambang yang sedang aktif
  useEffect(() => {
    if (openWindows.length === 0 || !activeWindowId) return
    const handleKey = (e: KeyboardEvent) => {
      const targetWin = openWindows.find((w) => w.windowId === activeWindowId)
      if (!targetWin || targetWin.minimized) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveWindow(targetWin.windowId, false)
      } else if (e.key === 'Escape') {
        if (targetWin.confirmCloseOpen) {
          updateWindow(targetWin.windowId, { confirmCloseOpen: false })
        } else {
          requestCloseWindow(targetWin.windowId)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeWindowId, handleSaveWindow, openWindows, requestCloseWindow, updateWindow])

  return (
    <NotepadContext.Provider
      value={{ openWindows, openNoteWindow, openFloatingNote, removeDeletedNoteWindows }}
    >
      {children}

      {openWindows.length > 0 &&
        createPortal(
          <>
            {openWindows.map((win) => {
              if (win.minimized) return null
              const isActive = activeWindowId === win.windowId
              const isFullscreen = win.size === 'fullscreen'
              const isFloating = win.size === 'floating'

              const windowCard = (
                <div
                  key={win.windowId}
                  data-notepad-window={win.windowId}
                  data-note-id={win.noteId}
                  onPointerDown={() => focusWindow(win.windowId)}
                  style={
                    isFloating
                      ? {
                          zIndex: win.zIndex,
                          left: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : win.posX,
                          top: typeof window !== 'undefined' && window.innerWidth < 640 ? 64 : win.posY,
                        }
                      : isFullscreen
                        ? { zIndex: win.zIndex }
                        : { zIndex: win.zIndex }
                  }
                  className={cn(
                    'pointer-events-auto flex flex-col bg-surface border shadow-2xl overflow-hidden transition-shadow',
                    isActive ? 'border-primary/70 ring-1 ring-primary/30' : 'border-border opacity-95',
                    isFloating
                      ? 'fixed w-[calc(100vw-16px)] sm:w-[580px] h-[72dvh] sm:h-[520px] rounded-xl sm:resize sm:min-w-[360px] sm:min-h-[320px] max-w-[96vw] max-h-[86dvh]'
                      : isFullscreen
                        ? 'fixed inset-0 w-screen h-dvh rounded-none'
                        : 'fixed inset-x-0 top-6 mx-auto w-[96vw] max-w-5xl h-[86dvh] rounded-xl',
                  )}
                >
                  {/* Title Bar (Draggable saat Mengambang) */}
                  <div
                    onPointerDown={(e) => {
                      if (!isFloating) return
                      const tag = (e.target as HTMLElement).tagName
                      if (tag === 'INPUT' || tag === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
                        return
                      }
                      dragRef.current = {
                        windowId: win.windowId,
                        startX: e.clientX,
                        startY: e.clientY,
                        origX: win.posX,
                        origY: win.posY,
                      }
                    }}
                    className={cn(
                      'flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/85 px-3 py-2 sm:px-4 select-none',
                      isFloating ? 'sm:cursor-move' : '',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                      {win.category === 'password' && <KeyRound className="size-4 text-amber-500 shrink-0" />}
                      {win.category === 'endpoint' && <Server className="size-4 text-blue-500 shrink-0" />}
                      {win.category === 'env' && <Terminal className="size-4 text-emerald-500 shrink-0" />}
                      {win.category === 'note' && <FileText className="size-4 text-purple-500 shrink-0" />}

                      <input
                        type="text"
                        value={win.title}
                        onChange={(e) => updateWindow(win.windowId, { title: e.target.value, isDirty: true })}
                        placeholder="Judul Catatan..."
                        className="bg-transparent font-semibold text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 truncate min-w-0 flex-1"
                      />

                      {win.isDirty ? (
                        <Badge tone="warning" className="text-[10px] shrink-0">
                          Belum Disimpan
                        </Badge>
                      ) : (
                        <Badge tone="success" className="text-[10px] shrink-0">
                          Tersimpan
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs text-muted">
                        <button
                          type="button"
                          onClick={() => updateWindow(win.windowId, { size: 'floating' })}
                          className={cn(
                            'hidden sm:inline-block px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                            win.size === 'floating' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground',
                          )}
                          title="Jendela Mengambang"
                        >
                          Jendela
                        </button>
                        <button
                          type="button"
                          onClick={() => updateWindow(win.windowId, { size: 'large' })}
                          className={cn(
                            'hidden sm:inline-block px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                            win.size === 'large' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground',
                          )}
                          title="Jendela Lebar"
                        >
                          Lebar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateWindow(win.windowId, {
                              size: win.size === 'fullscreen' ? 'floating' : 'fullscreen',
                            })
                          }
                          className={cn(
                            'px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                            win.size === 'fullscreen' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground',
                          )}
                          title={win.size === 'fullscreen' ? 'Kecilkan Jendela' : 'Layar Penuh'}
                        >
                          {win.size === 'fullscreen' ? (
                            <>
                              <Minimize2 className="size-3" /> Kecilkan
                            </>
                          ) : (
                            <>
                              <Maximize2 className="size-3" /> Full
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handlePopOutFloating(win)}
                        className="hidden sm:inline-flex rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-primary transition-colors cursor-pointer"
                        title="Pop-out ke Window OS Terpisah"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => updateWindow(win.windowId, { minimized: true })}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer"
                        title="Ciutkan ke Bilah Bawah"
                      >
                        <Minus className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => requestCloseWindow(win.windowId)}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger transition-colors cursor-pointer"
                        title="Tutup Notepad"
                        aria-label={`Tutup ${win.title}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Credential Quick Bar */}
                  {(win.url || win.username || win.password) && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2/30 px-3 py-2 text-xs">
                      {win.url && (
                        <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2 py-1">
                          <Globe className="size-3.5 text-primary shrink-0" />
                          <span className="font-mono text-[11px] text-muted max-w-[170px] truncate" title={win.url}>
                            {win.url}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(win.url, `np-url-${win.windowId}`, 'URL')}
                            className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                            title="Salin URL"
                          >
                            {copiedKey === `np-url-${win.windowId}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      )}

                      {win.username && (
                        <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2 py-1">
                          <span className="text-[11px] text-muted">User:</span>
                          <span className="font-mono font-medium text-[11px] text-foreground">{win.username}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(win.username, `np-user-${win.windowId}`, 'Username')}
                            className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                            title="Salin Username"
                          >
                            {copiedKey === `np-user-${win.windowId}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      )}

                      {win.password && (
                        <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2 py-1">
                          <span className="text-[11px] text-muted">Secret:</span>
                          <span className="font-mono font-semibold tracking-wider text-[11px] text-foreground">
                            {win.secretVisible ? win.password : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateWindow(win.windowId, { secretVisible: !win.secretVisible })}
                            className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                            title={win.secretVisible ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {win.secretVisible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(win.password, `np-pass-${win.windowId}`, 'Password')}
                            className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                            title="Salin Password"
                          >
                            {copiedKey === `np-pass-${win.windowId}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Editor Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/20 px-3 py-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateWindow(win.windowId, { fontFamily: win.fontFamily === 'mono' ? 'sans' : 'mono' })
                        }
                        className={cn(
                          'rounded border border-border px-2 py-1 font-mono text-[11px] transition-colors cursor-pointer',
                          win.fontFamily === 'mono' ? 'bg-primary/10 text-primary border-primary/40' : 'bg-surface text-muted hover:text-foreground',
                        )}
                      >
                        {win.fontFamily === 'mono' ? 'Mono' : 'Sans'}
                      </button>

                      <div className="flex items-center rounded border border-border bg-surface text-[11px]">
                        {(['sm', 'base', 'lg'] as const).map((sz, i) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => updateWindow(win.windowId, { fontSize: sz })}
                            className={cn(
                              'px-2 py-0.5 transition-colors cursor-pointer',
                              i === 0 && 'rounded-l',
                              i === 2 && 'rounded-r',
                              win.fontSize === sz ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
                            )}
                          >
                            {sz === 'sm' ? 'A-' : sz === 'lg' ? 'A+' : 'A'}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => updateWindow(win.windowId, { wordWrap: !win.wordWrap })}
                        className={cn(
                          'rounded border border-border px-2 py-1 text-[11px] transition-colors cursor-pointer',
                          win.wordWrap ? 'bg-primary/10 text-primary border-primary/40' : 'bg-surface text-muted hover:text-foreground',
                        )}
                      >
                        {win.wordWrap ? 'Wrap' : 'NoWrap'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => handleCopy(win.content, `np-body-${win.windowId}`, 'Isi Catatan')}
                      >
                        <Copy className="mr-1 size-3" />
                        Salin
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => handleDownloadWindow(win)}
                      >
                        <Download className="mr-1 size-3" />
                        .txt
                      </Button>
                      <Button
                        variant="primary"
                        className="h-7 text-xs px-2.5 shadow-xs"
                        onClick={() => void handleSaveWindow(win.windowId, false)}
                      >
                        <Save className="mr-1 size-3.5" />
                        Simpan
                      </Button>
                    </div>
                  </div>

                  {/* Main Textarea */}
                  <div className="relative flex-1 bg-surface-2/10 overflow-hidden flex">
                    <textarea
                      value={win.content}
                      onChange={(e) => updateWindow(win.windowId, { content: e.target.value, isDirty: true })}
                      placeholder="Tuliskan catatan panjang, kredensial, konfigurasi .env, atau endpoint di sini... (Ctrl+S untuk simpan)"
                      className={cn(
                        'w-full h-full p-3.5 sm:p-4 bg-transparent text-foreground resize-none focus:outline-hidden border-none overflow-y-auto leading-relaxed',
                        win.fontFamily === 'mono' ? 'font-mono' : 'font-sans',
                        win.fontSize === 'sm' ? 'text-xs' : win.fontSize === 'lg' ? 'text-base' : 'text-sm',
                        win.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto',
                      )}
                      spellCheck={false}
                    />
                  </div>

                  {/* Status Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/50 px-3 py-1 text-[11px] text-muted select-none">
                    <div className="flex items-center gap-3">
                      <span>Baris: {win.content.split('\n').length}</span>
                      <span>Karakter: {win.content.length}</span>
                    </div>
                    <span>
                      Diperbarui:{' '}
                      {new Date(win.updatedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Dialog Konfirmasi Unsaved Changes */}
                  {win.confirmCloseOpen && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
                      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-base font-bold text-foreground">
                            Simpan perubahan pada &quot;{win.title || 'Catatan'}&quot;?
                          </h4>
                          <p className="text-xs text-muted leading-relaxed">
                            Catatan ini telah diubah dan belum disimpan. Pilih tindakan sebelum menutup jendela:
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateWindow(win.windowId, { confirmCloseOpen: false })}
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => forceCloseWindow(win.windowId)}
                          >
                            Jangan Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => void handleSaveWindow(win.windowId, true)}
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )

              return windowCard
            })}

            {/* Multi-Window Dock Bar di Bagian Bawah (Persisten Lintas Menu) */}
            <div className="fixed bottom-14 sm:bottom-3 left-2 right-2 z-[95] pointer-events-none flex justify-center">
              <div className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-surface/95 px-2.5 py-1.5 shadow-xl backdrop-blur-md">
                <span className="hidden sm:inline-block px-1.5 text-[11px] font-semibold text-muted whitespace-nowrap">
                  Catatan ({openWindows.length}):
                </span>
                {openWindows.map((w) => {
                  const isActive = activeWindowId === w.windowId && !w.minimized
                  return (
                    <div
                      key={w.windowId}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors shrink-0',
                        isActive
                          ? 'border-primary/60 bg-primary/15 text-primary font-semibold'
                          : 'border-border bg-surface-2/60 text-muted hover:text-foreground',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => focusWindow(w.windowId)}
                        className="inline-flex items-center gap-1.5 max-w-[140px] truncate cursor-pointer"
                      >
                        {w.isDirty && (
                          <span className="size-2 rounded-full bg-amber-500 shrink-0" title="Belum disimpan" />
                        )}
                        <span className="truncate">{w.title || 'Catatan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCloseWindow(w.windowId)}
                        className="rounded p-0.5 text-muted hover:text-danger cursor-pointer"
                        title="Tutup tab catatan"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )
                })}
                {openWindows.length > 1 && (
                  <button
                    type="button"
                    onClick={requestCloseAllWindows}
                    className="ml-1 rounded-lg border border-border/80 bg-surface-2/40 px-2 py-1 text-[11px] text-muted hover:text-danger whitespace-nowrap cursor-pointer"
                  >
                    Tutup Semua
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </NotepadContext.Provider>
  )
}
