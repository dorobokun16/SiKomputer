import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Combine,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Info,
  Printer,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Input, Progress, Select } from '@/components/ui/primitives'
import { Segmented, useToast } from '@/components/ui/overlays'
import { Dropzone, PageHeader } from '@/components/ui/blocks'
import {
  formatBytes,
  inspectPdfFile,
  mergePdfs,
  repairPdf,
  splitPdf,
  type PdfMergeInputItem,
  type PdfRepairMode,
  type PdfRepairResult,
  type PdfSplitItem,
  type PdfSplitMode,
} from '@/services/pdf.service'
import { createZip, downloadBlob } from '@/lib/zip'
import { cn } from '@/lib/cn'

type PdfStudioTab = 'repair' | 'split' | 'merge'

const modeInfo: Record<PdfRepairMode, { title: string; desc: string }> = {
  rebuild: {
    title: 'Rebuild Struktur',
    desc: 'Semua halaman disalin ke PDF baru dengan struktur & tabel referensi ditulis ulang. Teks tetap bisa diseleksi dan ukuran file kecil. Coba mode ini lebih dulu.',
  },
  reprint: {
    title: 'Cetak Ulang',
    desc: 'Setiap halaman dirender seperti saat dicetak lalu disusun menjadi PDF baru (mirip Microsoft Print to PDF). Paling kompatibel untuk upload, namun teks menjadi gambar dan tidak bisa diseleksi.',
  },
}

export function PdfRepairPage() {
  const toast = useToast()
  const [studioTab, setStudioTab] = useState<PdfStudioTab>('repair')

  /* ================= 1. STATE PDF REPAIR ================= */
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<PdfRepairMode>('rebuild')
  const [dpi, setDpi] = useState('200')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' })
  const [result, setResult] = useState<PdfRepairResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!result) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(result.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [result])

  const resetRepair = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress({ done: 0, total: 0, label: '' })
  }

  const runRepair = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: 0, label: 'Membaca berkas…' })
    try {
      const res = await repairPdf(file, {
        mode,
        dpi: Number(dpi),
        quality: 0.92,
        onProgress: (done, total, label) => setProgress({ done, total, label }),
      })
      setResult(res)
      toast({ title: 'PDF berhasil dicetak ulang', tone: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memproses PDF'
      setError(msg)
      toast({ title: 'Gagal memproses PDF', description: msg, tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  /* ================= 2. STATE SPLIT PDF ================= */
  const [splitFile, setSplitFile] = useState<File | null>(null)
  const [splitPageCount, setSplitPageCount] = useState(0)
  const [splitMode, setSplitMode] = useState<PdfSplitMode>('split-ranges')
  const [splitRange, setSplitRange] = useState('1-2, 3-4')
  const [splitChunkSize, setSplitChunkSize] = useState(1)
  const [splitBusy, setSplitBusy] = useState(false)
  const [splitProgress, setSplitProgress] = useState({ done: 0, total: 0, label: '' })
  const [splitResults, setSplitResults] = useState<PdfSplitItem[]>([])
  const [splitError, setSplitError] = useState<string | null>(null)
  const [splitPreviewIdx, setSplitPreviewIdx] = useState<number>(0)
  const [splitPreviewUrl, setSplitPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const target = splitResults[splitPreviewIdx]
    if (!target) {
      setSplitPreviewUrl(null)
      return
    }
    const u = URL.createObjectURL(target.blob)
    setSplitPreviewUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [splitResults, splitPreviewIdx])

  const handleSelectSplitFile = async (f: File) => {
    setSplitError(null)
    setSplitResults([])
    try {
      const meta = await inspectPdfFile(f)
      setSplitFile(f)
      setSplitPageCount(meta.pageCount)
      setSplitRange(meta.pageCount > 1 ? `1-${Math.ceil(meta.pageCount / 2)}, ${Math.ceil(meta.pageCount / 2) + 1}-${meta.pageCount}` : '1')
    } catch (e) {
      setSplitFile(null)
      setSplitPageCount(0)
      setSplitError(e instanceof Error ? e.message : 'Gagal membaca PDF.')
    }
  }

  const runSplit = async () => {
    if (!splitFile) return
    setSplitBusy(true)
    setSplitError(null)
    setSplitResults([])
    setSplitProgress({ done: 0, total: 0, label: 'Memproses halaman…' })
    try {
      const items = await splitPdf(splitFile, {
        mode: splitMode,
        rangeInput: splitRange,
        chunkSize: splitChunkSize,
        onProgress: (done, total, label) => setSplitProgress({ done, total, label }),
      })
      setSplitResults(items)
      setSplitPreviewIdx(0)
      toast({ title: `Berhasil memisahkan menjadi ${items.length} berkas PDF`, tone: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal memisahkan PDF.'
      setSplitError(msg)
      toast({ title: 'Gagal Split PDF', description: msg, tone: 'danger' })
    } finally {
      setSplitBusy(false)
    }
  }

  const handleDownloadSplitZip = async () => {
    if (splitResults.length === 0) return
    const zipBlob = await createZip(splitResults.map((it) => ({ name: it.fileName, blob: it.blob })))
    const base = (splitFile?.name || 'split').replace(/\.pdf$/i, '')
    downloadBlob(zipBlob, `${base}-split.zip`)
    toast({ title: 'Arsip ZIP seluruh hasil split diunduh', tone: 'success' })
  }

  /* ================= 3. STATE MERGE PDF ================= */
  const [mergeItems, setMergeItems] = useState<PdfMergeInputItem[]>([])
  const [mergeOutName, setMergeOutName] = useState('dokumen-gabungan.pdf')
  const [mergeBusy, setMergeBusy] = useState(false)
  const [mergeProgress, setMergeProgress] = useState({ done: 0, total: 0, label: '' })
  const [mergeResult, setMergeResult] = useState<{
    blob: Blob
    fileName: string
    totalPages: number
    sizeBefore: number
    sizeAfter: number
  } | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergePreviewUrl, setMergePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!mergeResult) {
      setMergePreviewUrl(null)
      return
    }
    const u = URL.createObjectURL(mergeResult.blob)
    setMergePreviewUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [mergeResult])

  const handleAddMergeFiles = async (files: FileList | File[]) => {
    setMergeError(null)
    const incoming = Array.from(files)
    const added: PdfMergeInputItem[] = []
    for (const f of incoming) {
      try {
        const meta = await inspectPdfFile(f)
        added.push({
          id: 'mp-' + Math.random().toString(36).slice(2, 9),
          file: f,
          pageCount: meta.pageCount,
          rangeStr: '',
        })
      } catch (e) {
        toast({
          title: `Melewati ${f.name}`,
          description: e instanceof Error ? e.message : 'Bukan PDF valid',
          tone: 'warning',
        })
      }
    }
    if (added.length > 0) {
      setMergeItems((prev) => [...prev, ...added])
      setMergeResult(null)
    }
  }

  const moveMergeItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir
    if (nextIdx < 0 || nextIdx >= mergeItems.length) return
    setMergeItems((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(nextIdx, 0, item)
      return copy
    })
  }

  const runMerge = async () => {
    setMergeBusy(true)
    setMergeError(null)
    setMergeResult(null)
    try {
      const res = await mergePdfs(mergeItems, mergeOutName, (done, total, label) =>
        setMergeProgress({ done, total, label }),
      )
      setMergeResult(res)
      toast({ title: `${mergeItems.length} PDF berhasil digabung (${res.totalPages} halaman)`, tone: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menggabungkan PDF.'
      setMergeError(msg)
      toast({ title: 'Gagal Merge PDF', description: msg, tone: 'danger' })
    } finally {
      setMergeBusy(false)
    }
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0
  const splitPct = splitProgress.total ? Math.round((splitProgress.done / splitProgress.total) * 100) : 0
  const mergePct = mergeProgress.total ? Math.round((mergeProgress.done / mergeProgress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="PDF Studio"
        description="Perbaiki struktur PDF (PDF Repair), pisahkan halaman (Split PDF), dan gabungkan banyak dokumen (Merge PDF) 100% lokal di perangkat Anda."
        icon={<Printer className="size-5" />}
        color="var(--mod-dev)"
        actions={
          <div className="flex flex-wrap gap-2">
            {studioTab === 'repair' && file && (
              <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" />} onClick={resetRepair} disabled={busy}>
                Reset
              </Button>
            )}
            {studioTab === 'split' && splitFile && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="size-4" />}
                onClick={() => {
                  setSplitFile(null)
                  setSplitPageCount(0)
                  setSplitResults([])
                  setSplitError(null)
                }}
                disabled={splitBusy}
              >
                Reset
              </Button>
            )}
            {studioTab === 'merge' && mergeItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="size-4" />}
                onClick={() => {
                  setMergeItems([])
                  setMergeResult(null)
                  setMergeError(null)
                }}
                disabled={mergeBusy}
              >
                Bersihkan
              </Button>
            )}
          </div>
        }
      />

      {/* Submenu 3 Fitur PDF Studio */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'repair', label: 'PDF Repair', icon: Wrench },
            { id: 'split', label: 'Split PDF', icon: Scissors },
            { id: 'merge', label: 'Merge PDF', icon: Combine },
          ] as const
        ).map((t) => {
          const Icon = t.icon
          const active = studioTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setStudioTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap sm:text-sm cursor-pointer',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                  : 'border-border/70 bg-surface-2/40 text-muted hover:bg-surface-2 hover:text-text',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ================= TAB 1: PDF REPAIR ================= */}
      {studioTab === 'repair' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader title="1. Pilih PDF" subtitle="Berkas diproses di browser Anda, tidak diunggah ke mana pun." icon={<FileText className="size-4" />} />
              <div className="p-4 pt-0">
                {file ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted">{formatBytes(file.size)}</div>
                    </div>
                    <Badge tone="info">PDF</Badge>
                  </div>
                ) : (
                  <Dropzone
                    title="Tarik PDF ke sini atau klik untuk memilih"
                    hint="Hanya berkas .pdf"
                    accept="application/pdf,.pdf"
                    onFile={(f) => {
                      setFile(f)
                      setResult(null)
                      setError(null)
                    }}
                    compact
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="2. Metode Perbaikan" icon={<Wrench className="size-4" />} />
              <div className="space-y-4 p-4 pt-0">
                <Segmented
                  options={[
                    { id: 'rebuild', label: 'Rebuild Struktur' },
                    { id: 'reprint', label: 'Cetak Ulang' },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
                <p className="text-sm text-muted">{modeInfo[mode].desc}</p>

                {mode === 'reprint' && (
                  <Field label="Resolusi" hint="Makin tinggi makin tajam, tetapi ukuran file dan waktu proses bertambah.">
                    <Select value={dpi} onChange={(e) => setDpi(e.target.value)}>
                      <option value="150">150 DPI — ringan</option>
                      <option value="200">200 DPI — seimbang (disarankan)</option>
                      <option value="300">300 DPI — tajam</option>
                    </Select>
                  </Field>
                )}

                <Button variant="primary" icon={<Printer className="size-4" />} onClick={runRepair} loading={busy} disabled={!file || busy} className="w-full">
                  {busy ? 'Memproses…' : 'Cetak Ulang PDF'}
                </Button>

                {busy && (
                  <div className="space-y-1.5">
                    <Progress value={pct} />
                    <div className="text-xs text-muted">{progress.label}</div>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex gap-3 p-4 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p>
                    Jika hasil <b>Rebuild</b> masih ditolak, ulangi dengan <b>Cetak Ulang</b>.
                  </p>
                  <p>PDF bertanda tangan digital akan kehilangan tanda tangannya karena dokumen ditulis ulang (sama seperti Print to PDF).</p>
                  <p>PDF yang dikunci password tidak dapat diproses.</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader title="3. Hasil" icon={<ShieldCheck className="size-4" />} />
              <div className="space-y-4 p-4 pt-0">
                {error && (
                  <div className="flex gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                    <span>{error}</span>
                  </div>
                )}

                {!result && !error && (
                  <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
                    Hasil perbaikan akan tampil di sini setelah proses selesai.
                  </div>
                )}

                {result && (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Stat label="Halaman" value={String(result.pages)} />
                      <Stat label="Ukuran awal" value={formatBytes(result.sizeBefore)} />
                      <Stat label="Ukuran hasil" value={formatBytes(result.sizeAfter)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={result.verified ? 'success' : 'warning'}>
                        <CheckCircle2 className="size-3" /> {result.verified ? 'Terverifikasi dapat dibuka' : 'Belum terverifikasi'}
                      </Badge>
                      <Badge tone="neutral">{modeInfo[result.mode].title}</Badge>
                    </div>

                    {result.warnings.length > 0 && (
                      <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                        {result.warnings.map((w, i) => (
                          <li key={i} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      variant="primary"
                      icon={<Download className="size-4" />}
                      onClick={() => downloadBlob(result.blob, result.fileName)}
                      className="w-full"
                    >
                      Unduh {result.fileName}
                    </Button>

                    {url && <iframe title="Pratinjau hasil" src={url} className="h-[460px] w-full rounded-lg border border-border bg-white" />}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SPLIT PDF ================= */}
      {studioTab === 'split' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader title="1. Pilih Dokumen PDF" subtitle="Ketahui jumlah halaman secara instan & pisahkan sesuai kebutuhan" icon={<FileText className="size-4" />} />
              <div className="p-4 pt-0">
                {splitFile ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/50 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{splitFile.name}</div>
                      <div className="text-xs text-muted">{formatBytes(splitFile.size)}</div>
                    </div>
                    <Badge tone="primary">{splitPageCount} Halaman</Badge>
                  </div>
                ) : (
                  <Dropzone
                    title="Tarik PDF untuk dipisah atau klik di sini"
                    hint="Hanya berkas .pdf"
                    accept="application/pdf,.pdf"
                    onFile={handleSelectSplitFile}
                    compact
                  />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="2. Mode Pemisahan Halaman" icon={<Scissors className="size-4" />} />
              <div className="space-y-4 p-4 pt-0">
                <Field label="Strategi Split">
                  <Select value={splitMode} onChange={(e) => setSplitMode(e.target.value as PdfSplitMode)}>
                    <option value="split-ranges">Pisah per Rentang menjadi Banyak PDF (contoh: 1-2, 3-5)</option>
                    <option value="extract-single">Ekstrak Halaman Terpilih ke 1 PDF (contoh: 1-3, 5)</option>
                    <option value="every-n">Pisah Setiap N Halaman (contoh: per 1 atau 2 halaman)</option>
                    <option value="remove-pages">Hapus Halaman Tertentu (contoh: buang hal 2, 4)</option>
                  </Select>
                </Field>

                {splitMode === 'every-n' ? (
                  <Field label="Jumlah Halaman per Berkas (N)">
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, splitPageCount)}
                      value={splitChunkSize}
                      onChange={(e) => setSplitChunkSize(Math.max(1, Number(e.target.value) || 1))}
                      className="font-mono text-xs"
                    />
                  </Field>
                ) : (
                  <Field
                    label={splitMode === 'remove-pages' ? 'Halaman yang Dihapus' : 'Nomor / Rentang Halaman'}
                    hint={splitPageCount > 0 ? `Dokumen memiliki halaman 1 sampai ${splitPageCount}. Gunakan koma untuk memisahkan bagian.` : undefined}
                  >
                    <Input
                      value={splitRange}
                      onChange={(e) => setSplitRange(e.target.value)}
                      placeholder="1-2, 3-5"
                      className="font-mono text-xs"
                    />
                  </Field>
                )}

                <Button
                  variant="primary"
                  icon={<Scissors className="size-4" />}
                  onClick={runSplit}
                  loading={splitBusy}
                  disabled={!splitFile || splitBusy}
                  className="w-full"
                >
                  {splitBusy ? 'Memisahkan Halaman…' : 'Proses Split PDF'}
                </Button>

                {splitBusy && (
                  <div className="space-y-1.5">
                    <Progress value={splitPct} />
                    <div className="text-xs text-muted">{splitProgress.label}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader
                title="3. Hasil Split PDF"
                icon={<CheckCircle2 className="size-4" />}
                action={
                  splitResults.length > 1 && (
                    <Button size="sm" variant="primary" icon={<Archive className="size-3.5" />} onClick={handleDownloadSplitZip}>
                      Unduh Semua (.zip)
                    </Button>
                  )
                }
              />
              <div className="space-y-4 p-4 pt-0">
                {splitError && (
                  <div className="flex gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                    <span>{splitError}</span>
                  </div>
                )}

                {splitResults.length === 0 && !splitError ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
                    Hasil pemisahan halaman PDF akan muncul di sini.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {splitResults.map((item, idx) => (
                        <div
                          key={item.fileName}
                          className={cn(
                            'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs transition-colors',
                            splitPreviewIdx === idx ? 'border-primary/60 bg-primary/5' : 'border-border bg-surface-2/40',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-text">{item.fileName}</p>
                            <p className="text-muted">
                              {item.pages} halaman ({item.pageNumbers.join(', ')}) · {formatBytes(item.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant={splitPreviewIdx === idx ? 'primary' : 'ghost'}
                              icon={<Eye className="size-3.5" />}
                              onClick={() => setSplitPreviewIdx(idx)}
                            >
                              Pratinjau
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Download className="size-3.5" />}
                              onClick={() => downloadBlob(item.blob, item.fileName)}
                            >
                              Unduh
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {splitPreviewUrl && (
                      <iframe
                        title="Pratinjau hasil Split PDF"
                        src={splitPreviewUrl}
                        className="h-[380px] w-full rounded-lg border border-border bg-white"
                      />
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MERGE PDF ================= */}
      {studioTab === 'merge' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader
                title="1. Daftar Berkas PDF untuk Digabungkan"
                subtitle="Tambahkan 2 atau lebih file PDF, atur urutannya, lalu gabungkan"
                icon={<Combine className="size-4" />}
                action={
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:border-primary/50">
                    <FilePlus2 className="size-3.5 text-primary" />
                    Tambah PDF
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void handleAddMergeFiles(e.target.files)
                          e.target.value = ''
                        }
                      }}
                    />
                  </label>
                }
              />
              <div className="space-y-3 p-4 pt-0">
                {mergeItems.length === 0 ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (e.dataTransfer.files?.length) void handleAddMergeFiles(e.dataTransfer.files)
                    }}
                    className="rounded-lg border border-dashed border-border bg-surface-2/30 p-8 text-center"
                  >
                    <FilePlus2 className="mx-auto mb-2 size-8 text-muted" />
                    <p className="text-sm font-medium text-text">Tarik beberapa berkas PDF ke sini atau klik &quot;Tambah PDF&quot;</p>
                    <p className="mt-1 text-xs text-muted">Anda dapat memilih lebih dari 1 berkas sekaligus.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {mergeItems.map((it, idx) => (
                      <div key={it.id} className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/15 font-mono text-[11px] font-bold text-primary">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-text">{it.file.name}</p>
                              <p className="text-muted">
                                {it.pageCount} halaman · {formatBytes(it.file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveMergeItem(idx, -1)}
                              disabled={idx === 0}
                              className="rounded p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-30 cursor-pointer"
                              title="Geser ke Atas"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveMergeItem(idx, 1)}
                              disabled={idx === mergeItems.length - 1}
                              className="rounded p-1.5 text-muted hover:bg-surface hover:text-text disabled:opacity-30 cursor-pointer"
                              title="Geser ke Bawah"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMergeItems((prev) => prev.filter((x) => x.id !== it.id))}
                              className="rounded p-1.5 text-muted hover:bg-surface hover:text-danger cursor-pointer"
                              title="Hapus dari Daftar"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <Input
                          value={it.rangeStr}
                          onChange={(e) =>
                            setMergeItems((prev) =>
                              prev.map((x) => (x.id === it.id ? { ...x, rangeStr: e.target.value } : x)),
                            )
                          }
                          placeholder={`Opsional: halaman tertentu saja (kosong = semua 1–${it.pageCount}, contoh: 1-2)`}
                          className="font-mono text-[11px]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Field label="Nama File Output Gabungan">
                  <Input
                    value={mergeOutName}
                    onChange={(e) => setMergeOutName(e.target.value)}
                    placeholder="dokumen-gabungan.pdf"
                    className="font-mono text-xs"
                  />
                </Field>

                <Button
                  variant="primary"
                  icon={<Combine className="size-4" />}
                  onClick={runMerge}
                  loading={mergeBusy}
                  disabled={mergeItems.length < 2 || mergeBusy}
                  className="w-full"
                >
                  {mergeBusy ? 'Menggabungkan PDF…' : `Gabungkan ${mergeItems.length} PDF Sekarang`}
                </Button>

                {mergeBusy && (
                  <div className="space-y-1.5">
                    <Progress value={mergePct} />
                    <div className="text-xs text-muted">{mergeProgress.label}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-5 min-w-0">
            <Card>
              <CardHeader title="2. Hasil Gabungan (Merge PDF)" icon={<ShieldCheck className="size-4" />} />
              <div className="space-y-4 p-4 pt-0">
                {mergeError && (
                  <div className="flex gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                    <span>{mergeError}</span>
                  </div>
                )}

                {!mergeResult && !mergeError ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted">
                    Tambahkan minimal 2 PDF lalu klik &quot;Gabungkan PDF Sekarang&quot; untuk melihat hasil di sini.
                  </div>
                ) : mergeResult ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Stat label="Total Halaman" value={String(mergeResult.totalPages)} />
                      <Stat label="Ukuran Sumber" value={formatBytes(mergeResult.sizeBefore)} />
                      <Stat label="Ukuran Gabungan" value={formatBytes(mergeResult.sizeAfter)} />
                    </div>

                    <Button
                      variant="primary"
                      icon={<Download className="size-4" />}
                      onClick={() => downloadBlob(mergeResult.blob, mergeResult.fileName)}
                      className="w-full"
                    >
                      Unduh {mergeResult.fileName}
                    </Button>

                    {mergePreviewUrl && (
                      <iframe
                        title="Pratinjau PDF Gabungan"
                        src={mergePreviewUrl}
                        className="h-[440px] w-full rounded-lg border border-border bg-white"
                      />
                    )}
                  </>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-2 py-3">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
