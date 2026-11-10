/**
 * Image Service — pengolahan gambar 100% lokal di browser memakai Canvas API (tanpa upload, tanpa library).
 *
 * Fitur: kompres (kualitas / target ukuran), ubah resolusi (perkecil & perbesar), konversi format,
 * rotasi & flip, penajaman (unsharp), penyesuaian warna, serta penghapusan metadata EXIF otomatis.
 *
 * Catatan: "perbesar resolusi" memakai interpolasi berkualitas tinggi + penajaman, bukan AI super-resolution.
 */

export type OutFormat = 'original' | 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf'
export type ResizeMode = 'none' | 'scale' | 'fit' | 'exact'

export type ImageOptions = {
  format: OutFormat
  /** 0.1 – 1 (JPEG / WebP). */
  quality: number
  /** Target ukuran maksimum dalam KB (JPEG / WebP). `0` = nonaktif. */
  targetKB: number
  resizeMode: ResizeMode
  /** Persen, 10 – 400. */
  scale: number
  maxW: number
  maxH: number
  width: number
  height: number
  keepAspect: boolean
  rotate: 0 | 90 | 180 | 270
  flipH: boolean
  flipV: boolean
  /** 0 – 100. */
  sharpen: number
  brightness: number
  contrast: number
  saturate: number
  grayscale: boolean
  /** Warna latar pengganti transparansi saat output JPEG. */
  background: string
}

export const defaultImageOptions: ImageOptions = {
  format: 'original',
  quality: 0.85,
  targetKB: 0,
  resizeMode: 'none',
  scale: 100,
  maxW: 1920,
  maxH: 1920,
  width: 1280,
  height: 720,
  keepAspect: true,
  rotate: 0,
  flipH: false,
  flipV: false,
  sharpen: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: false,
  background: '#ffffff',
}

export type ImageInfo = { width: number; height: number }

export type ImageResult = {
  blob: Blob
  previewBlob?: Blob
  width: number
  height: number
  size: number
  mime: string
  /** Kualitas yang akhirnya dipakai (berguna saat mode target ukuran). */
  quality: number | null
  warnings: string[]
}

const MAX_SIDE = 12_000
const MAX_PIXELS = 60_000_000 // ~240 MB RGBA, batas aman memori browser

export const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif,image/svg+xml'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export function extFor(mime: string): string {
  if (mime === 'application/pdf') return 'pdf'
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
}

export function outputName(original: string, mime: string): string {
  return `${original.replace(/\.[^.]+$/, '')}-edit.${extFor(mime)}`
}

/** Format output sebenarnya. Format asli yang tidak bisa di-encode browser (GIF/BMP/SVG/AVIF) jadi PNG. */
export function resolveMime(file: File, format: OutFormat): string {
  if (format === 'application/pdf') return 'application/pdf'
  if (format !== 'original') return format
  return ['image/jpeg', 'image/webp', 'image/png'].includes(file.type) ? file.type : 'image/png'
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Fallback (mis. SVG tanpa ukuran intrinsik di beberapa browser)
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return await createImageBitmap(img)
    } catch {
      throw new Error(`"${file.name}" tidak dapat dibaca. Format ini (mis. HEIC/TIFF) belum didukung browser.`)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function getImageInfo(file: File): Promise<ImageInfo> {
  const bmp = await decode(file)
  const info = { width: bmp.width, height: bmp.height }
  bmp.close()
  return info
}

/** Hitung dimensi akhir (setelah rotasi) berdasarkan mode resize. */
export function computeSize(srcW: number, srcH: number, o: ImageOptions): { w: number; h: number } {
  const rotated = o.rotate === 90 || o.rotate === 270
  const bw = rotated ? srcH : srcW
  const bh = rotated ? srcW : srcH
  let w = bw
  let h = bh
  if (o.resizeMode === 'scale') {
    w = (bw * o.scale) / 100
    h = (bh * o.scale) / 100
  } else if (o.resizeMode === 'fit') {
    const r = Math.min(1, (o.maxW || bw) / bw, (o.maxH || bh) / bh)
    w = bw * r
    h = bh * r
  } else if (o.resizeMode === 'exact') {
    if (o.keepAspect) {
      // Isi lebar lalu sesuaikan tinggi (atau sebaliknya jika lebar kosong)
      if (o.width > 0) {
        w = o.width
        h = (bh * o.width) / bw
      } else if (o.height > 0) {
        h = o.height
        w = (bw * o.height) / bh
      }
    } else {
      w = o.width || bw
      h = o.height || bh
    }
  }
  return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) }
}

/** Unsharp mask sederhana (kernel 3x3) — mempertegas tepi setelah upscale. */
function sharpenCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0 || w < 3 || h < 3) return
  const a = (amount / 100) * 1.2
  const img = ctx.getImageData(0, 0, w, h)
  const src = img.data
  const out = new Uint8ClampedArray(src) // salinan; tepi gambar dibiarkan
  const row = w * 4
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4
      for (let c = 0; c < 3; c++) {
        const k = i + c
        const blur = (src[k - 4] + src[k + 4] + src[k - row] + src[k + row]) / 4
        out[k] = src[k] + a * (src[k] - blur)
      }
    }
  }
  img.data.set(out)
  ctx.putImageData(img, 0, 0)
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal meng-encode gambar (memori tidak cukup?)'))), mime, quality),
  )
}

export async function processImage(file: File, o: ImageOptions): Promise<ImageResult> {
  const warnings: string[] = []
  const bmp = await decode(file)
  try {
    let { w, h } = computeSize(bmp.width, bmp.height, o)

    // Batas memori
    const limit = Math.min(1, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_PIXELS / (w * h)))
    if (limit < 1) {
      w = Math.max(1, Math.floor(w * limit))
      h = Math.max(1, Math.floor(h * limit))
      warnings.push(`Resolusi dibatasi ke ${w}×${h} px agar memori browser aman.`)
    }

    const rotated = o.rotate === 90 || o.rotate === 270
    const dw = rotated ? h : w // ukuran gambar sebelum diputar
    const dh = rotated ? w : h

    // Resample berkualitas tinggi bawaan browser bila tersedia
    let source: ImageBitmap = bmp
    if (dw !== bmp.width || dh !== bmp.height) {
      try {
        source = await createImageBitmap(bmp, { resizeWidth: dw, resizeHeight: dh, resizeQuality: 'high' })
      } catch {
        source = bmp // fallback: drawImage + imageSmoothingQuality
      }
    }

    const mime = resolveMime(file, o.format)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: o.sharpen > 0 })
    if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.')

    if (mime === 'image/jpeg') {
      ctx.fillStyle = o.background // JPEG tidak mendukung transparansi
      ctx.fillRect(0, 0, w, h)
    }

    const filters: string[] = []
    if (o.brightness !== 100) filters.push(`brightness(${o.brightness}%)`)
    if (o.contrast !== 100) filters.push(`contrast(${o.contrast}%)`)
    if (o.saturate !== 100) filters.push(`saturate(${o.saturate}%)`)
    if (o.grayscale) filters.push('grayscale(100%)')
    if (filters.length) ctx.filter = filters.join(' ')

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(w / 2, h / 2)
    ctx.rotate((o.rotate * Math.PI) / 180)
    ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1)
    ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = 'none'
    if (source !== bmp) source.close()

    sharpenCanvas(ctx, w, h, o.sharpen)

    const isPdf = mime === 'application/pdf'
    const lossy = mime !== 'image/png' && !isPdf
    let quality: number | null = lossy ? o.quality : null
    let previewBlob: Blob | undefined
    let blob: Blob

    if (isPdf) {
      // Untuk PDF, encode gambar ke JPEG lalu masukkan ke dalam dokumen PDF-lib
      const imgBlob = await toBlob(canvas, 'image/jpeg', Math.max(0.5, o.quality))
      previewBlob = imgBlob

      const { PDFDocument } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const imgBuffer = await imgBlob.arrayBuffer()
      const embedded = await pdfDoc.embedJpg(new Uint8Array(imgBuffer))
      const page = pdfDoc.addPage([w, h])
      page.drawImage(embedded, { x: 0, y: 0, width: w, height: h })
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false })
      blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
    } else {
      blob = await toBlob(canvas, mime, o.quality)

      // Mode target ukuran: binary search kualitas tertinggi yang masih di bawah target
      if (o.targetKB > 0) {
        const target = o.targetKB * 1024
        if (!lossy) {
          warnings.push('Target ukuran hanya berlaku untuk JPEG/WebP. Ubah format output untuk memakainya.')
        } else if (blob.size > target) {
          let lo = 0.05
          let hi = o.quality
          let best: Blob | null = null
          let bestQ = lo
          for (let i = 0; i < 8; i++) {
            const q = (lo + hi) / 2
            const b = await toBlob(canvas, mime, q)
            if (b.size <= target) {
              best = b
              bestQ = q
              lo = q
            } else hi = q
          }
          if (!best) {
            best = await toBlob(canvas, mime, 0.05)
            bestQ = 0.05
            if (best.size > target) warnings.push(`Target ${o.targetKB} KB tidak tercapai walau kualitas minimum. Perkecil resolusinya.`)
          }
          blob = best
          quality = bestQ
        }
      }
    }

    if (!isPdf && blob.type && blob.type !== mime) {
      warnings.push(`Browser ini tidak mendukung encode ${mime}; hasil disimpan sebagai ${blob.type}.`)
    }
    const noTransform = o.resizeMode === 'none' && o.rotate === 0 && !o.flipH && !o.flipV && o.sharpen === 0 && !filters.length
    if (!isPdf && noTransform && blob.size > file.size && blob.type === file.type) {
      warnings.push('Hasil lebih besar dari file asli. Turunkan kualitas atau ganti format (mis. WebP).')
    }

    canvas.width = 0
    canvas.height = 0
    return { blob, previewBlob, width: w, height: h, size: blob.size, mime, quality, warnings }
  } finally {
    bmp.close()
  }
}

/**
 * Menggabungkan banyak gambar menjadi 1 berkas PDF multi-halaman
 */
export async function combineImagesToPdf(
  imageItems: { name: string; file: File; options: ImageOptions }[]
): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const pdfDoc = await PDFDocument.create()

  for (const item of imageItems) {
    const res = await processImage(item.file, { ...item.options, format: 'image/jpeg' })
    const imgBuffer = await res.blob.arrayBuffer()
    const embedded = await pdfDoc.embedJpg(new Uint8Array(imgBuffer))
    const page = pdfDoc.addPage([res.width, res.height])
    page.drawImage(embedded, { x: 0, y: 0, width: res.width, height: res.height })
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false })
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}

