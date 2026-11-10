/**
 * SiKomputer - Base64 Studio Service
 * 100% Client-Side FileReader & Magic Bytes MIME Detector
 */

export interface Base64EncodeResult {
  fileName: string
  mimeType: string
  originalSize: number
  raw: string
  dataUri: string
  urlSafe: string
  characterCount: number
}

export interface Base64DecodeResult {
  blob: Blob
  mimeType: string
  fileName: string
  size: number
  objectUrl: string
  isValid: boolean
  error?: string
}

export interface TextBase64Options {
  urlSafe?: boolean
  lineBreaks?: boolean
}

export interface TextEncodeResult {
  raw: string
  urlSafe: string
  dataUri: string
  chunked: string
  charCount: number
  byteCount: number
}

export interface TextDecodeResult {
  text: string
  isValid: boolean
  error?: string
  charCount: number
  byteCount: number
}

/**
 * Konversi teks UTF-8 ke Base64 (Standard RFC 4648, URL-Safe, Data URI, Chunked 76-chars)
 */
export function textToBase64(text: string): TextEncodeResult {
  if (!text) {
    return {
      raw: '',
      urlSafe: '',
      dataUri: '',
      chunked: '',
      charCount: 0,
      byteCount: 0,
    }
  }

  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const raw = btoa(binary)
  const urlSafe = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const dataUri = `data:text/plain;charset=utf-8;base64,${raw}`
  const chunked = raw.match(/.{1,76}/g)?.join('\n') || raw

  return {
    raw,
    urlSafe,
    dataUri,
    chunked,
    charCount: text.length,
    byteCount: bytes.byteLength,
  }
}

/**
 * Konversi string Base64 kembali ke teks UTF-8 asli
 */
export function base64ToText(input: string): TextDecodeResult {
  if (!input || !input.trim()) {
    return {
      text: '',
      isValid: true,
      charCount: 0,
      byteCount: 0,
    }
  }

  try {
    let clean = stripDataUriPrefix(input.trim())
    // Tangani URL-safe (- dan _)
    clean = clean.replace(/-/g, '+').replace(/_/g, '/')
    // Tambah padding = jika kurang
    while (clean.length % 4 !== 0) {
      clean += '='
    }

    const binary = atob(clean)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const decoder = new TextDecoder('utf-8', { fatal: true })
    const text = decoder.decode(bytes)

    return {
      text,
      isValid: true,
      charCount: text.length,
      byteCount: bytes.byteLength,
    }
  } catch (err: any) {
    // Fallback toleran jika ada karakter non-fatal
    try {
      let clean = stripDataUriPrefix(input.trim()).replace(/-/g, '+').replace(/_/g, '/')
      while (clean.length % 4 !== 0) clean += '='
      const binary = atob(clean)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      return {
        text,
        isValid: true,
        charCount: text.length,
        byteCount: bytes.byteLength,
      }
    } catch {
      return {
        text: '',
        isValid: false,
        error: 'String Base64 tidak valid atau mengandung karakter korup.',
        charCount: 0,
        byteCount: 0,
      }
    }
  }
}

/**
 * Konversi File objek ke Base64 (Raw, Data URI, dan URL-safe)
 */
export function fileToBase64(file: File): Promise<Base64EncodeResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      const commaIdx = dataUri.indexOf(',')
      const raw = commaIdx !== -1 ? dataUri.slice(commaIdx + 1) : dataUri
      const urlSafe = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const mimeType = file.type || detectMimeFromFilename(file.name)

      resolve({
        fileName: file.name,
        mimeType,
        originalSize: file.size,
        raw,
        dataUri,
        urlSafe,
        characterCount: raw.length,
      })
    }
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Validasi apakah teks adalah representasi Base64 yang valid
 */
export function isValidBase64(input: string): boolean {
  if (!input || !input.trim()) return false
  const clean = stripDataUriPrefix(input.trim())
  // Izinkan karakter base64 standar dan url-safe
  return /^[A-Za-z0-9+/=_-]+$/.test(clean)
}

/**
 * Hapus prefix data URI jika ada (misal: "data:image/png;base64,")
 */
export function stripDataUriPrefix(input: string): string {
  const trimmed = input.trim()
  const commaIdx = trimmed.indexOf(',')
  if (trimmed.startsWith('data:') && commaIdx !== -1) {
    return trimmed.slice(commaIdx + 1).replace(/\s+/g, '')
  }
  return trimmed.replace(/\s+/g, '')
}

/**
 * Ekstraksi MIME dari prefix data URI jika ada
 */
export function extractMimeFromDataUri(input: string): string | null {
  const match = input.match(/^data:([^;]+);base64,/)
  return match ? match[1] : null
}

/**
 * Deteksi jenis MIME dari "Magic Numbers" (byte pembuka berkas)
 */
export function detectMimeFromBytes(bytes: Uint8Array): { mime: string; ext: string } {
  if (bytes.length >= 4) {
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { mime: 'image/png', ext: 'png' }
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg' }
    }
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { mime: 'image/gif', ext: 'gif' }
    }
    // PDF: 25 50 44 46 (%PDF)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { mime: 'application/pdf', ext: 'pdf' }
    }
    // ZIP / DOCX / XLSX: 50 4B 03 04 (PK..)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return { mime: 'application/zip', ext: 'zip' }
    }
    // WEBP: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length >= 12 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { mime: 'image/webp', ext: 'webp' }
    }
  }

  // Cek SVG atau teks
  try {
    const textSample = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 100)).trim()
    if (textSample.startsWith('<svg') || textSample.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return { mime: 'image/svg+xml', ext: 'svg' }
    }
    if (textSample.startsWith('{') || textSample.startsWith('[')) {
      return { mime: 'application/json', ext: 'json' }
    }
    if (/^[\x20-\x7E\r\n\t]+$/.test(textSample)) {
      return { mime: 'text/plain', ext: 'txt' }
    }
  } catch {
    // binary fallback
  }

  return { mime: 'application/octet-stream', ext: 'bin' }
}

/**
 * Konversi string Base64 kembali ke File / Blob siap unduh
 */
export function base64ToFile(input: string, customFileName?: string): Base64DecodeResult {
  try {
    const dataUriMime = extractMimeFromDataUri(input)
    let raw = stripDataUriPrefix(input)

    // Tangani format URL-safe Base64
    raw = raw.replace(/-/g, '+').replace(/_/g, '/')
    while (raw.length % 4 !== 0) {
      raw += '='
    }

    const binaryString = atob(raw)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const detected = detectMimeFromBytes(bytes)
    const finalMime = dataUriMime || detected.mime
    const finalExt = detected.ext || 'bin'
    const fileName = customFileName?.trim() || `berkas-sikomputer.${finalExt}`

    const blob = new Blob([bytes], { type: finalMime })
    const objectUrl = URL.createObjectURL(blob)

    return {
      blob,
      mimeType: finalMime,
      fileName,
      size: bytes.byteLength,
      objectUrl,
      isValid: true,
    }
  } catch (err: any) {
    return {
      blob: new Blob([]),
      mimeType: 'application/octet-stream',
      fileName: 'error.bin',
      size: 0,
      objectUrl: '',
      isValid: false,
      error: err?.message || 'String Base64 tidak valid atau korup.',
    }
  }
}

function detectMimeFromFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'webp':
      return 'image/webp'
    case 'pdf':
      return 'application/pdf'
    case 'json':
      return 'application/json'
    case 'txt':
      return 'text/plain'
    case 'csv':
      return 'text/csv'
    default:
      return 'application/octet-stream'
  }
}

