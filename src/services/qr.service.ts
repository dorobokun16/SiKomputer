/**
 * SiKomputer - QR Code Studio Service
 * Generator QR Code ISO/IEC 18004 (Versi 1–14, Koreksi Error L/M/Q/H, GF(256) Reed-Solomon)
 * 100% Client-Side tanpa dependensi eksternal maupun koneksi internet.
 */

export type QrEcLevel = 'L' | 'M' | 'Q' | 'H'
export type QrModuleStyle = 'square' | 'rounded' | 'dots'

export interface QrMatrixResult {
  version: number
  ecLevel: QrEcLevel
  size: number
  modules: boolean[][]
  byteLength: number
}

export interface QrRenderOptions {
  size?: number
  margin?: number
  fgColor?: string
  bgColor?: string
  moduleStyle?: QrModuleStyle
  finderStyle?: 'square' | 'rounded'
  caption?: string
  logoSrc?: string | null
}

// Tabel ISO/IEC 18004: [ecCodewordsPerBlock, totalBlocks] per versi (indeks 1..14)
const EC_BLOCK_TABLE: Record<QrEcLevel, Array<[number, number] | null>> = {
  L: [
    null,
    [7, 1],
    [10, 1],
    [15, 1],
    [20, 1],
    [26, 1],
    [18, 2],
    [20, 2],
    [24, 2],
    [30, 2],
    [18, 4],
    [20, 4],
    [24, 4],
    [26, 4],
    [30, 4],
  ],
  M: [
    null,
    [10, 1],
    [16, 1],
    [26, 1],
    [18, 2],
    [24, 2],
    [16, 4],
    [18, 4],
    [22, 4],
    [22, 5],
    [26, 5],
    [30, 5],
    [22, 8],
    [22, 9],
    [24, 9],
  ],
  Q: [
    null,
    [13, 1],
    [22, 1],
    [18, 2],
    [26, 2],
    [18, 4],
    [24, 4],
    [18, 6],
    [22, 6],
    [20, 8],
    [24, 8],
    [28, 8],
    [26, 10],
    [24, 12],
    [20, 16],
  ],
  H: [
    null,
    [17, 1],
    [28, 1],
    [22, 2],
    [16, 4],
    [22, 4],
    [28, 4],
    [26, 5],
    [26, 6],
    [24, 8],
    [28, 8],
    [24, 11],
    [28, 11],
    [22, 16],
    [24, 16],
  ],
}

const ALIGN_POSITIONS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
]

// GF(256) lookup untuk polinomial primitif 0x11d (285)
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array<ArrayBufferLike> = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const root = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], root)
    }
    poly = next
  }
  return poly
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount)
  const buf = new Uint8Array(data.length + ecCount)
  buf.set(data, 0)
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= gfMul(gen[j], factor)
      }
    }
  }
  return buf.slice(data.length)
}

function getRawModuleCount(version: number): number {
  if (version === 1) return 21 * 21 - 3 * 64 - 2 * 13 - 31 - 1
  const numAlign = ALIGN_POSITIONS[version].length
  const totalPixels = (version * 4 + 17) ** 2
  const timingPixels = 2 * (version * 4 + 17 - 16)
  const finderAndFormat = 3 * 64 + 31 + 1 // +1 dark module
  const alignPixels = (numAlign * numAlign - 3) * 25 - 2 * (numAlign - 2) * 5
  const versionInfoPixels = version >= 7 ? 36 : 0
  return totalPixels - finderAndFormat - timingPixels - alignPixels - versionInfoPixels
}

function getDataCodewordCapacity(version: number, ecLevel: QrEcLevel): number {
  const totalCW = Math.floor(getRawModuleCount(version) / 8)
  const spec = EC_BLOCK_TABLE[ecLevel][version]
  if (!spec) return 0
  return totalCW - spec[0] * spec[1]
}

function encodeDataBits(bytes: Uint8Array, version: number, dataCapacityCW: number): Uint8Array {
  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }

  // Mode: Byte (0100)
  pushBits(0b0100, 4)
  // Panjang karakter (8-bit untuk V1..V9, 16-bit untuk V10..V26)
  pushBits(bytes.length, version < 10 ? 8 : 16)
  for (const b of bytes) pushBits(b, 8)

  const totalDataBits = dataCapacityCW * 8
  const terminatorLen = Math.min(4, totalDataBits - bits.length)
  for (let i = 0; i < terminatorLen; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)

  const out = new Uint8Array(dataCapacityCW)
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0
    for (let b = 0; b < 8; b++) val = (val << 1) | bits[i + b]
    out[i / 8] = val
  }

  let padToggle = 0
  for (let idx = bits.length / 8; idx < dataCapacityCW; idx++) {
    out[idx] = padToggle % 2 === 0 ? 0xec : 0x11
    padToggle++
  }
  return out
}

function buildFinalCodewords(dataCW: Uint8Array, version: number, ecLevel: QrEcLevel): Uint8Array {
  const totalCW = Math.floor(getRawModuleCount(version) / 8)
  const spec = EC_BLOCK_TABLE[ecLevel][version]!
  const ecPerBlock = spec[0]
  const numBlocks = spec[1]

  const shortBlocks = numBlocks - (dataCW.length % numBlocks)
  const shortLen = Math.floor(dataCW.length / numBlocks)

  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let offset = 0
  for (let b = 0; b < numBlocks; b++) {
    const len = b < shortBlocks ? shortLen : shortLen + 1
    const chunk = dataCW.slice(offset, offset + len)
    offset += len
    dataBlocks.push(chunk)
    ecBlocks.push(rsRemainder(chunk, ecPerBlock))
  }

  const out = new Uint8Array(totalCW)
  let k = 0
  const maxDataLen = shortLen + (dataCW.length % numBlocks === 0 ? 0 : 1)
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) out[k++] = dataBlocks[b][i]
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      out[k++] = ecBlocks[b][i]
    }
  }
  return out
}

function setupFunctionPatterns(version: number): { modules: boolean[][]; isFunction: boolean[][] } {
  const size = version * 4 + 17
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false))

  const setFn = (r: number, c: number, val: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return
    modules[r][c] = val
    isFunction[r][c] = true
  }

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }

  // Finder + Separator patterns (3 sudut)
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr
        const c = left + dc
        if (r < 0 || r >= size || c < 0 || c >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const inBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        setFn(r, c, inOuter && (inBorder || inInner))
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Alignment patterns
  const pos = ALIGN_POSITIONS[version]
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) {
        continue
      }
      const cr = pos[i]
      const cc = pos[j]
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          setFn(cr + dr, cc + dc, dist !== 1)
        }
      }
    }
  }

  // Reserve Format Info slots
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFn(8, i, false)
      setFn(i, 8, false)
    }
  }
  for (let i = 0; i < 8; i++) setFn(8, size - 1 - i, false)
  for (let i = 0; i < 7; i++) setFn(size - 1 - i, 8, false)
  setFn(size - 8, 8, true) // Dark module

  // Reserve & write Version Info (versi >= 7)
  if (version >= 7) {
    let rem = version
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const verBits = (version << 12) | rem
    for (let i = 0; i < 18; i++) {
      const bit = ((verBits >>> i) & 1) === 1
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(a, b, bit)
      setFn(b, a, bit)
    }
  }

  return { modules, isFunction }
}

function drawCodewords(modules: boolean[][], isFunction: boolean[][], codewords: Uint8Array) {
  const size = modules.length
  const totalBits = codewords.length * 8
  let bitIdx = 0
  let up = true

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // Lewati timing column
    for (let step = 0; step < size; step++) {
      const r = up ? size - 1 - step : step
      for (let dx = 0; dx < 2; dx++) {
        const c = right - dx
        if (!isFunction[r][c]) {
          let bit = false
          if (bitIdx < totalBits) {
            bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          modules[r][c] = bit
        }
      }
    }
    up = !up
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], mask: number): boolean[][] {
  const size = modules.length
  const out = modules.map((row) => row.slice())
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFunction[r][c]) continue
      let invert = false
      switch (mask) {
        case 0:
          invert = (r + c) % 2 === 0
          break
        case 1:
          invert = r % 2 === 0
          break
        case 2:
          invert = c % 3 === 0
          break
        case 3:
          invert = (r + c) % 3 === 0
          break
        case 4:
          invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
          break
        case 5:
          invert = ((r * c) % 2) + ((r * c) % 3) === 0
          break
        case 6:
          invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
          break
        case 7:
          invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
          break
      }
      if (invert) out[r][c] = !out[r][c]
    }
  }
  return out
}

function drawFormatBits(modules: boolean[][], ecLevel: QrEcLevel, mask: number) {
  const size = modules.length
  const ecMap: Record<QrEcLevel, number> = { M: 0, L: 1, H: 2, Q: 3 }
  const data = (ecMap[ecLevel] << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  const bits = ((data << 10) | rem) ^ 0x5412

  for (let i = 0; i <= 5; i++) modules[8][i] = ((bits >>> i) & 1) === 1
  modules[8][7] = ((bits >>> 6) & 1) === 1
  modules[8][8] = ((bits >>> 7) & 1) === 1
  modules[7][8] = ((bits >>> 8) & 1) === 1
  for (let i = 9; i < 15; i++) modules[14 - i][8] = ((bits >>> i) & 1) === 1

  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = ((bits >>> (14 - i)) & 1) === 1
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = ((bits >>> (14 - i)) & 1) === 1
  modules[size - 8][8] = true
}

function evaluatePenalty(modules: boolean[][]): number {
  const size = modules.length
  let penalty = 0

  // 1. Lima atau lebih modul sewarna berturut-turut (baris & kolom)
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0]
    let runLen = 1
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5)
        runColor = modules[r][c]
        runLen = 1
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5)
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c]
    let runLen = 1
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5)
        runColor = modules[r][c]
        runLen = 1
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5)
  }

  // 2. Blok 2x2 sewarna
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c]
      if (color === modules[r][c + 1] && color === modules[r + 1][c] && color === modules[r + 1][c + 1]) {
        penalty += 3
      }
    }
  }

  // 3. Pola rasio finder 1:1:3:1:1 + 4 quiet
  const matchFinderSeq = (arr: boolean[]) => {
    let count = 0
    for (let i = 0; i <= arr.length - 11; i++) {
      const p1 =
        arr[i] && !arr[i + 1] && arr[i + 2] && arr[i + 3] && arr[i + 4] && !arr[i + 5] && arr[i + 6] && !arr[i + 7] && !arr[i + 8] && !arr[i + 9] && !arr[i + 10]
      const p2 =
        !arr[i] && !arr[i + 1] && !arr[i + 2] && !arr[i + 3] && arr[i + 4] && !arr[i + 5] && arr[i + 6] && arr[i + 7] && arr[i + 8] && !arr[i + 9] && arr[i + 10]
      if (p1 || p2) count += 40
    }
    return count
  }
  for (let r = 0; r < size; r++) penalty += matchFinderSeq(modules[r])
  for (let c = 0; c < size; c++) {
    const col: boolean[] = []
    for (let r = 0; r < size; r++) col.push(modules[r][c])
    penalty += matchFinderSeq(col)
  }

  // 4. Keseimbangan rasio modul gelap
  let dark = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) dark++
    }
  }
  const pct = (dark * 100) / (size * size)
  const k = Math.floor(Math.abs(pct - 50) / 5)
  penalty += k * 10

  return penalty
}

export function generateQrMatrix(text: string, preferredEc: QrEcLevel = 'M'): QrMatrixResult {
  const bytes = new TextEncoder().encode(text || 'https://dorobokun16.github.io/SiKomputer/')
  const ecFallbackOrder: QrEcLevel[] =
    preferredEc === 'H'
      ? ['H', 'Q', 'M', 'L']
      : preferredEc === 'Q'
        ? ['Q', 'M', 'L']
        : preferredEc === 'M'
          ? ['M', 'L']
          : ['L']

  let chosenVersion = 1
  let chosenEc: QrEcLevel = preferredEc
  let found = false

  for (const ec of ecFallbackOrder) {
    for (let v = 1; v <= 14; v++) {
      const capCW = getDataCodewordCapacity(v, ec)
      const headerBits = 4 + (v < 10 ? 8 : 16)
      const neededBits = headerBits + bytes.length * 8
      if (neededBits <= capCW * 8) {
        chosenVersion = v
        chosenEc = ec
        found = true
        break
      }
    }
    if (found) break
  }

  if (!found) {
    throw new Error(`Teks terlalu panjang (${bytes.length} byte). Maksimal kapasitas QR Studio adalah ~458 byte.`)
  }

  const dataCap = getDataCodewordCapacity(chosenVersion, chosenEc)
  const dataCW = encodeDataBits(bytes, chosenVersion, dataCap)
  const finalCW = buildFinalCodewords(dataCW, chosenVersion, chosenEc)
  const { modules: baseModules, isFunction } = setupFunctionPatterns(chosenVersion)
  drawCodewords(baseModules, isFunction, finalCW)

  let bestMask = 0
  let bestPenalty = Number.MAX_SAFE_INTEGER
  let bestModules = baseModules

  for (let mask = 0; mask < 8; mask++) {
    const candidate = applyMask(baseModules, isFunction, mask)
    drawFormatBits(candidate, chosenEc, mask)
    const p = evaluatePenalty(candidate)
    if (p < bestPenalty) {
      bestPenalty = p
      bestMask = mask
      bestModules = candidate
    }
  }
  void bestMask

  return {
    version: chosenVersion,
    ecLevel: chosenEc,
    size: chosenVersion * 4 + 17,
    modules: bestModules,
    byteLength: bytes.length,
  }
}

/* ================= Payload Builders ================= */
function escapeWifiField(val: string): string {
  return val.replace(/([\\;,:"])/g, '\\$1')
}

export function buildWifiPayload(cfg: {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}): string {
  const t = cfg.encryption
  const s = escapeWifiField(cfg.ssid.trim())
  const p = t === 'nopass' ? '' : escapeWifiField(cfg.password)
  const h = cfg.hidden ? 'H:true;' : ''
  return `WIFI:T:${t};S:${s};P:${p};${h};`
}

export function buildVCardPayload(v: {
  fullName: string
  phone?: string
  email?: string
  org?: string
  title?: string
  url?: string
  address?: string
}): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${v.fullName.trim()}`]
  if (v.org?.trim()) lines.push(`ORG:${v.org.trim()}`)
  if (v.title?.trim()) lines.push(`TITLE:${v.title.trim()}`)
  if (v.phone?.trim()) lines.push(`TEL;TYPE=CELL:${v.phone.trim()}`)
  if (v.email?.trim()) lines.push(`EMAIL:${v.email.trim()}`)
  if (v.url?.trim()) lines.push(`URL:${v.url.trim()}`)
  if (v.address?.trim()) lines.push(`ADR:;;${v.address.trim()};;;;`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

export function buildWhatsAppPayload(phone: string, message: string): string {
  let digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  const q = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''
  return `https://wa.me/${digits}${q}`
}

export function buildEmailPayload(to: string, subject: string, body: string): string {
  const params = new URLSearchParams()
  if (subject.trim()) params.set('subject', subject.trim())
  if (body.trim()) params.set('body', body.trim())
  const q = params.toString()
  return `mailto:${to.trim()}${q ? `?${q}` : ''}`
}

/* ================= Canvas & SVG Renderers ================= */
function isFinderZone(r: number, c: number, size: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.lineTo(x + w - rad, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad)
  ctx.lineTo(x + w, y + h - rad)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h)
  ctx.lineTo(x + rad, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad)
  ctx.lineTo(x, y + rad)
  ctx.quadraticCurveTo(x, y, x + rad, y)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar logo QR.'))
    img.src = src
  })
}

export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  matrix: QrMatrixResult,
  opts: QrRenderOptions = {},
): Promise<void> {
  const size = opts.size ?? 512
  const margin = opts.margin ?? 4
  const fg = opts.fgColor ?? '#0f172a'
  const bg = opts.bgColor ?? '#ffffff'
  const moduleStyle = opts.moduleStyle ?? 'square'
  const finderStyle = opts.finderStyle ?? 'square'
  const caption = opts.caption?.trim() || ''

  const captionHeight = caption ? Math.round(size * 0.12) : 0
  canvas.width = size
  canvas.height = size + captionHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const totalCells = matrix.size + margin * 2
  const cellSize = size / totalCells
  const offset = margin * cellSize

  ctx.fillStyle = fg
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (!matrix.modules[r][c]) continue
      const x = offset + c * cellSize
      const y = offset + r * cellSize
      const inFinder = isFinderZone(r, c, matrix.size)

      if (inFinder) {
        if (finderStyle === 'rounded') {
          drawRoundedRect(ctx, x, y, cellSize + 0.35, cellSize + 0.35, cellSize * 0.28)
          ctx.fill()
        } else {
          ctx.fillRect(x, y, cellSize + 0.4, cellSize + 0.4)
        }
      } else if (moduleStyle === 'dots') {
        ctx.beginPath()
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, 0, Math.PI * 2)
        ctx.fill()
      } else if (moduleStyle === 'rounded') {
        const pad = cellSize * 0.06
        drawRoundedRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, cellSize * 0.32)
        ctx.fill()
      } else {
        ctx.fillRect(x, y, cellSize + 0.35, cellSize + 0.35)
      }
    }
  }

  // Gambar Logo di Tengah (jika dipilih)
  if (opts.logoSrc) {
    try {
      const img = await loadImage(opts.logoSrc)
      const logoBoxSize = Math.round(size * 0.19)
      const pad = Math.round(logoBoxSize * 0.16)
      const totalBox = logoBoxSize + pad * 2
      const bx = Math.round((size - totalBox) / 2)
      const by = Math.round((size - totalBox) / 2)

      ctx.fillStyle = bg
      drawRoundedRect(ctx, bx, by, totalBox, totalBox, Math.round(totalBox * 0.2))
      ctx.fill()

      ctx.drawImage(img, bx + pad, by + pad, logoBoxSize, logoBoxSize)
    } catch {
      // Abaikan bila gagal memuat logo
    }
  }

  // Label teks di bawah QR
  if (caption) {
    ctx.fillStyle = fg
    ctx.font = `700 ${Math.max(14, Math.round(size * 0.045))}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(caption, size / 2, size + captionHeight / 2 - 4, size - margin * cellSize)
  }
}

export function renderQrToSvg(matrix: QrMatrixResult, opts: QrRenderOptions = {}): string {
  const size = opts.size ?? 512
  const margin = opts.margin ?? 4
  const fg = opts.fgColor ?? '#0f172a'
  const bg = opts.bgColor ?? '#ffffff'
  const moduleStyle = opts.moduleStyle ?? 'square'
  const caption = opts.caption?.trim() || ''

  const captionHeight = caption ? Math.round(size * 0.12) : 0
  const totalHeight = size + captionHeight
  const totalCells = matrix.size + margin * 2
  const cell = size / totalCells
  const offset = margin * cell

  const shapes: string[] = []
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (!matrix.modules[r][c]) continue
      const x = (offset + c * cell).toFixed(2)
      const y = (offset + r * cell).toFixed(2)
      const inFinder = isFinderZone(r, c, matrix.size)

      if (!inFinder && moduleStyle === 'dots') {
        const cx = (offset + (c + 0.5) * cell).toFixed(2)
        const cy = (offset + (r + 0.5) * cell).toFixed(2)
        const rad = (cell * 0.42).toFixed(2)
        shapes.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" />`)
      } else if (!inFinder && moduleStyle === 'rounded') {
        const w = (cell * 0.88).toFixed(2)
        const rx = (cell * 0.28).toFixed(2)
        const px = (offset + c * cell + cell * 0.06).toFixed(2)
        const py = (offset + r * cell + cell * 0.06).toFixed(2)
        shapes.push(`<rect x="${px}" y="${py}" width="${w}" height="${w}" rx="${rx}" />`)
      } else {
        const w = (cell + 0.2).toFixed(2)
        shapes.push(`<rect x="${x}" y="${y}" width="${w}" height="${w}" />`)
      }
    }
  }

  const safeCaption = caption
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const captionEl = caption
    ? `<text x="${size / 2}" y="${size + captionHeight / 2}" text-anchor="middle" dominant-baseline="middle" fill="${fg}" font-family="system-ui, sans-serif" font-weight="700" font-size="${Math.max(14, Math.round(size * 0.045))}">${safeCaption}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${totalHeight}" width="${size}" height="${totalHeight}">
  <rect width="100%" height="100%" fill="${bg}" />
  <g fill="${fg}">${shapes.join('')}</g>
  ${captionEl}
</svg>`
}

/**
 * Buat kartu cetak Wi-Fi siap print sebagai Blob PNG
 */
export async function renderWifiPosterToBlob(
  matrix: QrMatrixResult,
  wifi: { ssid: string; password: string; encryption: string; includePassword: boolean },
  opts: QrRenderOptions = {},
): Promise<Blob> {
  const cardW = 680
  const cardH = 880
  const qrSize = 460
  const canvas = document.createElement('canvas')
  canvas.width = cardW
  canvas.height = cardH

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia.')

  // Background gradient clean card
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, cardW, cardH)

  ctx.fillStyle = '#ffffff'
  drawRoundedRect(ctx, 28, 28, cardW - 56, cardH - 56, 28)
  ctx.fill()

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 32px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Akses Wi-Fi', cardW / 2, 92)

  ctx.fillStyle = '#475569'
  ctx.font = '500 18px Inter, system-ui, sans-serif'
  ctx.fillText('Pindai QR Code di bawah untuk terhubung otomatis', cardW / 2, 128)

  const qrCanvas = document.createElement('canvas')
  await renderQrToCanvas(qrCanvas, matrix, {
    ...opts,
    size: qrSize,
    bgColor: '#ffffff',
    fgColor: opts.fgColor || '#0f172a',
    caption: '',
  })
  ctx.drawImage(qrCanvas, (cardW - qrSize) / 2, 160)

  // Info kotak di bawah
  ctx.fillStyle = '#f1f5f9'
  drawRoundedRect(ctx, 64, 650, cardW - 128, 165, 18)
  ctx.fill()

  ctx.fillStyle = '#64748b'
  ctx.font = '600 15px Inter, system-ui, sans-serif'
  ctx.fillText(`JARINGAN (${wifi.encryption === 'nopass' ? 'TERBUKA' : wifi.encryption})`, cardW / 2, 688)

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 26px "JetBrains Mono", monospace'
  ctx.fillText(wifi.ssid || '-', cardW / 2, 725, cardW - 160)

  if (wifi.includePassword && wifi.encryption !== 'nopass') {
    ctx.fillStyle = '#64748b'
    ctx.font = '600 14px Inter, system-ui, sans-serif'
    ctx.fillText('KATA SANDI', cardW / 2, 764)
    ctx.fillStyle = '#0052CC'
    ctx.font = '700 22px "JetBrains Mono", monospace'
    ctx.fillText(wifi.password || '-', cardW / 2, 795, cardW - 160)
  } else if (wifi.encryption === 'nopass') {
    ctx.fillStyle = '#059669'
    ctx.font = '600 16px Inter, system-ui, sans-serif'
    ctx.fillText('Tanpa Password', cardW / 2, 780)
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Gagal menghasilkan gambar kartu Wi-Fi.'))
    }, 'image/png')
  })
}
