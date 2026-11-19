/**
 * PDF Repair Service — 100% lokal di browser (tidak ada upload ke server).
 *
 * Dua strategi "cetak ulang" PDF tanpa mengubah isi dokumen:
 *  1. `rebuild`  : salin semua halaman ke dokumen PDF baru (struktur, xref, & objek ditulis ulang).
 *                  Teks tetap vektor / bisa diseleksi. Cepat & ukuran kecil.
 *  2. `reprint`  : render tiap halaman ke gambar resolusi tinggi lalu susun menjadi PDF baru.
 *                  Mirip "Microsoft Print to PDF" — paling kompatibel, tapi teks menjadi gambar.
 */

export type PdfRepairMode = 'rebuild' | 'reprint'

export type PdfRepairOptions = {
  mode: PdfRepairMode
  /** Hanya untuk mode `reprint`. 150 = ringan, 200 = seimbang, 300 = tajam. */
  dpi?: number
  /** Kualitas JPEG 0.5 - 1 (mode `reprint`). */
  quality?: number
  onProgress?: (done: number, total: number, label: string) => void
}

export type PdfRepairResult = {
  blob: Blob
  fileName: string
  mode: PdfRepairMode
  pages: number
  sizeBefore: number
  sizeAfter: number
  /** Jumlah halaman hasil terbaca ulang & sama dengan sumber. */
  verified: boolean
  warnings: string[]
}

const MAX_PIXELS_PER_PAGE = 36_000_000 // batas aman memori canvas (~6000 x 6000)

/** Loader lazy agar library PDF tidak membebani bundle utama. */
async function loadPdfJs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function outputName(original: string): string {
  const base = original.replace(/\.pdf$/i, '')
  return `${base}-fixed.pdf`
}

/** Pastikan berkas benar-benar PDF (header `%PDF-` boleh terletak di 1KB pertama). */
function looksLikePdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  return head.includes('%PDF-')
}

function friendlyError(e: unknown): Error {
  const name = (e as { name?: string })?.name
  const msg = e instanceof Error ? e.message : String(e)
  if (name === 'PasswordException' || /encrypted|password/i.test(msg)) {
    return new Error('PDF dilindungi password / terenkripsi. Buka proteksinya terlebih dahulu, lalu coba lagi.')
  }
  if (name === 'InvalidPDFException' || /invalid pdf|failed to parse|no pdf header/i.test(msg)) {
    return new Error('Struktur PDF terlalu rusak untuk dibaca. Coba mode "Cetak Ulang" bila belum.')
  }
  return new Error(msg || 'Gagal memproses PDF.')
}

/** Baca ulang hasil dengan pdf.js untuk memastikan PDF valid & jumlah halaman sama. */
async function countPages(bytes: Uint8Array): Promise<number> {
  const pdfjs = await loadPdfJs()
  const task = pdfjs.getDocument({ data: bytes.slice() })
  try {
    const doc = await task.promise
    const n = doc.numPages
    return n
  } finally {
    await task.destroy()
  }
}

async function rebuild(
  bytes: Uint8Array,
  opts: PdfRepairOptions,
  warnings: string[],
): Promise<{ out: Uint8Array; pages: number }> {
  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(bytes, { throwOnInvalidObject: false, updateMetadata: false })
  const total = src.getPageCount()
  const dst = await PDFDocument.create()

  // Salin per halaman agar progress terlihat & satu halaman rusak tidak menggagalkan semuanya.
  let copied = 0
  for (let i = 0; i < total; i++) {
    try {
      const [page] = await dst.copyPages(src, [i])
      dst.addPage(page)
      copied++
    } catch {
      warnings.push(`Halaman ${i + 1} gagal disalin (objek rusak). Gunakan mode "Cetak Ulang" untuk dokumen ini.`)
    }
    opts.onProgress?.(i + 1, total, `Menyalin halaman ${i + 1}/${total}`)
  }
  if (copied === 0) throw new Error('Tidak ada halaman yang dapat disalin. Gunakan mode "Cetak Ulang".')

  // Pertahankan metadata dasar agar identitas dokumen tidak berubah.
  const title = src.getTitle()
  const author = src.getAuthor()
  const subject = src.getSubject()
  if (title) dst.setTitle(title)
  if (author) dst.setAuthor(author)
  if (subject) dst.setSubject(subject)
  dst.setProducer('SiKomputer PDF Repair')

  // Tanpa object streams -> kompatibilitas maksimum dengan parser sederhana (mis. validator upload).
  const out = await dst.save({ useObjectStreams: false })
  return { out, pages: copied }
}

async function reprint(
  bytes: Uint8Array,
  opts: PdfRepairOptions,
  warnings: string[],
): Promise<{ out: Uint8Array; pages: number }> {
  const dpi = opts.dpi ?? 200
  const quality = Math.min(1, Math.max(0.5, opts.quality ?? 0.92))
  const [pdfjs, { PDFDocument }] = await Promise.all([loadPdfJs(), import('pdf-lib')])

  const task = pdfjs.getDocument({ data: bytes.slice() })
  const src = await task.promise
  const total = src.numPages
  const dst = await PDFDocument.create()

  try {
    for (let i = 1; i <= total; i++) {
      opts.onProgress?.(i - 1, total, `Merender halaman ${i}/${total}`)
      const page = await src.getPage(i)
      const base = page.getViewport({ scale: 1 }) // ukuran dalam point (1/72 inci), sudah termasuk rotasi

      let scale = dpi / 72
      const pixels = base.width * scale * (base.height * scale)
      if (pixels > MAX_PIXELS_PER_PAGE) {
        scale *= Math.sqrt(MAX_PIXELS_PER_PAGE / pixels)
        warnings.push(`Halaman ${i} sangat besar, resolusi diturunkan otomatis agar memori aman.`)
      }
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.')
      ctx.fillStyle = '#ffffff' // JPEG tidak punya alpha -> latar putih seperti kertas
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvas, canvasContext: ctx, viewport }).promise

      const jpeg = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
      if (!jpeg) throw new Error(`Gagal mengonversi halaman ${i} menjadi gambar.`)
      const img = await dst.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))

      const out = dst.addPage([base.width, base.height])
      out.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height })

      page.cleanup()
      canvas.width = 0 // lepas memori canvas
      canvas.height = 0
      opts.onProgress?.(i, total, `Selesai halaman ${i}/${total}`)
    }
  } finally {
    await task.destroy()
  }

  dst.setProducer('SiKomputer PDF Repair')
  const out = await dst.save({ useObjectStreams: false })
  return { out, pages: total }
}

export async function repairPdf(file: File, opts: PdfRepairOptions): Promise<PdfRepairResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!looksLikePdf(bytes)) throw new Error('Berkas ini bukan PDF (header %PDF- tidak ditemukan).')

  const warnings: string[] = []
  try {
    const { out, pages } = opts.mode === 'rebuild' ? await rebuild(bytes, opts, warnings) : await reprint(bytes, opts, warnings)

    let verified = false
    try {
      verified = (await countPages(out)) === pages
    } catch {
      verified = false
    }
    if (!verified) warnings.push('Verifikasi pembacaan ulang hasil gagal. Coba mode lain.')

    const copy = new Uint8Array(out) // pastikan buffer biasa (bukan SharedArrayBuffer)
    return {
      blob: new Blob([copy], { type: 'application/pdf' }),
      fileName: outputName(file.name),
      mode: opts.mode,
      pages,
      sizeBefore: file.size,
      sizeAfter: copy.byteLength,
      verified,
      warnings,
    }
  } catch (e) {
    throw friendlyError(e)
  }
}

/* ================= PDF Inspect, Split & Merge ================= */

export async function inspectPdfFile(
  file: File,
): Promise<{ pageCount: number; sizeBytes: number; fileName: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!looksLikePdf(bytes)) {
    throw new Error(`Berkas "${file.name}" bukan PDF yang valid (%PDF- tidak ditemukan).`)
  }
  try {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes, { throwOnInvalidObject: false, updateMetadata: false })
    return { pageCount: doc.getPageCount(), sizeBytes: file.size, fileName: file.name }
  } catch (err) {
    try {
      const n = await countPages(bytes)
      return { pageCount: n, sizeBytes: file.size, fileName: file.name }
    } catch {
      throw friendlyError(err)
    }
  }
}

export function parsePageRanges(rangeStr: string, maxPage: number): number[][] {
  const clean = rangeStr.trim()
  if (!clean || /^all|semua$/i.test(clean)) {
    return [Array.from({ length: maxPage }, (_, i) => i + 1)]
  }
  const tokens = clean
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (tokens.length === 0) {
    throw new Error('Masukkan nomor halaman atau rentang halaman (contoh: 1-3, 5).')
  }

  const groups: number[][] = []
  for (const tok of tokens) {
    const rangeMatch = tok.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      if (start < 1 || end < 1 || start > maxPage || end > maxPage) {
        throw new Error(`Rentang "${tok}" di luar jumlah halaman dokumen (1–${maxPage}).`)
      }
      const pages: number[] = []
      if (start <= end) {
        for (let p = start; p <= end; p++) pages.push(p)
      } else {
        for (let p = start; p >= end; p--) pages.push(p)
      }
      groups.push(pages)
    } else if (/^\d+$/.test(tok)) {
      const p = Number(tok)
      if (p < 1 || p > maxPage) {
        throw new Error(`Halaman "${p}" di luar batas dokumen (1–${maxPage}).`)
      }
      groups.push([p])
    } else {
      throw new Error(`Format rentang "${tok}" tidak dikenali. Gunakan angka atau a-b (contoh: 1-3, 5).`)
    }
  }
  return groups
}

export type PdfSplitMode = 'extract-single' | 'split-ranges' | 'every-n' | 'remove-pages'

export type PdfSplitItem = {
  fileName: string
  blob: Blob
  pages: number
  pageNumbers: number[]
  sizeBytes: number
}

export async function splitPdf(
  file: File,
  opts: {
    mode: PdfSplitMode
    rangeInput?: string
    chunkSize?: number
    onProgress?: (done: number, total: number, label: string) => void
  },
): Promise<PdfSplitItem[]> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!looksLikePdf(bytes)) throw new Error('Berkas ini bukan PDF (header %PDF- tidak ditemukan).')

  const { PDFDocument } = await import('pdf-lib')
  const src = await PDFDocument.load(bytes, { throwOnInvalidObject: false, updateMetadata: false })
  const total = src.getPageCount()
  const baseName = file.name.replace(/\.pdf$/i, '')

  let groups: number[][] = []
  if (opts.mode === 'every-n') {
    const step = Math.max(1, Math.min(total, opts.chunkSize || 1))
    for (let start = 1; start <= total; start += step) {
      const g: number[] = []
      for (let p = start; p < Math.min(total + 1, start + step); p++) g.push(p)
      groups.push(g)
    }
  } else if (opts.mode === 'remove-pages') {
    const parsed = parsePageRanges(opts.rangeInput || '', total)
    const toRemove = new Set(parsed.flat())
    const kept: number[] = []
    for (let p = 1; p <= total; p++) {
      if (!toRemove.has(p)) kept.push(p)
    }
    if (kept.length === 0) {
      throw new Error('Tidak ada halaman tersisa jika semua halaman dihapus.')
    }
    groups = [kept]
  } else if (opts.mode === 'extract-single') {
    const parsed = parsePageRanges(opts.rangeInput || `1-${total}`, total)
    groups = [parsed.flat()]
  } else {
    // split-ranges: setiap bagian dipisah menjadi file terpisah
    groups = parsePageRanges(opts.rangeInput || `1-${total}`, total)
  }

  const outputs: PdfSplitItem[] = []
  for (let idx = 0; idx < groups.length; idx++) {
    const pageNums = groups[idx]
    opts.onProgress?.(idx, groups.length, `Membuat berkas ${idx + 1}/${groups.length}...`)

    const dst = await PDFDocument.create()
    const copiedPages = await dst.copyPages(
      src,
      pageNums.map((p) => p - 1),
    )
    for (const page of copiedPages) dst.addPage(page)
    dst.setProducer('SiKomputer PDF Studio')

    const out = await dst.save({ useObjectStreams: false })
    const copy = new Uint8Array(out)
    const labelSuffix =
      pageNums.length === 1
        ? `hal-${pageNums[0]}`
        : `hal-${pageNums[0]}-${pageNums[pageNums.length - 1]}`
    const fileName =
      groups.length === 1 && opts.mode === 'remove-pages'
        ? `${baseName}-trimmed.pdf`
        : `${baseName}-${labelSuffix}.pdf`

    outputs.push({
      fileName,
      blob: new Blob([copy], { type: 'application/pdf' }),
      pages: pageNums.length,
      pageNumbers: pageNums,
      sizeBytes: copy.byteLength,
    })
    opts.onProgress?.(idx + 1, groups.length, `Selesai ${idx + 1}/${groups.length}`)
  }

  return outputs
}

export type PdfMergeInputItem = {
  id: string
  file: File
  pageCount: number
  rangeStr: string
}

export async function mergePdfs(
  items: PdfMergeInputItem[],
  outputFileName = 'dokumen-gabungan.pdf',
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<{
  blob: Blob
  fileName: string
  totalPages: number
  sizeBefore: number
  sizeAfter: number
}> {
  if (items.length < 2) {
    throw new Error('Tambahkan minimal 2 berkas PDF untuk digabungkan.')
  }

  const { PDFDocument } = await import('pdf-lib')
  const dst = await PDFDocument.create()
  let totalPages = 0
  let sizeBefore = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    sizeBefore += item.file.size
    onProgress?.(i, items.length, `Menggabungkan ${item.file.name} (${i + 1}/${items.length})...`)

    const bytes = new Uint8Array(await item.file.arrayBuffer())
    if (!looksLikePdf(bytes)) {
      throw new Error(`Berkas "${item.file.name}" bukan PDF yang valid.`)
    }
    const src = await PDFDocument.load(bytes, { throwOnInvalidObject: false, updateMetadata: false })
    const count = src.getPageCount()
    const indices = item.rangeStr.trim()
      ? parsePageRanges(item.rangeStr, count)
          .flat()
          .map((p) => p - 1)
      : Array.from({ length: count }, (_, idx) => idx)

    const copied = await dst.copyPages(src, indices)
    for (const p of copied) dst.addPage(p)
    totalPages += copied.length
    onProgress?.(i + 1, items.length, `Selesai membaca ${item.file.name}`)
  }

  dst.setProducer('SiKomputer PDF Studio')
  const out = await dst.save({ useObjectStreams: false })
  const copy = new Uint8Array(out)
  const cleanName = outputFileName.trim() || 'dokumen-gabungan.pdf'
  const finalName = /\.pdf$/i.test(cleanName) ? cleanName : `${cleanName}.pdf`

  return {
    blob: new Blob([copy], { type: 'application/pdf' }),
    fileName: finalName,
    totalPages,
    sizeBefore,
    sizeAfter: copy.byteLength,
  }
}
