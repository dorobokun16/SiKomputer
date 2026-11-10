import {
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Pin,
  PinOff,
  Save,
  Search,
  Trash2,
  Edit2,
  FileText,
  Server,
  Terminal,
  ShieldCheck,
  Globe,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { db, type NoteEntity } from '@/db/dexie'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui/primitives'
import { Modal, Tabs, useToast } from '@/components/ui/overlays'
import { PageHeader } from '@/components/ui/blocks'
import { cn } from '@/lib/cn'

type CategoryFilter = 'all' | 'password' | 'endpoint' | 'env' | 'note'

const sampleSeedNotes: Omit<NoteEntity, 'id'>[] = [
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
    content: 'DATABASE_URL="postgresql://postgres:secret123@127.0.0.1:5432/sikomputer?schema=public"\nREDIS_HOST="127.0.0.1"\nREDIS_PORT=6379',
    tags: ['env', 'database', 'local'],
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function NotesVaultPage() {
  const toast = useToast()
  const [notes, setNotes] = useState<NoteEntity[]>([])
  const [filterCat, setFilterCat] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({})

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteEntity | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'password' | 'endpoint' | 'env' | 'note'>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  // Notepad Window State (Resizable / Fullscreen Notepad Window)
  const [notepadNote, setNotepadNote] = useState<NoteEntity | null>(null)
  const [notepadSize, setNotepadSize] = useState<'normal' | 'large' | 'fullscreen'>('large')
  const [notepadTitle, setNotepadTitle] = useState('')
  const [notepadContent, setNotepadContent] = useState('')
  const [notepadUsername, setNotepadUsername] = useState('')
  const [notepadPassword, setNotepadPassword] = useState('')
  const [notepadUrl, setNotepadUrl] = useState('')
  const [notepadCategory, setNotepadCategory] = useState<'password' | 'endpoint' | 'env' | 'note'>('note')
  const [notepadIsPinned, setNotepadIsPinned] = useState(false)
  const [notepadIsDirty, setNotepadIsDirty] = useState(false)
  const [notepadFontFamily, setNotepadFontFamily] = useState<'mono' | 'sans'>('mono')
  const [notepadFontSize, setNotepadFontSize] = useState<'sm' | 'base' | 'lg'>('base')
  const [notepadWordWrap, setNotepadWordWrap] = useState(true)
  const [isNotepadSecretVisible, setIsNotepadSecretVisible] = useState(false)

  // Load Notes from Dexie
  const loadNotes = async () => {
    try {
      let list = await db.notes.toArray()
      if (list.length === 0 && !localStorage.getItem('sk-has-seeded')) {
        // Seed initial demo notes
        for (const s of sampleSeedNotes) {
          await db.notes.add({
            ...s,
            id: 'note-' + Math.random().toString(36).slice(2, 9),
          })
        }
        list = await db.notes.toArray()
      }
      list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      setNotes(list)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void loadNotes()
  }, [])

  const handleCopy = (text: string, key: string, label = 'Teks') => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title: `${label} Tersalin ke Clipboard`, tone: 'success' })
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Notepad Window Controls
  const handleOpenNotepad = (n: NoteEntity) => {
    setNotepadNote(n)
    setNotepadTitle(n.title)
    setNotepadContent(n.content || '')
    setNotepadUsername(n.username || '')
    setNotepadPassword(n.password || '')
    setNotepadUrl(n.url || '')
    setNotepadCategory(n.category)
    setNotepadIsPinned(n.isPinned)
    setNotepadIsDirty(false)
    setIsNotepadSecretVisible(false)
  }

  const handleCloseNotepad = () => {
    setNotepadNote(null)
  }

  const handleSaveNotepad = async () => {
    if (!notepadNote) return
    try {
      const now = new Date().toISOString()
      await db.notes.update(notepadNote.id, {
        title: notepadTitle.trim() || notepadNote.title,
        content: notepadContent,
        username: notepadUsername.trim() || undefined,
        password: notepadPassword || undefined,
        url: notepadUrl.trim() || undefined,
        category: notepadCategory,
        isPinned: notepadIsPinned,
        updatedAt: now,
      })
      setNotepadIsDirty(false)
      toast({ title: 'Catatan Berhasil Disimpan', tone: 'success' })
      await loadNotes()
    } catch {
      toast({ title: 'Gagal Menyimpan Catatan', tone: 'danger' })
    }
  }

  const handleDownloadNotepad = () => {
    if (!notepadNote) return
    const text = notepadContent
    const safeTitle = (notepadTitle || 'catatan').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')
    const filename = `${safeTitle}.txt`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: `File ${filename} berhasil diunduh`, tone: 'success' })
  }

  // Keyboard shortcut Ctrl+S / Cmd+S & Escape inside Notepad
  useEffect(() => {
    if (!notepadNote) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSaveNotepad()
      } else if (e.key === 'Escape') {
        handleCloseNotepad()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [notepadNote, notepadTitle, notepadContent, notepadUsername, notepadPassword, notepadUrl, notepadCategory, notepadIsPinned])

  const handleOpenCreate = () => {
    setEditingNote(null)
    setTitle('')
    setCategory('password')
    setUsername('')
    setPassword('')
    setUrl('')
    setContent('')
    setTagsInput('')
    setIsPinned(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (n: NoteEntity) => {
    setEditingNote(n)
    setTitle(n.title)
    setCategory(n.category)
    setUsername(n.username || '')
    setPassword(n.password || '')
    setUrl(n.url || '')
    setContent(n.content || '')
    setTagsInput((n.tags || []).join(', '))
    setIsPinned(n.isPinned)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: 'Judul Wajib Diisi', tone: 'danger' })
      return
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const now = new Date().toISOString()

    try {
      if (editingNote) {
        await db.notes.update(editingNote.id, {
          title: title.trim(),
          category,
          username: username.trim() || undefined,
          password: password || undefined,
          url: url.trim() || undefined,
          content: content.trim() || undefined,
          tags,
          isPinned,
          updatedAt: now,
        })
        toast({ title: 'Catatan Diperbarui', tone: 'success' })
      } else {
        const newId = 'note-' + Math.random().toString(36).slice(2, 9)
        await db.notes.add({
          id: newId,
          title: title.trim(),
          category,
          username: username.trim() || undefined,
          password: password || undefined,
          url: url.trim() || undefined,
          content: content.trim() || undefined,
          tags,
          isPinned,
          createdAt: now,
          updatedAt: now,
        })
        toast({ title: 'Catatan Baru Disimpan', tone: 'success' })
      }
      setIsModalOpen(false)
      await loadNotes()
    } catch {
      toast({ title: 'Gagal Menyimpan', tone: 'danger' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await db.notes.delete(id)
      toast({ title: 'Catatan Dihapus', tone: 'info' })
      await loadNotes()
    } catch {
      toast({ title: 'Gagal Menghapus', tone: 'danger' })
    }
  }

  const handleTogglePin = async (n: NoteEntity) => {
    try {
      await db.notes.update(n.id, { isPinned: !n.isPinned, updatedAt: new Date().toISOString() })
      await loadNotes()
    } catch {
      // ignore
    }
  }

  // Filter Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (filterCat !== 'all' && n.category !== filterCat) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        n.title.toLowerCase().includes(q) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.username && n.username.toLowerCase().includes(q)) ||
        (n.url && n.url.toLowerCase().includes(q)) ||
        n.tags?.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [notes, filterCat, searchQuery])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catatan & Kredensial"
        description="Simpan password, token API, endpoint URL, dan konfigurasi rahasia. 100% tersimpan privat di database lokal browser."
        icon={<Lock className="size-5" />}
        color="var(--mod-productivity)"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={handleOpenCreate}>
            Tambah Catatan
          </Button>
        }
      />

      {/* Tabs Kategori & Filter Pencarian */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs<CategoryFilter>
          value={filterCat}
          onChange={setFilterCat}
          tabs={[
            { id: 'all', label: `Semua (${notes.length})` },
            { id: 'password', label: 'Password / Akun', icon: <KeyRound className="size-3.5" /> },
            { id: 'endpoint', label: 'Endpoint API', icon: <Server className="size-3.5" /> },
            { id: 'env', label: 'Variabel Env', icon: <Terminal className="size-3.5" /> },
            { id: 'note', label: 'Catatan Umum', icon: <FileText className="size-3.5" /> },
          ]}
        />

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, URL, tag..."
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Grid Kartu Catatan */}
      {filteredNotes.length === 0 ? (
        <Card className="p-12 text-center text-muted">
          <ShieldCheck className="mx-auto size-12 text-muted/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Tidak Ada Catatan Ditemukan</p>
          <p className="mt-1 text-xs text-muted">
            {searchQuery ? 'Coba kata kunci pencarian lain.' : 'Buat catatan atau simpan password pertama Anda.'}
          </p>
          {!searchQuery && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={handleOpenCreate}
              className="mt-4"
            >
              Tambah Baru
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredNotes.map((n) => {
            const isUnmasked = !!unmaskedIds[n.id]
            return (
              <Card
                key={n.id}
                onClick={() => handleOpenNotepad(n)}
                className={cn(
                  'group flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md select-none',
                  n.isPinned && 'border-primary/40 bg-gradient-to-b from-primary/5 to-surface'
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {n.category === 'password' && <KeyRound className="size-4 text-amber-500 shrink-0" />}
                        {n.category === 'endpoint' && <Server className="size-4 text-blue-500 shrink-0" />}
                        {n.category === 'env' && <Terminal className="size-4 text-emerald-500 shrink-0" />}
                        {n.category === 'note' && <FileText className="size-4 text-purple-500 shrink-0" />}
                        <h4 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors" title={n.title}>
                          {n.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-muted">
                        {n.category === 'password' && 'Kredensial Akun'}
                        {n.category === 'endpoint' && 'Endpoint & Webhook'}
                        {n.category === 'env' && 'Konfigurasi Environment'}
                        {n.category === 'note' && 'Memo Catatan'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenNotepad(n)}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-surface-2 transition-colors"
                        title="Buka di Notepad Lebar / Layar Penuh"
                      >
                        <Maximize2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePin(n)}
                        className={cn(
                          'p-1 rounded hover:bg-surface-2 transition-colors',
                          n.isPinned ? 'text-primary' : 'text-muted/60 hover:text-foreground'
                        )}
                        title={n.isPinned ? 'Lepas Pin' : 'Pin ke Atas'}
                      >
                        {n.isPinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(n)}
                        className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                        title="Edit Metadata"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1 rounded text-muted hover:text-danger hover:bg-surface-2 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-2 p-4 pt-1 text-xs">
                    {/* URL */}
                    {n.url && (
                      <div className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-1.5 truncate text-muted font-mono text-[11px] max-w-[200px]" title={n.url}>
                          <Globe className="size-3 shrink-0 text-primary" />
                          {n.url}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(n.url!, `url-${n.id}`, 'URL')}
                            className="p-1 rounded hover:text-foreground text-muted"
                            title="Salin URL"
                          >
                            {copiedKey === `url-${n.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                          <a
                            href={n.url.startsWith('http') ? n.url : `https://${n.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:text-foreground text-muted"
                            title="Buka Tautan"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Username */}
                    {n.username && (
                      <div className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-muted">User/Key:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-medium text-foreground">{n.username}</span>
                          <button
                            onClick={() => handleCopy(n.username!, `usr-${n.id}`, 'Username')}
                            className="p-1 rounded hover:text-foreground text-muted"
                            title="Salin Username"
                          >
                            {copiedKey === `usr-${n.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Password / Secret */}
                    {n.password && (
                      <div className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-muted">Secret:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold tracking-wider text-foreground">
                            {isUnmasked ? n.password : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => toggleMask(n.id)}
                            className="p-1 rounded hover:text-foreground text-muted"
                            title={isUnmasked ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {isUnmasked ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                          <button
                            onClick={() => handleCopy(n.password!, `pwd-${n.id}`, 'Password / Secret')}
                            className="p-1 rounded hover:text-foreground text-muted"
                            title="Salin Password"
                          >
                            {copiedKey === `pwd-${n.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content / Memo */}
                    {n.content && (
                      <div className="overflow-hidden rounded border border-border bg-surface-2/30 transition-colors group-hover:border-primary/40">
                        <div className="max-h-28 overflow-hidden p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted">
                          {n.content}
                        </div>
                        <div className="border-t border-border/50 bg-surface-2/40 px-2.5 py-1 text-center text-[10px] font-medium text-primary">
                          Klik kartu untuk membuka di Notepad ↗
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags & Footer */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-border/60 p-3 pt-2 text-[10px] text-muted">
                  <div className="flex flex-wrap gap-1">
                    {n.tags?.map((t) => (
                      <Badge key={t} tone="neutral" className="px-1.5 py-0 text-[10px]">
                        #{t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:underline">
                      <FileText className="size-3" />
                      Notepad
                    </span>
                    <span>
                      {new Date(n.updatedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Catatan */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edit Catatan / Kredensial' : 'Tambah Catatan / Kredensial Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Kategori Catatan">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'password' | 'endpoint' | 'env' | 'note')}
            >
              <option value="password">Password / Akun Login</option>
              <option value="endpoint">Endpoint API & Webhook</option>
              <option value="env">Variabel Lingkungan (.env)</option>
              <option value="note">Catatan Bebas / Memo</option>
            </Select>
          </Field>

          <Field label="Judul Catatan">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Akun AWS Prod / Token Telegram Bot"
              required
            />
          </Field>

          {(category === 'password' || category === 'endpoint') && (
            <Field label={category === 'password' ? 'URL Login / Website' : 'Target URL / Endpoint'}>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </Field>
          )}

          {(category === 'password' || category === 'endpoint') && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={category === 'password' ? 'Username / Email' : 'Key / Auth Type'}>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={category === 'password' ? 'user@domain.com' : 'Bearer / API-Key'}
                />
              </Field>

              <Field label={category === 'password' ? 'Password' : 'Token / Secret Key'}>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik rahasia..."
                />
              </Field>
            </div>
          )}

          <Field label={category === 'env' ? 'Isi Variabel .env' : 'Catatan Tambahan / Keterangan'}>
            <Textarea
              rows={category === 'env' ? 5 : 3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={category === 'env' ? 'KEY=value\nPORT=3000' : 'Deskripsi atau instruksi penggunaan...'}
              mono={category === 'env'}
            />
          </Field>

          <Field label="Label / Tags (Pisahkan dengan koma)">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="staging, rpa, database, work"
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="size-4 rounded accent-primary cursor-pointer"
              />
              <span>Pin di posisi paling atas</span>
            </label>

            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ===============================================================
          NOTEPAD WINDOW (RESIZABLE / FULLSCREEN EXPANDABLE EDITOR)
          =============================================================== */}
      {notepadNote && createPortal(
        <div
          className={cn(
            'fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-xs transition-all animate-in fade-in duration-150',
            notepadSize === 'fullscreen' ? 'p-0' : 'p-2.5 sm:p-5'
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseNotepad()
          }}
        >
          <div
            className={cn(
              'flex flex-col bg-surface border border-border shadow-2xl transition-all duration-200 overflow-hidden',
              notepadSize === 'fullscreen'
                ? 'w-screen h-dvh rounded-none'
                : notepadSize === 'large'
                  ? 'w-full max-w-5xl h-[92dvh] sm:h-[90vh] rounded-xl'
                  : 'w-full max-w-3xl h-[82dvh] sm:h-[78vh] rounded-xl'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-3 py-2 sm:px-4 sm:py-2.5 select-none">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-1 sm:mr-3">
                {notepadCategory === 'password' && <KeyRound className="size-4 text-amber-500 shrink-0" />}
                {notepadCategory === 'endpoint' && <Server className="size-4 text-blue-500 shrink-0" />}
                {notepadCategory === 'env' && <Terminal className="size-4 text-emerald-500 shrink-0" />}
                {notepadCategory === 'note' && <FileText className="size-4 text-purple-500 shrink-0" />}

                <input
                  type="text"
                  value={notepadTitle}
                  onChange={(e) => {
                    setNotepadTitle(e.target.value)
                    setNotepadIsDirty(true)
                  }}
                  placeholder="Judul Catatan..."
                  className="bg-transparent font-semibold text-sm sm:text-base text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 truncate min-w-0 flex-1"
                />

                <Badge tone="neutral" className="hidden md:inline-flex text-[11px] capitalize">
                  {notepadCategory}
                </Badge>

                {notepadIsDirty ? (
                  <Badge tone="warning" className="text-[10px] shrink-0">
                    Belum Disimpan
                  </Badge>
                ) : (
                  <Badge tone="success" className="text-[10px] shrink-0">
                    Tersimpan
                  </Badge>
                )}
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Size toggle: Compact, Lebar, Fullscreen */}
                <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs text-muted">
                  <button
                    onClick={() => setNotepadSize('normal')}
                    className={cn(
                      'hidden sm:inline-block px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                      notepadSize === 'normal' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground'
                    )}
                    title="Jendela Sedang (75vh)"
                  >
                    Sedang
                  </button>
                  <button
                    onClick={() => setNotepadSize('large')}
                    className={cn(
                      'hidden sm:inline-block px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                      notepadSize === 'large' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground'
                    )}
                    title="Jendela Lebar (5XL)"
                  >
                    Lebar
                  </button>
                  <button
                    onClick={() => setNotepadSize(notepadSize === 'fullscreen' ? 'large' : 'fullscreen')}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                      notepadSize === 'fullscreen' ? 'bg-primary text-white shadow-xs' : 'hover:text-foreground'
                    )}
                    title={notepadSize === 'fullscreen' ? 'Keluar Layar Penuh' : 'Layar Penuh (Full Screen)'}
                  >
                    {notepadSize === 'fullscreen' ? (
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
                  onClick={handleCloseNotepad}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger transition-colors ml-1 cursor-pointer"
                  title="Tutup Notepad (Esc)"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Credential Quick Bar (if URL, Username, or Password exist) */}
            {(notepadUrl || notepadUsername || notepadPassword) && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2/30 px-4 py-2 text-xs">
                {notepadUrl && (
                  <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2.5 py-1">
                    <Globe className="size-3.5 text-primary shrink-0" />
                    <span className="font-mono text-[11px] text-muted max-w-[220px] truncate" title={notepadUrl}>
                      {notepadUrl}
                    </span>
                    <button
                      onClick={() => handleCopy(notepadUrl, 'np-url', 'URL')}
                      className="p-0.5 text-muted hover:text-foreground"
                      title="Salin URL"
                    >
                      {copiedKey === 'np-url' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    </button>
                    <a
                      href={notepadUrl.startsWith('http') ? notepadUrl : `https://${notepadUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-0.5 text-muted hover:text-foreground"
                      title="Buka Website"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                )}

                {notepadUsername && (
                  <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2.5 py-1">
                    <span className="text-[11px] text-muted">User:</span>
                    <span className="font-mono font-medium text-[11px] text-foreground">{notepadUsername}</span>
                    <button
                      onClick={() => handleCopy(notepadUsername, 'np-user', 'Username')}
                      className="p-0.5 text-muted hover:text-foreground"
                      title="Salin Username"
                    >
                      {copiedKey === 'np-user' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}

                {notepadPassword && (
                  <div className="flex items-center gap-1.5 rounded bg-surface border border-border px-2.5 py-1">
                    <span className="text-[11px] text-muted">Secret:</span>
                    <span className="font-mono font-semibold tracking-wider text-[11px] text-foreground">
                      {isNotepadSecretVisible ? notepadPassword : '••••••••••••'}
                    </span>
                    <button
                      onClick={() => setIsNotepadSecretVisible(!isNotepadSecretVisible)}
                      className="p-0.5 text-muted hover:text-foreground"
                      title={isNotepadSecretVisible ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {isNotepadSecretVisible ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                    <button
                      onClick={() => handleCopy(notepadPassword, 'np-pass', 'Password')}
                      className="p-0.5 text-muted hover:text-foreground"
                      title="Salin Password"
                    >
                      {copiedKey === 'np-pass' ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2/20 px-3 py-2 text-xs sm:px-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Font Family Toggle */}
                <button
                  onClick={() => setNotepadFontFamily(notepadFontFamily === 'mono' ? 'sans' : 'mono')}
                  className={cn(
                    'rounded border border-border px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer',
                    notepadFontFamily === 'mono' ? 'bg-primary/10 text-primary border-primary/40' : 'bg-surface text-muted hover:text-foreground'
                  )}
                  title="Ganti Font (Monospace / Sans)"
                >
                  {notepadFontFamily === 'mono' ? 'Monospace (Code)' : 'Sans-Serif (Text)'}
                </button>

                {/* Font Size Selector */}
                <div className="flex items-center rounded border border-border bg-surface text-[11px]">
                  <button
                    onClick={() => setNotepadFontSize('sm')}
                    className={cn(
                      'px-2 py-1 rounded-l transition-colors cursor-pointer',
                      notepadFontSize === 'sm' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    )}
                    title="Font Kecil (12px)"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setNotepadFontSize('base')}
                    className={cn(
                      'px-2 py-1 transition-colors cursor-pointer',
                      notepadFontSize === 'base' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    )}
                    title="Font Standar (14px)"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setNotepadFontSize('lg')}
                    className={cn(
                      'px-2 py-1 rounded-r transition-colors cursor-pointer',
                      notepadFontSize === 'lg' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    )}
                    title="Font Besar (16px)"
                  >
                    A+
                  </button>
                </div>

                {/* Word Wrap Toggle */}
                <button
                  onClick={() => setNotepadWordWrap(!notepadWordWrap)}
                  className={cn(
                    'rounded border border-border px-2 py-1 text-[11px] transition-colors cursor-pointer',
                    notepadWordWrap ? 'bg-primary/10 text-primary border-primary/40' : 'bg-surface text-muted hover:text-foreground'
                  )}
                  title="Toggle Word Wrap"
                >
                  {notepadWordWrap ? 'Wrap: On' : 'Wrap: Off'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Button
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(notepadContent)
                    toast({ title: 'Seluruh teks catatan tersalin!', tone: 'success' })
                  }}
                >
                  <Copy className="mr-1 size-3" />
                  Salin
                </Button>
                <Button
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={handleDownloadNotepad}
                >
                  <Download className="mr-1 size-3" />
                  .txt
                </Button>
                <Button
                  variant="primary"
                  className="h-7 text-xs px-2.5 sm:px-3 shadow-xs"
                  onClick={handleSaveNotepad}
                >
                  <Save className="mr-1 size-3.5" />
                  Simpan
                </Button>
              </div>
            </div>

            {/* Main Textarea Canvas */}
            <div className="relative flex-1 bg-surface-2/10 overflow-hidden flex">
              <textarea
                value={notepadContent}
                onChange={(e) => {
                  setNotepadContent(e.target.value)
                  setNotepadIsDirty(true)
                }}
                placeholder="Tuliskan catatan panjang, kredensial, konfigurasi .env, endpoint API, atau dokumentasi di sini... (Gunakan Ctrl+S untuk menyimpan instan)"
                className={cn(
                  'w-full h-full p-4 sm:p-6 bg-transparent text-foreground resize-none focus:outline-hidden border-none overflow-y-auto leading-relaxed',
                  notepadFontFamily === 'mono' ? 'font-mono' : 'font-sans',
                  notepadFontSize === 'sm' ? 'text-xs' : notepadFontSize === 'lg' ? 'text-base' : 'text-sm',
                  notepadWordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                )}
                autoFocus
                spellCheck={false}
              />
            </div>

            {/* Notepad Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/50 px-3 py-1.5 text-[11px] text-muted select-none sm:px-4">
              <div className="flex items-center gap-3">
                <span>Baris: {notepadContent.split('\n').length}</span>
                <span>Kata: {notepadContent.trim() ? notepadContent.trim().split(/\s+/).length : 0}</span>
                <span>Karakter: {notepadContent.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block">Pintasan: <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Ctrl+S</kbd> Simpan · <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">Esc</kbd> Tutup</span>
                <span>Diperbarui: {new Date(notepadNote.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
