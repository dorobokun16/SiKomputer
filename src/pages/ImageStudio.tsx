import {
  AlertTriangle,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Images,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge, Button, Card, CardHeader, Chip, Field, Input, Progress, Select, Switch } from '@/components/ui/primitives'
import { Segmented, useToast } from '@/components/ui/overlays'
import { PageHeader } from '@/components/ui/blocks'
import { cn } from '@/lib/cn'
import { createZip, downloadBlob } from '@/lib/zip'
import {
  ACCEPTED_IMAGES,
  combineImagesToPdf,
  computeSize,
  defaultImageOptions,
  formatBytes,
  getImageInfo,
  outputName,
  processImage,
  resolveMime,
  type ImageOptions,
  type ImageResult,
  type OutFormat,
  type ResizeMode,
} from '@/services/image.service'

type Item = { id: string; file: File; url: string; width: number; height: number }
type Stored = ImageResult & { url: string; key: string }

const presets: { label: string; desc: string; opts: Partial<ImageOptions> }[] = [
  { label: 'Kompres Web', desc: 'JPEG 80%, maks 1920px', opts: { format: 'image/jpeg', quality: 0.8, resizeMode: 'fit', maxW: 1920, maxH: 1920, targetKB: 0, sharpen: 0 } },
  { label: 'Upload < 500 KB', desc: 'Cari kualitas terbaik di bawah 500 KB', opts: { format: 'image/jpeg', quality: 0.92, targetKB: 500, resizeMode: 'fit', maxW: 2560, maxH: 2560, sharpen: 0 } },
  { label: 'Upload < 200 KB', desc: 'Untuk formulir dengan batas ketat', opts: { format: 'image/jpeg', quality: 0.9, targetKB: 200, resizeMode: 'fit', maxW: 1600, maxH: 1600, sharpen: 0 } },
  { label: 'Upscale 2×', desc: 'Perbesar 200% + penajaman', opts: { resizeMode: 'scale', scale: 200, sharpen: 35, quality: 0.95, targetKB: 0 } },
  { label: 'Upscale 4×', desc: 'Perbesar 400% + penajaman', opts: { resizeMode: 'scale', scale: 400, sharpen: 45, quality: 0.95, targetKB: 0 } },
  { label: 'Ke WebP', desc: 'Format modern, ukuran kecil', opts: { format: 'image/webp', quality: 0.85, targetKB: 0 } },
  { label: 'Ke PDF', desc: 'Konversi gambar menjadi berkas dokumen PDF', opts: { format: 'application/pdf', quality: 0.9, targetKB: 0 } },
]

const optsKey = (o: ImageOptions) => JSON.stringify(o)
const uid = () => Math.random().toString(36).slice(2, 10)

export function ImageStudioPage() {
  const toast = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [opts, setOpts] = useState<ImageOptions>(defaultImageOptions)
  const [results, setResults] = useState<Record<string, Stored>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const runId = useRef(0)

  const key = useMemo(() => optsKey(opts), [opts])
  const selected = items.find((i) => i.id === selectedId) ?? null
  const result = selected ? results[selected.id] : undefined
  const fresh = result?.key === key ? result : undefined
  const set = <K extends keyof ImageOptions>(k: K, v: ImageOptions[K]) => setOpts((o) => ({ ...o, [k]: v }))

  // Bersihkan semua object URL saat halaman ditinggalkan
  const urlsRef = useRef({ items, results })
  urlsRef.current = { items, results }
  useEffect(
    () => () => {
      urlsRef.current.items.forEach((i) => URL.revokeObjectURL(i.url))
      Object.values(urlsRef.current.results).forEach((r) => URL.revokeObjectURL(r.url))
    },
    [],
  )

  const storeResult = (id: string, r: ImageResult, k: string): Stored => {
    const previewToUrl = r.previewBlob || r.blob
    const stored = { ...r, url: URL.createObjectURL(previewToUrl), key: k }
    setResults((prev) => {
      if (prev[id]) URL.revokeObjectURL(prev[id].url)
      return { ...prev, [id]: stored }
    })
    return stored
  }

  // Pratinjau langsung untuk gambar terpilih (debounce)
  useEffect(() => {
    if (!selected || results[selected.id]?.key === key) return
    const my = ++runId.current
    const t = setTimeout(async () => {
      setProcessing(true)
      try {
        const r = await processImage(selected.file, opts)
        if (my !== runId.current) return
        storeResult(selected.id, r, key)
        setErrors((e) => ({ ...e, [selected.id]: '' }))
      } catch (e) {
        if (my === runId.current) setErrors((er) => ({ ...er, [selected.id]: e instanceof Error ? e.message : 'Gagal memproses' }))
      } finally {
        if (my === runId.current) setProcessing(false)
      }
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, key])

  const addFiles = async (list: FileList | File[]) => {
    const files = [...list].filter((f) => f.type.startsWith('image/'))
    if (!files.length) {
      toast({ title: 'Tidak ada file gambar', description: 'Pilih file PNG, JPG, WebP, GIF, BMP, AVIF, atau SVG.', tone: 'warning' })
      return
    }
    const added: Item[] = []
    for (const file of files) {
      try {
        const info = await getImageInfo(file)
        added.push({ id: uid(), file, url: URL.createObjectURL(file), ...info })
      } catch (e) {
        toast({ title: 'Gagal membaca gambar', description: e instanceof Error ? e.message : file.name, tone: 'danger' })
      }
    }
    if (!added.length) return
    setItems((prev) => [...prev, ...added])
    setSelectedId((cur) => cur ?? added[0].id)
  }

  const removeItem = (id: string) => {
    const it = items.find((i) => i.id === id)
    if (it) URL.revokeObjectURL(it.url)
    if (results[id]) URL.revokeObjectURL(results[id].url)
    setResults(({ [id]: _, ...rest }) => rest)
    const next = items.filter((i) => i.id !== id)
    setItems(next)
    if (selectedId === id) setSelectedId(next[0]?.id ?? null)
  }

  const clearAll = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url))
    Object.values(results).forEach((r) => URL.revokeObjectURL(r.url))
    setItems([])
    setResults({})
    setErrors({})
    setSelectedId(null)
  }

  const ensureResult = async (it: Item): Promise<Stored> => {
    const r = results[it.id]
    if (r?.key === key) return r
    return storeResult(it.id, await processImage(it.file, opts), key)
  }

  const downloadOne = async () => {
    if (!selected) return
    try {
      const r = await ensureResult(selected)
      downloadBlob(r.blob, outputName(selected.file.name, r.mime))
    } catch (e) {
      toast({ title: 'Gagal mengunduh', description: e instanceof Error ? e.message : '', tone: 'danger' })
    }
  }

  const downloadAll = async () => {
    setBatch({ done: 0, total: items.length })
    const out: { name: string; blob: Blob }[] = []
    let failed = 0
    for (let i = 0; i < items.length; i++) {
      try {
        const r = await ensureResult(items[i])
        out.push({ name: outputName(items[i].file.name, r.mime), blob: r.blob })
      } catch {
        failed++
      }
      setBatch({ done: i + 1, total: items.length })
    }
    if (out.length) downloadBlob(await createZip(out), `image-studio-${new Date().toISOString().slice(0, 10)}.zip`)
    setBatch(null)
    toast({
      title: `${out.length} gambar diproses`,
      description: failed ? `${failed} gambar gagal diproses.` : 'Arsip ZIP diunduh.',
      tone: failed ? 'warning' : 'success',
    })
  }

  const downloadMergedPdf = async () => {
    setBatch({ done: 0, total: items.length })
    try {
      const pdfBlob = await combineImagesToPdf(
        items.map((it) => ({ name: it.file.name, file: it.file, options: opts }))
      )
      downloadBlob(pdfBlob, `koleksi-gambar-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast({
        title: 'PDF Multi-Halaman Berhasil Dibuat',
        description: `${items.length} gambar digabungkan ke 1 dokumen PDF.`,
        tone: 'success',
      })
    } catch (e) {
      toast({
        title: 'Gagal membuat dokumen PDF',
        description: e instanceof Error ? e.message : '',
        tone: 'danger',
      })
    } finally {
      setBatch(null)
    }
  }

  const totals = useMemo(() => {
    const done = items.map((i) => results[i.id]).filter((r): r is Stored => !!r && r.key === key)
    const before = items.filter((i) => results[i.id]?.key === key).reduce((s, i) => s + i.file.size, 0)
    const after = done.reduce((s, r) => s + r.size, 0)
    return { count: done.length, before, after }
  }, [items, results, key])

  const target = selected ? computeSize(selected.width, selected.height, opts) : null
  const isUpscale = !!(selected && target && target.w * target.h > selected.width * selected.height)
  const outMime = selected ? resolveMime(selected.file, opts.format) : opts.format
  const lossy = outMime !== 'image/png' && outMime !== 'original'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Image Studio"
        description="Kompres, ubah resolusi, konversi format, putar, dan sesuaikan warna gambar. Semua diproses lokal di browser."
        icon={<Images className="size-5" />}
        color="var(--mod-dev)"
        actions={
          items.length > 0 && (
            <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={clearAll}>
              Hapus semua
            </Button>
          )
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGES}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {items.length === 0 ? (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-20 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/60',
          )}
        >
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UploadCloud className="size-7" />
          </span>
          <span className="text-base font-medium">Tarik gambar ke sini atau klik untuk memilih</span>
          <span className="mt-1 text-xs text-muted">Bisa banyak sekaligus · PNG, JPG, WebP, GIF, BMP, AVIF, SVG · tidak diunggah ke server</span>
        </label>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* ================= PENGATURAN ================= */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Preset Cepat" icon={<Sparkles className="size-4" />} />
              <div className="flex flex-wrap gap-2 p-4 pt-0">
                {presets.map((p) => (
                  <Chip key={p.label} title={p.desc} onClick={() => setOpts({ ...defaultImageOptions, ...p.opts })}>
                    {p.label}
                  </Chip>
                ))}
                <Chip onClick={() => setOpts(defaultImageOptions)}>
                  <RotateCcw className="size-3" /> Reset
                </Chip>
              </div>
            </Card>

            <Section title="Kompres & Format" icon={<Minimize2 className="size-4" />}>
              <Field label="Format output">
                <Select value={opts.format} onChange={(e) => set('format', e.target.value as OutFormat)}>
                  <option value="original">Sama seperti asli</option>
                  <option value="image/jpeg">JPEG — foto, ukuran kecil</option>
                  <option value="image/webp">WebP — paling efisien</option>
                  <option value="image/png">PNG — lossless, transparan</option>
                  <option value="application/pdf">PDF — Dokumen PDF (.pdf)</option>
                </Select>
              </Field>
              {lossy ? (
                <>
                  <Slider
                    label="Kualitas"
                    value={Math.round(opts.quality * 100)}
                    min={10}
                    max={100}
                    suffix="%"
                    onChange={(v) => set('quality', v / 100)}
                  />
                  <Field label="Target ukuran maksimum (KB)" hint="Kosongkan / 0 untuk nonaktif. Kualitas dicari otomatis agar di bawah target.">
                    <Input type="number" min={0} value={opts.targetKB || ''} placeholder="mis. 500" onChange={(e) => set('targetKB', Math.max(0, Number(e.target.value) || 0))} />
                  </Field>
                  {outMime === 'image/jpeg' && (
                    <Field label="Latar pengganti transparansi">
                      <div className="flex items-center gap-2">
                        <input type="color" value={opts.background} onChange={(e) => set('background', e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
                        <span className="font-mono text-xs text-muted">{opts.background}</span>
                      </div>
                    </Field>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted">PNG bersifat lossless. Untuk memperkecil ukuran, ubah resolusi atau pilih JPEG/WebP.</p>
              )}
            </Section>

            <Section title="Resolusi" icon={<Maximize2 className="size-4" />}>
              <Segmented
                size="sm"
                options={[
                  { id: 'none', label: 'Asli' },
                  { id: 'scale', label: 'Persen' },
                  { id: 'fit', label: 'Maks' },
                  { id: 'exact', label: 'Piksel' },
                ]}
                value={opts.resizeMode}
                onChange={(v: ResizeMode) => set('resizeMode', v)}
              />
              {opts.resizeMode === 'scale' && (
                <>
                  <Slider label="Skala" value={opts.scale} min={10} max={400} step={5} suffix="%" onChange={(v) => set('scale', v)} />
                  <div className="flex flex-wrap gap-1.5">
                    {[25, 50, 75, 150, 200, 300, 400].map((s) => (
                      <Chip key={s} active={opts.scale === s} onClick={() => set('scale', s)}>
                        {s}%
                      </Chip>
                    ))}
                  </div>
                </>
              )}
              {opts.resizeMode === 'fit' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lebar maks (px)">
                    <Input type="number" min={1} value={opts.maxW} onChange={(e) => set('maxW', Number(e.target.value) || 0)} />
                  </Field>
                  <Field label="Tinggi maks (px)">
                    <Input type="number" min={1} value={opts.maxH} onChange={(e) => set('maxH', Number(e.target.value) || 0)} />
                  </Field>
                  <p className="col-span-2 text-xs text-muted">Hanya memperkecil; gambar yang sudah lebih kecil tidak diubah.</p>
                </div>
              )}
              {opts.resizeMode === 'exact' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Lebar (px)">
                      <Input type="number" min={1} value={opts.width || ''} onChange={(e) => set('width', Number(e.target.value) || 0)} />
                    </Field>
                    <Field label="Tinggi (px)">
                      <Input type="number" min={1} value={opts.height || ''} disabled={opts.keepAspect && opts.width > 0} onChange={(e) => set('height', Number(e.target.value) || 0)} />
                    </Field>
                  </div>
                  <Switch checked={opts.keepAspect} onChange={(v) => set('keepAspect', v)} label="Kunci rasio aspek (pakai lebar)" />
                </div>
              )}
              <Slider
                label="Penajaman"
                value={opts.sharpen}
                min={0}
                max={100}
                onChange={(v) => set('sharpen', v)}
                hint={isUpscale && opts.sharpen === 0 ? 'Disarankan 30–45 saat memperbesar resolusi.' : undefined}
              />
            </Section>

            <Section title="Putar & Warna" icon={<Palette className="size-4" />}>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={<RotateCcw className="size-4" />} onClick={() => set('rotate', (((opts.rotate + 270) % 360) as ImageOptions['rotate']))}>
                  Kiri
                </Button>
                <Button size="sm" icon={<RotateCw className="size-4" />} onClick={() => set('rotate', (((opts.rotate + 90) % 360) as ImageOptions['rotate']))}>
                  Kanan
                </Button>
                <Button size="sm" variant={opts.flipH ? 'primary' : 'secondary'} icon={<FlipHorizontal2 className="size-4" />} onClick={() => set('flipH', !opts.flipH)}>
                  Flip H
                </Button>
                <Button size="sm" variant={opts.flipV ? 'primary' : 'secondary'} icon={<FlipVertical2 className="size-4" />} onClick={() => set('flipV', !opts.flipV)}>
                  Flip V
                </Button>
              </div>
              <Slider label="Kecerahan" value={opts.brightness} min={0} max={200} suffix="%" onChange={(v) => set('brightness', v)} />
              <Slider label="Kontras" value={opts.contrast} min={0} max={200} suffix="%" onChange={(v) => set('contrast', v)} />
              <Slider label="Saturasi" value={opts.saturate} min={0} max={200} suffix="%" onChange={(v) => set('saturate', v)} />
              <Switch checked={opts.grayscale} onChange={(v) => set('grayscale', v)} label="Hitam putih" />
            </Section>
          </div>

          {/* ================= PRATINJAU & HASIL ================= */}
          <div className="min-w-0 space-y-4">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{selected?.file.name}</div>
                  <div className="text-xs text-muted">Geser garis pada gambar untuk membandingkan asli dan hasil.</div>
                </div>
                <div className="flex items-center gap-2">
                  {processing && <Badge tone="info">Memproses…</Badge>}
                  <Button variant="primary" icon={<Download className="size-4" />} onClick={downloadOne} disabled={!selected || !!batch}>
                    Unduh
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {selected && <Compare before={selected.url} after={fresh?.url ?? result?.url ?? selected.url} stale={!fresh} />}

                {selected && errors[selected.id] && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" /> {errors[selected.id]}
                  </div>
                )}

                {selected && (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="Resolusi asli" value={`${selected.width}×${selected.height}`} />
                    <Stat label="Resolusi hasil" value={fresh ? `${fresh.width}×${fresh.height}` : target ? `${target.w}×${target.h}` : '—'} />
                    <Stat label="Ukuran asli" value={formatBytes(selected.file.size)} />
                    <Stat
                      label="Ukuran hasil"
                      value={fresh ? formatBytes(fresh.size) : '—'}
                      extra={fresh && <SizeDelta before={selected.file.size} after={fresh.size} />}
                    />
                  </div>
                )}

                {fresh && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="neutral">{fresh.mime.replace('image/', '').toUpperCase()}</Badge>
                    {fresh.quality !== null && <Badge tone="neutral">Kualitas {Math.round(fresh.quality * 100)}%</Badge>}
                    <Badge tone="success">Metadata EXIF/GPS dihapus</Badge>
                  </div>
                )}

                {fresh && fresh.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                    {fresh.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" /> {w}
                      </li>
                    ))}
                  </ul>
                )}
                {isUpscale && (
                  <p className="mt-3 text-xs text-muted">
                    Perbesaran memakai interpolasi berkualitas tinggi + penajaman. Detail yang tidak ada di gambar asli tidak bisa diciptakan (bukan AI super-resolution).
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="text-sm font-medium">
                  Daftar gambar <span className="text-muted">({items.length})</span>
                  {totals.count > 1 && (
                    <span className="ml-2 text-xs text-muted">
                      {totals.count} diproses: {formatBytes(totals.before)} → {formatBytes(totals.after)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" icon={<ImagePlus className="size-4" />} onClick={() => inputRef.current?.click()}>
                    Tambah
                  </Button>
                  {items.length > 1 && opts.format === 'application/pdf' && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Download className="size-4" />}
                      onClick={downloadMergedPdf}
                      loading={!!batch}
                      disabled={!!batch}
                    >
                      Gabung 1 PDF ({items.length} Hal)
                    </Button>
                  )}
                  {items.length > 1 && (
                    <Button
                      size="sm"
                      variant={opts.format === 'application/pdf' ? 'secondary' : 'primary'}
                      icon={<Download className="size-4" />}
                      onClick={downloadAll}
                      loading={!!batch}
                      disabled={!!batch}
                    >
                      {opts.format === 'application/pdf' ? 'Unduh PDF Satuan (ZIP)' : 'Proses & Unduh Semua (ZIP)'}
                    </Button>
                  )}
                </div>
              </div>
              {batch && (
                <div className="space-y-1 px-4 pt-3">
                  <Progress value={(batch.done / batch.total) * 100} />
                  <div className="text-xs text-muted">
                    Memproses {batch.done}/{batch.total}…
                  </div>
                </div>
              )}
              <div
                className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  addFiles(e.dataTransfer.files)
                }}
              >
                {items.map((it) => {
                  const r = results[it.id]
                  const ok = r?.key === key
                  return (
                    <div
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        'group relative cursor-pointer overflow-hidden rounded-lg border-2 bg-surface-2',
                        it.id === selectedId ? 'border-primary' : 'border-transparent hover:border-border',
                      )}
                    >
                      <img src={it.url} alt={it.file.name} className="aspect-square w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-1.5 py-1 text-[10px] text-white">
                        <div className="truncate">{it.file.name}</div>
                        <div className="opacity-80">{ok ? `${formatBytes(it.file.size)} → ${formatBytes(r.size)}` : formatBytes(it.file.size)}</div>
                      </div>
                      <button
                        type="button"
                        aria-label="Hapus"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeItem(it.id)
                        }}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 text-white group-hover:block"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <div className="space-y-4 p-4 pt-0">{children}</div>
    </Card>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  hint,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  hint?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-[var(--primary)]"
      />
      {hint && <p className="mt-1 text-xs text-warning">{hint}</p>}
    </div>
  )
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2 font-mono text-sm font-semibold">
        {value} {extra}
      </div>
    </div>
  )
}

function SizeDelta({ before, after }: { before: number; after: number }) {
  const pct = Math.round(((after - before) / before) * 100)
  return <span className={cn('text-xs font-medium', pct <= 0 ? 'text-success' : 'text-warning')}>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
}

const checker = {
  backgroundColor: '#fff',
  backgroundImage: 'conic-gradient(#e5e7eb 25%, transparent 0 50%, #e5e7eb 0 75%, transparent 0)',
  backgroundSize: '20px 20px',
}

function Compare({ before, after, stale }: { before: string; after: string; stale: boolean }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative h-[440px] select-none overflow-hidden rounded-lg border border-border" style={checker}>
      <img src={after} alt="Hasil" className={cn('absolute inset-0 size-full object-contain transition-opacity', stale && 'opacity-60')} />
      <img src={before} alt="Asli" className="absolute inset-0 size-full object-contain" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary shadow-[0_0_0_1px_rgba(0,0,0,.3)]" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow">
          ⇆
        </div>
      </div>
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/65 px-2 py-0.5 text-[11px] text-white">Asli</span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/65 px-2 py-0.5 text-[11px] text-white">Hasil</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Geser perbandingan"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

