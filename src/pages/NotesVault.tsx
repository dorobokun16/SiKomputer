import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Lock,
  Maximize2,
  Plus,
  Pin,
  PinOff,
  Search,
  Trash2,
  Edit2,
  FileText,
  Server,
  Terminal,
  ShieldCheck,
  Globe,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import {
  broadcastNotesSync,
  ensureNotesSeeded,
  subscribeNotesSync,
  useNotepadWindows,
} from '@/components/notes/NotepadContext'
import { cn } from '@/lib/cn'

type CategoryFilter = 'all' | 'password' | 'endpoint' | 'env' | 'note'

export function NotesVaultPage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { openNoteWindow, openFloatingNote, removeDeletedNoteWindows } = useNotepadWindows()

  const [notes, setNotes] = useState<NoteEntity[]>([])
  const [filterCat, setFilterCat] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({})

  // Modal Tambah / Edit Metadata State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteEntity | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'password' | 'endpoint' | 'env' | 'note'>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const loadNotes = useCallback(async () => {
    try {
      const list = await ensureNotesSeeded()
      list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      setNotes(list)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  // Real-time sinkronisasi antar-jendela (Window terpisah <-> Halaman Utama)
  useEffect(() => {
    const unsub = subscribeNotesSync(() => void loadNotes())
    const onFocus = () => void loadNotes()
    window.addEventListener('focus', onFocus)
    return () => {
      unsub()
      window.removeEventListener('focus', onFocus)
    }
  }, [loadNotes])

  // Kompatibilitas tautan lama ?openNote=<id>
  useEffect(() => {
    const targetId = searchParams.get('openNote')
    if (!targetId || notes.length === 0) return
    const target = notes.find((n) => n.id === targetId)
    if (target) {
      openFloatingNote(target, 'fullscreen')
      searchParams.delete('openNote')
      setSearchParams(searchParams, { replace: true })
    }
  }, [notes, openFloatingNote, searchParams, setSearchParams])

  const handleCopy = (text: string, key: string, label = 'Teks') => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({ title: `${label} Tersalin ke Clipboard`, tone: 'success' })
    window.setTimeout(() => setCopiedKey(null), 2000)
  }

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
      broadcastNotesSync()
      await loadNotes()
    } catch {
      toast({ title: 'Gagal Menyimpan', tone: 'danger' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await db.notes.delete(id)
      removeDeletedNoteWindows(id)
      broadcastNotesSync()
      toast({ title: 'Catatan Dihapus', tone: 'info' })
      await loadNotes()
    } catch {
      toast({ title: 'Gagal Menghapus', tone: 'danger' })
    }
  }

  const handleTogglePin = async (n: NoteEntity) => {
    try {
      await db.notes.update(n.id, { isPinned: !n.isPinned, updatedAt: new Date().toISOString() })
      broadcastNotesSync()
      await loadNotes()
    } catch {
      // ignore
    }
  }

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
        description="Simpan password, token API, endpoint URL, dan konfigurasi rahasia. Klik catatan untuk membukanya di window baru yang terpisah sehingga Anda bebas mengakses fitur lain secara bersamaan."
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
                onClick={() => openNoteWindow(n, 'popup')}
                className={cn(
                  'group flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md select-none',
                  n.isPinned && 'border-primary/40 bg-gradient-to-b from-primary/5 to-surface',
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
                        <h4
                          className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors"
                          title={n.title}
                        >
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
                        type="button"
                        onClick={() => openNoteWindow(n, 'popup')}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Buka di Window Baru (Terpisah)"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openNoteWindow(n, 'floating')}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Buka Jendela Mengambang di Aplikasi (Tetap Muncul Saat Pindah Menu)"
                      >
                        <Maximize2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleTogglePin(n)}
                        className={cn(
                          'p-1 rounded hover:bg-surface-2 transition-colors cursor-pointer',
                          n.isPinned ? 'text-primary' : 'text-muted/60 hover:text-foreground',
                        )}
                        title={n.isPinned ? 'Lepas Pin' : 'Pin ke Atas'}
                      >
                        {n.isPinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(n)}
                        className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Edit Metadata"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(n.id)}
                        className="p-1 rounded text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-2 p-4 pt-1 text-xs">
                    {n.url && (
                      <div
                        className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className="flex items-center gap-1.5 truncate text-muted font-mono text-[11px] max-w-[200px]"
                          title={n.url}
                        >
                          <Globe className="size-3 shrink-0 text-primary" />
                          {n.url}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(n.url!, `url-${n.id}`, 'URL')}
                            className="p-1 rounded hover:text-foreground text-muted cursor-pointer"
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

                    {n.username && (
                      <div
                        className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-muted">User/Key:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-medium text-foreground">{n.username}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(n.username!, `usr-${n.id}`, 'Username')}
                            className="p-1 rounded hover:text-foreground text-muted cursor-pointer"
                            title="Salin Username"
                          >
                            {copiedKey === `usr-${n.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {n.password && (
                      <div
                        className="flex items-center justify-between rounded border border-border bg-surface-2/40 px-2.5 py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-muted">Secret:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold tracking-wider text-foreground">
                            {isUnmasked ? n.password : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleMask(n.id)}
                            className="p-1 rounded hover:text-foreground text-muted cursor-pointer"
                            title={isUnmasked ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {isUnmasked ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(n.password!, `pwd-${n.id}`, 'Password / Secret')}
                            className="p-1 rounded hover:text-foreground text-muted cursor-pointer"
                            title="Salin Password"
                          >
                            {copiedKey === `pwd-${n.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {n.content && (
                      <div className="overflow-hidden rounded border border-border bg-surface-2/30 transition-colors group-hover:border-primary/40">
                        <div className="max-h-28 overflow-hidden p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted">
                          {n.content}
                        </div>
                        <div className="border-t border-border/50 bg-surface-2/40 px-2.5 py-1 text-center text-[10px] font-medium text-primary">
                          Klik kartu untuk membuka di Window Baru ↗
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
                      <ExternalLink className="size-3" />
                      Window Baru
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

      {/* Modal Tambah / Edit Metadata Catatan */}
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
              <option value="endpoint">Endpoint API &amp; Webhook</option>
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
    </div>
  )
}
