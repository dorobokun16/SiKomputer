import { AlertTriangle, CheckCircle2, Download, FileText, Info, Printer, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Select } from '@/components/ui/primitives'
import { Progress } from '@/components/ui/primitives'
import { Segmented, useToast } from '@/components/ui/overlays'
import { Dropzone, PageHeader } from '@/components/ui/blocks'
import { formatBytes, repairPdf, type PdfRepairMode, type PdfRepairResult } from '@/services/pdf.service'

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
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<PdfRepairMode>('rebuild')
  const [dpi, setDpi] = useState('200')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' })
  const [result, setResult] = useState<PdfRepairResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  // Kelola object URL hasil agar tidak bocor memori.
  useEffect(() => {
    if (!result) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(result.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [result])

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setProgress({ done: 0, total: 0, label: '' })
  }

  const onFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const run = async () => {
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

  const download = () => {
    if (!result || !url) return
    const a = document.createElement('a')
    a.href = url
    a.download = result.fileName
    a.click()
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="PDF Repair"
        description="Cetak ulang PDF untuk memperbaiki kerusakan struktur tanpa mengubah isi. Berguna saat upload ditolak (mis. Privy)."
        icon={<Printer className="size-5" />}
        color="var(--mod-dev)"
        actions={
          file && (
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={reset} disabled={busy}>
              Reset
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ============ KIRI: INPUT & OPSI ============ */}
        <div className="space-y-5">
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
                <Dropzone title="Tarik PDF ke sini atau klik untuk memilih" hint="Hanya berkas .pdf" accept="application/pdf,.pdf" onFile={onFile} compact />
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

              <Button variant="primary" icon={<Printer className="size-4" />} onClick={run} loading={busy} disabled={!file || busy} className="w-full">
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

        {/* ============ KANAN: HASIL ============ */}
        <div className="space-y-5">
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

                  <Button variant="primary" icon={<Download className="size-4" />} onClick={download} className="w-full">
                    Unduh {result.fileName}
                  </Button>

                  {url && <iframe title="Pratinjau hasil" src={url} className="h-[460px] w-full rounded-lg border border-border bg-white" />}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
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

