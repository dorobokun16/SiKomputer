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
  Pin,
  PinOff,
  Save,
  Server,
  SlidersHorizontal,
  Terminal,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db, type NoteEntity } from '@/db/dexie'
import { Badge, Button, Field, Input } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/overlays'
import {
  broadcastNotesSync,
  ensureNotesSeeded,
  subscribeNotesSync,
} from '@/components/notes/NotepadContext'
import { cn } from '@/lib/cn'

export function NotepadWindowPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const noteId = searchParams.get('noteId') || ''

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<NoteEntity['category']>('note')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(new Date().toISOString())

  const [isDirty, setIsDirty] = useState(false)
  const isDirtyRef = useRef(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [showCredEditor, setShowCredEditor] = useState(false)
  const [secretVisible, setSecretVisible] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const [fontFamily, setFontFamily] = useState<'mono' | 'sans'>('mono')
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base')
  const [wordWrap, setWordWrap] = useState(true)

  const setDirtyFlag = useCallback((val: boolean) => {
    isDirtyRef.current = val
    setIsDirty(val)
  }, [])

  const applyEntity = useCallback(
    (n: NoteEntity) => {
      setTitle(n.title)
      setCategory(n.category)
      setUrl(n.url || '')
      setUsername(n.username || '')
      setPassword(n.password || '')
      setContent(n.content || '')
      setIsPinned(n.isPinned)
      setUpdatedAt(n.updatedAt)
      setDirtyFlag(false)
    },
    [setDirtyFlag],
  )

  const loadTargetNote = useCallback(async () => {
    if (!noteId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    try {
      await ensureNotesSeeded()
      const note = await db.notes.get(noteId)
      if (!note) {
        setNotFound(true)
      } else {
        setNotFound(false)
        applyEntity(note)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [applyEntity, noteId])

  useEffect(() => {
    void loadTargetNote()
  }, [loadTargetNote])

  // Sinkronisasi lintas jendela apabila ada perubahan dari jendela lain saat editor bersih
  useEffect(() => {
    return subscribeNotesSync(() => {
      if (isDirtyRef.current || !noteId) return
      void db.notes.get(noteId).then((n) => {
        if (n) applyEntity(n)
      })
    })
  }, [applyEntity, noteId])

  // Perbarui judul tab / window OS secara real-time
  useEffect(() => {
    const prefix = isDirty ? '● ' : ''
    document.title = `${prefix}${title || 'Catatan'} — Catatan SiKomputer`
  }, [isDirty, title])

  const closeStandaloneWindow = useCallback(() => {
    isDirtyRef.current = false
    setIsDirty(false)
    window.close()
    window.setTimeout(() => {
      if (!window.closed) {
        navigate('/productivity/notes')
      }
    }, 150)
  }, [navigate])

  const saveNote = useCallback(
    async (closeAfterSave = false) => {
      if (!noteId) return
      try {
        const now = new Date().toISOString()
        await db.notes.update(noteId, {
          title: title.trim() || 'Catatan Tanpa Judul',
          category,
          url: url.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
          content,
          isPinned,
          updatedAt: now,
        })
        setUpdatedAt(now)
        setDirtyFlag(false)
        setConfirmCloseOpen(false)
        broadcastNotesSync()
        toast({ title: 'Catatan Berhasil Disimpan', tone: 'success' })
        if (closeAfterSave) {
          closeStandaloneWindow()
        }
      } catch {
        toast({ title: 'Gagal Menyimpan Catatan', tone: 'danger' })
      }
    },
    [
      category,
      closeStandaloneWindow,
      content,
      isPinned,
      noteId,
      password,
      setDirtyFlag,
      title,
      toast,
      url,
      username,
    ],
  )

  const requestClose = useCallback(() => {
    if (!isDirtyRef.current) {
      closeStandaloneWindow()
      return
    }
    setConfirmCloseOpen(true)
  }, [closeStandaloneWindow])

  // Proteksi penutupan jendela native OS [X] saat ada perubahan belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      e.preventDefault()
      e.returnValue = 'Catatan belum disimpan.'
      setConfirmCloseOpen(true)
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Pintasan keyboard Ctrl+S / Cmd+S dan Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void saveNote(false)
      } else if (e.key === 'Escape') {
        if (confirmCloseOpen) {
          setConfirmCloseOpen(false)
        } else {
          requestClose()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [confirmCloseOpen, requestClose, saveNote])

  const handleCopy = (text: string, key: string, label = 'Teks') => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title: `${label} Tersalin ke Clipboard`, tone: 'success' })
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleDownloadTxt = () => {
    const safeTitle = (title || 'catatan').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')
    const filename = `${safeTitle}.txt`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const fileUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(fileUrl)
    toast({ title: `File ${filename} berhasil diunduh`, tone: 'success' })
  }

  if (loading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-bg text-sm text-muted">
        Memuat jendela catatan…
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-foreground">
        <FileText className="size-10 text-muted" />
        <div className="space-y-1">
          <h1 className="text-base font-bold">Catatan tidak ditemukan</h1>
          <p className="text-xs text-muted">
            Catatan ini mungkin sudah dihapus atau ID jendela tidak valid.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/productivity/notes')}>
          Kembali ke Catatan &amp; Kredensial
        </Button>
      </div>
    )
  }

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-surface text-foreground">
      {/* Header Bar Jendela Standalone */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/85 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {category === 'password' && <KeyRound className="size-4 text-amber-500 shrink-0" />}
          {category === 'endpoint' && <Server className="size-4 text-blue-500 shrink-0" />}
          {category === 'env' && <Terminal className="size-4 text-emerald-500 shrink-0" />}
          {category === 'note' && <FileText className="size-4 text-purple-500 shrink-0" />}

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setDirtyFlag(true)
            }}
            placeholder="Judul Catatan..."
            className="min-w-0 flex-1 rounded bg-transparent px-1.5 py-0.5 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary sm:text-base"
          />

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as NoteEntity['category'])
              setDirtyFlag(true)
            }}
            aria-label="Kategori Catatan"
            className="hidden rounded border border-border bg-surface px-2 py-1 text-xs text-muted sm:inline-block"
          >
            <option value="password">Password</option>
            <option value="endpoint">Endpoint</option>
            <option value="env">.env</option>
            <option value="note">Memo</option>
          </select>

          {isDirty ? (
            <Badge tone="warning" className="text-[10px] shrink-0">
              Belum Disimpan
            </Badge>
          ) : (
            <Badge tone="success" className="text-[10px] shrink-0">
              Tersimpan
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsPinned((p) => !p)
              setDirtyFlag(true)
            }}
            className={cn(
              'rounded-lg p-1.5 transition-colors cursor-pointer',
              isPinned ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-foreground',
            )}
            title={isPinned ? 'Lepas Pin' : 'Pin di Atas'}
          >
            {isPinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => void saveNote(false)}
            className="shadow-xs"
          >
            <Save className="mr-1.5 size-3.5" />
            Simpan
          </Button>
        </div>
      </header>

      {/* Credential Quick Bar & Toggle Edit Kredensial */}
      <div className="border-b border-border bg-surface-2/35 px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {url && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <Globe className="size-3.5 text-primary shrink-0" />
                <span className="max-w-[200px] truncate font-mono text-[11px] text-muted" title={url}>
                  {url}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(url, 'win-url', 'URL')}
                  className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                  title="Salin URL"
                >
                  {copiedKey === 'win-url' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                </button>
                <a
                  href={url.startsWith('http') ? url : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-0.5 text-muted hover:text-foreground"
                  title="Buka Website"
                >
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            {username && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <span className="text-[11px] text-muted">User:</span>
                <span className="font-mono text-[11px] font-medium text-foreground">{username}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(username, 'win-usr', 'Username')}
                  className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                  title="Salin Username"
                >
                  {copiedKey === 'win-usr' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                </button>
              </div>
            )}

            {password && (
              <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
                <span className="text-[11px] text-muted">Secret:</span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-foreground">
                  {secretVisible ? password : '••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setSecretVisible((v) => !v)}
                  className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                  title={secretVisible ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {secretVisible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(password, 'win-pwd', 'Password / Secret')}
                  className="p-0.5 text-muted hover:text-foreground cursor-pointer"
                  title="Salin Password"
                >
                  {copiedKey === 'win-pwd' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                </button>
              </div>
            )}

            {!url && !username && !password && (
              <span className="text-[11px] text-muted">Tidak ada kredensial terlampir.</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCredEditor((s) => !s)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer',
              showCredEditor
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            <SlidersHorizontal className="size-3" />
            {showCredEditor ? 'Tutup Editor Kredensial' : 'Edit Kredensial (URL / User / Secret)'}
          </button>
        </div>

        {showCredEditor && (
          <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-border/70 pt-3 sm:grid-cols-3">
            <Field label="URL / Endpoint">
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setDirtyFlag(true)
                }}
                placeholder="https://..."
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Username / Auth Key">
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setDirtyFlag(true)
                }}
                placeholder="user@domain.com / Bearer"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Password / Secret Token">
              <Input
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setDirtyFlag(true)
                }}
                placeholder="Secret / token..."
                className="font-mono text-xs"
              />
            </Field>
          </div>
        )}
      </div>

      {/* Toolbar Formatting & Utilitas Teks */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/20 px-3 py-2 text-xs sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setFontFamily((f) => (f === 'mono' ? 'sans' : 'mono'))}
            className={cn(
              'rounded border border-border px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer',
              fontFamily === 'mono'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-surface text-muted hover:text-foreground',
            )}
          >
            {fontFamily === 'mono' ? 'Monospace (Code)' : 'Sans-Serif (Text)'}
          </button>

          <div className="flex items-center rounded border border-border bg-surface text-[11px]">
            {(['sm', 'base', 'lg'] as const).map((sz, i) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                className={cn(
                  'px-2 py-1 transition-colors cursor-pointer',
                  i === 0 && 'rounded-l',
                  i === 2 && 'rounded-r',
                  fontSize === sz ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
                )}
              >
                {sz === 'sm' ? 'A-' : sz === 'lg' ? 'A+' : 'A'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={cn(
              'rounded border border-border px-2 py-1 text-[11px] transition-colors cursor-pointer',
              wordWrap
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-surface text-muted hover:text-foreground',
            )}
          >
            {wordWrap ? 'Wrap: On' : 'Wrap: Off'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(content, 'win-body', 'Isi Catatan')}
          >
            <Copy className="mr-1 size-3.5" />
            Salin Isi
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadTxt}>
            <Download className="mr-1 size-3.5" />
            Unduh .txt
          </Button>
        </div>
      </div>

      {/* Area Editor Penuh */}
      <div className="relative flex flex-1 overflow-hidden bg-surface-2/10">
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setDirtyFlag(true)
          }}
          placeholder="Tuliskan catatan panjang, kredensial, konfigurasi .env, endpoint API, atau dokumentasi di sini... (Ctrl+S Simpan · Esc Tutup)"
          className={cn(
            'h-full w-full resize-none overflow-y-auto border-none bg-transparent p-4 leading-relaxed text-foreground focus:outline-hidden sm:p-5',
            fontFamily === 'mono' ? 'font-mono' : 'font-sans',
            fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm',
            wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto',
          )}
          autoFocus
          spellCheck={false}
        />
      </div>

      {/* Status Bar Bawah */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/50 px-3 py-1.5 text-[11px] text-muted select-none sm:px-4">
        <div className="flex items-center gap-3">
          <span>Baris: {content.split('\n').length}</span>
          <span>Kata: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
          <span>Karakter: {content.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block">
            Pintasan: <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">Ctrl+S</kbd> Simpan ·{' '}
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">Esc</kbd> Tutup
          </span>
          <span>
            Diperbarui:{' '}
            {new Date(updatedAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </footer>

      {/* Modal Konfirmasi Unsaved Changes */}
      {confirmCloseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-foreground">
                Simpan perubahan pada &quot;{title || 'Catatan'}&quot;?
              </h4>
              <p className="text-xs leading-relaxed text-muted">
                Catatan ini telah diubah dan belum disimpan. Pilih tindakan sebelum menutup jendela:
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => setConfirmCloseOpen(false)}>
                Batal
              </Button>
              <Button size="sm" variant="danger" onClick={closeStandaloneWindow}>
                Jangan Simpan
              </Button>
              <Button size="sm" variant="primary" onClick={() => void saveNote(true)}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
