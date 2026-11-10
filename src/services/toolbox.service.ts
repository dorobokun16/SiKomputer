/**
 * SiKomputer - Dev Toolbox Service
 * 7 Perkakas Developer Cepat (100% Client-Side)
 */

/* ================= 1. JSON Formatter & Minifier ================= */
export function formatJson(input: string, indent = 2): {
  formatted: string
  isValid: boolean
  error?: string
  charCount: number
  lineCount: number
} {
  try {
    if (!input.trim()) return { formatted: '', isValid: true, charCount: 0, lineCount: 0 }
    const parsed = JSON.parse(input)
    const formatted = JSON.stringify(parsed, null, indent)
    return {
      formatted,
      isValid: true,
      charCount: formatted.length,
      lineCount: formatted.split('\n').length,
    }
  } catch (err: any) {
    return {
      formatted: input,
      isValid: false,
      error: err?.message || 'Sintaks JSON tidak valid.',
      charCount: input.length,
      lineCount: input.split('\n').length,
    }
  }
}

export function minifyJson(input: string): { minified: string; isValid: boolean; error?: string } {
  try {
    if (!input.trim()) return { minified: '', isValid: true }
    const parsed = JSON.parse(input)
    const minified = JSON.stringify(parsed)
    return { minified, isValid: true }
  } catch (err: any) {
    return { minified: input, isValid: false, error: err?.message }
  }
}

/* ================= 2. JWT Decoder ================= */
export function decodeJwt(token: string): {
  header: any
  payload: any
  isExpired: boolean
  expiresIn: string
  issuedAt: string
  expiresAt: string
  isValid: boolean
  error?: string
} {
  try {
    const clean = token.trim()
    const parts = clean.split('.')
    if (parts.length < 2) {
      throw new Error('Token JWT harus memiliki minimal 2 segmen dipisahkan titik.')
    }

    const decodeBase64Url = (str: string) => {
      let output = str.replace(/-/g, '+').replace(/_/g, '/')
      while (output.length % 4) output += '='
      return JSON.parse(decodeURIComponent(escape(atob(output))))
    }

    const header = decodeBase64Url(parts[0])
    const payload = decodeBase64Url(parts[1])

    let isExpired = false
    let expiresIn = 'Tidak ada batas waktu (tanpa exp)'
    let issuedAt = '-'
    let expiresAt = '-'

    if (payload.iat) {
      issuedAt = new Date(payload.iat * 1000).toLocaleString('id-ID')
    }

    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000)
      expiresAt = expDate.toLocaleString('id-ID')
      const diffMs = expDate.getTime() - Date.now()
      if (diffMs <= 0) {
        isExpired = true
        expiresIn = `Kedaluwarsa ${Math.abs(Math.round(diffMs / 1000 / 60))} menit yang lalu`
      } else {
        const mins = Math.round(diffMs / 1000 / 60)
        const hours = (mins / 60).toFixed(1)
        expiresIn = mins > 60 ? `Aktif (${hours} jam tersisa)` : `Aktif (${mins} menit tersisa)`
      }
    }

    return {
      header,
      payload,
      isExpired,
      expiresIn,
      issuedAt,
      expiresAt,
      isValid: true,
    }
  } catch (err: any) {
    return {
      header: null,
      payload: null,
      isExpired: false,
      expiresIn: '-',
      issuedAt: '-',
      expiresAt: '-',
      isValid: false,
      error: err?.message || 'Token JWT tidak valid.',
    }
  }
}

/* ================= 3. Regex Tester ================= */
export interface RegexMatchItem {
  match: string
  index: number
  groups: string[]
}

export function testRegex(
  pattern: string,
  flags: string,
  text: string,
): {
  matches: RegexMatchItem[]
  count: number
  isValid: boolean
  error?: string
} {
  try {
    if (!pattern) return { matches: [], count: 0, isValid: true }
    // Pastikan flag 'g' ada agar bisa mencari semua
    const finalFlags = flags.includes('g') ? flags : flags + 'g'
    const reg = new RegExp(pattern, finalFlags)

    const matches: RegexMatchItem[] = []
    let m: RegExpExecArray | null

    while ((m = reg.exec(text)) !== null) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: m.slice(1),
      })
      if (!reg.global) break
      if (m.index === reg.lastIndex) reg.lastIndex++ // cegah infinite loop jika zero-width match
    }

    return { matches, count: matches.length, isValid: true }
  } catch (err: any) {
    return { matches: [], count: 0, isValid: false, error: err?.message || 'Regex error' }
  }
}

/* ================= 4. Cron Explainer & Builder ================= */
export function explainCron(cronStr: string): {
  explanation: string
  nextRuns: string[]
  isValid: boolean
  error?: string
} {
  try {
    const parts = cronStr.trim().split(/\s+/)
    if (parts.length !== 5) {
      return {
        explanation: 'Format cron harus terdiri dari 5 bagian: [menit] [jam] [hari] [bulan] [hari_dalam_minggu]',
        nextRuns: [],
        isValid: false,
      }
    }

    const [min, hour, day, _month, dow] = parts
    let explanation = 'Setiap '

    // Analisis DOW (Day of Week)
    if (dow === '*' && day === '*') {
      explanation += 'hari '
    } else if (dow === '1-5') {
      explanation += 'hari kerja (Senin - Jumat) '
    } else if (dow === '0,6' || dow === '6,0') {
      explanation += 'akhir pekan (Sabtu & Minggu) '
    } else if (dow !== '*') {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      explanation += `hari ${days[Number(dow)] || dow} `
    }

    // Analisis Waktu (Jam:Menit)
    if (hour === '*' && min.startsWith('*/')) {
      explanation += `setiap ${min.slice(2)} menit`
    } else if (hour === '*' && min === '*') {
      explanation += 'setiap menit'
    } else {
      const hStr = hour === '*' ? 'setiap jam' : `pukul ${hour.padStart(2, '0')}`
      const mStr = min === '*' ? 'setiap menit' : `:${min.padStart(2, '0')}`
      explanation += `${hStr}${mStr}`
    }

    // Kalkulasi perkiraan eksekusi berikutnya
    const nextRuns: string[] = []
    const now = new Date()
    for (let i = 1; i <= 5; i++) {
      const nextDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      if (hour !== '*' && !isNaN(Number(hour))) nextDate.setHours(Number(hour))
      if (min !== '*' && !isNaN(Number(min))) nextDate.setMinutes(Number(min))
      nextDate.setSeconds(0)
      nextRuns.push(
        nextDate.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
    }

    return { explanation, nextRuns, isValid: true }
  } catch (err: any) {
    return {
      explanation: 'Sintaks ekspresi cron tidak valid.',
      nextRuns: [],
      isValid: false,
      error: err?.message,
    }
  }
}

/* ================= 5. UUID & Hash Generator ================= */
export function generateUuids(count = 5): string[] {
  const result: string[] = []
  const safeCount = Math.max(1, Math.min(count, 50))
  for (let i = 0; i < safeCount; i++) {
    result.push(crypto.randomUUID())
  }
  return result
}

export async function calculateHashes(input: string): Promise<{
  md5: string
  sha1: string
  sha256: string
  sha512: string
}> {
  const enc = new TextEncoder()
  const data = enc.encode(input)

  const sha1Buf = await crypto.subtle.digest('SHA-1', data)
  const sha256Buf = await crypto.subtle.digest('SHA-256', data)
  const sha512Buf = await crypto.subtle.digest('SHA-512', data)

  return {
    md5: simpleMd5(input),
    sha1: bufToHex(new Uint8Array(sha1Buf)),
    sha256: bufToHex(new Uint8Array(sha256Buf)),
    sha512: bufToHex(new Uint8Array(sha512Buf)),
  }
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * MD5 hashing algoritma mandiri murni JS
 */
function simpleMd5(str: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }
  function bitRol(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt))
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  const words: number[] = []
  for (let i = 0; i < str.length * 8; i += 8) {
    words[i >> 5] |= (str.charCodeAt(i / 8) & 0xff) << i % 32
  }
  const len = str.length * 8
  words[len >> 5] |= 0x80 << len % 32
  words[(((len + 64) >>> 9) << 4) + 14] = len

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  for (let i = 0; i < words.length; i += 16) {
    const olda = a
    const oldb = b
    const oldc = c
    const oldd = d

    a = md5ff(a, b, c, d, words[i + 0] || 0, 7, -680876936)
    d = md5ff(d, a, b, c, words[i + 1] || 0, 12, -389564586)
    c = md5ff(c, d, a, b, words[i + 2] || 0, 17, 606105819)
    b = md5ff(b, c, d, a, words[i + 3] || 0, 22, -1044525330)
    a = md5ff(a, b, c, d, words[i + 4] || 0, 7, -176418897)
    d = md5ff(d, a, b, c, words[i + 5] || 0, 12, 1200080426)
    c = md5ff(c, d, a, b, words[i + 6] || 0, 17, -1473231341)
    b = md5ff(b, c, d, a, words[i + 7] || 0, 22, -45705983)
    a = md5ff(a, b, c, d, words[i + 8] || 0, 7, 1770035416)
    d = md5ff(d, a, b, c, words[i + 9] || 0, 12, -1958414417)
    c = md5ff(c, d, a, b, words[i + 10] || 0, 17, -42063)
    b = md5ff(b, c, d, a, words[i + 11] || 0, 22, -1990404162)
    a = md5ff(a, b, c, d, words[i + 12] || 0, 7, 1804603682)
    d = md5ff(d, a, b, c, words[i + 13] || 0, 12, -40341101)
    c = md5ff(c, d, a, b, words[i + 14] || 0, 17, -1502002290)
    b = md5ff(b, c, d, a, words[i + 15] || 0, 22, 1236535329)

    a = md5gg(a, b, c, d, words[i + 1] || 0, 5, -165796510)
    d = md5gg(d, a, b, c, words[i + 6] || 0, 9, -1069501632)
    c = md5gg(c, d, a, b, words[i + 11] || 0, 14, 643717713)
    b = md5gg(b, c, d, a, words[i + 0] || 0, 20, -373897302)
    a = md5gg(a, b, c, d, words[i + 5] || 0, 5, -701558691)
    d = md5gg(d, a, b, c, words[i + 10] || 0, 9, 38016083)
    c = md5gg(c, d, a, b, words[i + 15] || 0, 14, -660478335)
    b = md5gg(b, c, d, a, words[i + 4] || 0, 20, -405537848)
    a = md5gg(a, b, c, d, words[i + 9] || 0, 5, 568446438)
    d = md5gg(d, a, b, c, words[i + 14] || 0, 9, -1019803690)
    c = md5gg(c, d, a, b, words[i + 3] || 0, 14, -187363961)
    b = md5gg(b, c, d, a, words[i + 8] || 0, 20, 1163531501)
    a = md5gg(a, b, c, d, words[i + 13] || 0, 5, -1444681467)
    d = md5gg(d, a, b, c, words[i + 2] || 0, 9, -51403784)
    c = md5gg(c, d, a, b, words[i + 7] || 0, 14, 1735328473)
    b = md5gg(b, c, d, a, words[i + 12] || 0, 20, -1926607734)

    a = md5hh(a, b, c, d, words[i + 5] || 0, 4, -378558)
    d = md5hh(d, a, b, c, words[i + 8] || 0, 11, -2022574463)
    c = md5hh(c, d, a, b, words[i + 11] || 0, 16, 1839030562)
    b = md5hh(b, c, d, a, words[i + 14] || 0, 23, -35309556)
    a = md5hh(a, b, c, d, words[i + 1] || 0, 4, -1530992060)
    d = md5hh(d, a, b, c, words[i + 4] || 0, 11, 1272893353)
    c = md5hh(c, d, a, b, words[i + 7] || 0, 16, -155497632)
    b = md5hh(b, c, d, a, words[i + 10] || 0, 23, -1094730640)
    a = md5hh(a, b, c, d, words[i + 13] || 0, 4, 681279174)
    d = md5hh(d, a, b, c, words[i + 0] || 0, 11, -358537222)
    c = md5hh(c, d, a, b, words[i + 3] || 0, 16, -722521979)
    b = md5hh(b, c, d, a, words[i + 6] || 0, 23, 76029189)
    a = md5hh(a, b, c, d, words[i + 9] || 0, 4, -640364487)
    d = md5hh(d, a, b, c, words[i + 12] || 0, 11, -421815835)
    c = md5hh(c, d, a, b, words[i + 15] || 0, 16, 530742520)
    b = md5hh(b, c, d, a, words[i + 2] || 0, 23, -995338651)

    a = md5ii(a, b, c, d, words[i + 0] || 0, 6, -198630844)
    d = md5ii(d, a, b, c, words[i + 7] || 0, 10, 1126891415)
    c = md5ii(c, d, a, b, words[i + 14] || 0, 15, -1416354905)
    b = md5ii(b, c, d, a, words[i + 5] || 0, 21, -57434055)
    a = md5ii(a, b, c, d, words[i + 12] || 0, 6, 1700485571)
    d = md5ii(d, a, b, c, words[i + 3] || 0, 10, -1894986606)
    c = md5ii(c, d, a, b, words[i + 10] || 0, 15, -1051523)
    b = md5ii(b, c, d, a, words[i + 1] || 0, 21, -2054922799)
    a = md5ii(a, b, c, d, words[i + 8] || 0, 6, 1873313359)
    d = md5ii(d, a, b, c, words[i + 15] || 0, 10, -30611744)
    c = md5ii(c, d, a, b, words[i + 6] || 0, 15, -1560198380)
    b = md5ii(b, c, d, a, words[i + 13] || 0, 21, 1309151649)
    a = md5ii(a, b, c, d, words[i + 4] || 0, 6, -145523070)
    d = md5ii(d, a, b, c, words[i + 11] || 0, 10, -1120210379)
    c = md5ii(c, d, a, b, words[i + 2] || 0, 15, 718787259)
    b = md5ii(b, c, d, a, words[i + 9] || 0, 21, -343485551)

    a = safeAdd(a, olda)
    b = safeAdd(b, oldb)
    c = safeAdd(c, oldc)
    d = safeAdd(d, oldd)
  }

  let hex = ''
  const bytes = [a, b, c, d]
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      hex += ((bytes[i] >> (j * 8)) & 0xff).toString(16).padStart(2, '0')
    }
  }
  return hex
}

/* ================= 6. Epoch Converter ================= */
export function epochToDates(epochInput: number | string): {
  utc: string
  wib: string
  wita: string
  wit: string
  iso: string
  relative: string
  isValid: boolean
} {
  try {
    let num = typeof epochInput === 'string' ? Number(epochInput.trim()) : epochInput
    if (isNaN(num)) throw new Error('Nilai epoch harus berupa angka.')

    // Jika nilai < 10000000000, asumsikan detik -> kalikan 1000
    if (num < 10000000000) {
      num *= 1000
    }

    const date = new Date(num)
    if (isNaN(date.getTime())) throw new Error('Tanggal tidak valid.')

    const diff = Date.now() - date.getTime()
    const diffSec = Math.round(diff / 1000)
    let relative = ''
    if (Math.abs(diffSec) < 60) relative = 'Baru saja'
    else if (Math.abs(diffSec) < 3600) relative = `${Math.round(Math.abs(diffSec) / 60)} menit ${diffSec > 0 ? 'lalu' : 'lagi'}`
    else if (Math.abs(diffSec) < 86400) relative = `${Math.round(Math.abs(diffSec) / 3600)} jam ${diffSec > 0 ? 'lalu' : 'lagi'}`
    else relative = `${Math.round(Math.abs(diffSec) / 86400)} hari ${diffSec > 0 ? 'lalu' : 'lagi'}`

    return {
      utc: date.toUTCString(),
      wib: date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
      wita: date.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA',
      wit: date.toLocaleString('id-ID', { timeZone: 'Asia/Jayapura' }) + ' WIT',
      iso: date.toISOString(),
      relative,
      isValid: true,
    }
  } catch {
    return {
      utc: '-',
      wib: '-',
      wita: '-',
      wit: '-',
      iso: '-',
      relative: '-',
      isValid: false,
    }
  }
}

/* ================= 7. Text Diff ================= */
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  text: string
  lineOriginal?: number
  lineModified?: number
}

export function computeTextDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n')
  const modLines = modified.split('\n')
  const result: DiffLine[] = []

  let o = 0
  let m = 0

  while (o < origLines.length || m < modLines.length) {
    if (o < origLines.length && m < modLines.length) {
      if (origLines[o] === modLines[m]) {
        result.push({
          type: 'unchanged',
          text: origLines[o],
          lineOriginal: o + 1,
          lineModified: m + 1,
        })
        o++
        m++
      } else {
        // Cek baris berikutnya untuk mendeteksi penambahan atau penghapusan
        const foundInMod = modLines.slice(m, m + 5).indexOf(origLines[o])
        const foundInOrig = origLines.slice(o, o + 5).indexOf(modLines[m])

        if (foundInMod !== -1 && (foundInOrig === -1 || foundInMod <= foundInOrig)) {
          // Baris ditambahkan di modified
          result.push({
            type: 'added',
            text: modLines[m],
            lineModified: m + 1,
          })
          m++
        } else {
          // Baris dihapus dari original
          result.push({
            type: 'removed',
            text: origLines[o],
            lineOriginal: o + 1,
          })
          o++
        }
      }
    } else if (o < origLines.length) {
      result.push({
        type: 'removed',
        text: origLines[o],
        lineOriginal: o + 1,
      })
      o++
    } else if (m < modLines.length) {
      result.push({
        type: 'added',
        text: modLines[m],
        lineModified: m + 1,
      })
      m++
    }
  }

  return result
}

/* ================= 8. Text Find & Replace ================= */
export interface ReplaceOptions {
  findText: string
  replaceText: string
  matchCase: boolean
  wholeWord: boolean
  useRegex: boolean
}

export function executeTextReplace(
  source: string,
  options: ReplaceOptions,
  mode: 'all' | 'first' = 'all'
): { result: string; matchCount: number; error?: string } {
  const { findText, replaceText, matchCase, wholeWord, useRegex } = options

  if (!findText) {
    return { result: source, matchCount: 0 }
  }

  try {
    let pattern: RegExp
    if (useRegex) {
      const flags = (matchCase ? '' : 'i') + (mode === 'all' ? 'g' : '')
      pattern = new RegExp(findText, flags)
    } else {
      // Escape special regex characters
      let escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`
      }
      const flags = (matchCase ? '' : 'i') + (mode === 'all' ? 'g' : '')
      pattern = new RegExp(escaped, flags)
    }

    // Hitung jumlah match
    const countPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    )
    const matches = source.match(countPattern)
    const matchCount = matches ? matches.length : 0

    // Lakukan replacement
    // Jika useRegex false, replace string literal dengan aman ($ tidak dianggap backreference sembarangan)
    const sanitizedReplace = useRegex ? replaceText : replaceText.replace(/\$/g, '$$$$')
    const result = source.replace(pattern, sanitizedReplace)

    return { result, matchCount }
  } catch (err: any) {
    return {
      result: source,
      matchCount: 0,
      error: err?.message || 'Pola regex tidak valid.',
    }
  }
}

/* ================= 9. SQL Code Generator ================= */
export type SqlDialect = 'postgres' | 'mysql' | 'tsql' | 'sqlite' | 'oracle'
export type SqlAction = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE TABLE' | 'UPSERT'

export interface SqlColumn {
  name: string
  type: string
  isPrimaryKey?: boolean
  isNullable?: boolean
  isAutoIncrement?: boolean
  defaultValue?: string
  sampleValue?: string
}

export function generateSqlCode({
  tableName,
  action,
  dialect,
  columns,
  whereClause,
  limit = 100,
}: {
  tableName: string
  action: SqlAction
  dialect: SqlDialect
  columns: SqlColumn[]
  whereClause?: string
  limit?: number
}): { sql: string; explanation: string } {
  const cleanTable = tableName.trim() || 'my_table'
  const validCols = columns.filter((c) => c.name.trim().length > 0)
  const pkCol = validCols.find((c) => c.isPrimaryKey) || validCols[0]

  const quoteId = (name: string) => {
    switch (dialect) {
      case 'mysql':
        return `\`${name}\``
      case 'tsql':
        return `[${name}]`
      case 'postgres':
      case 'sqlite':
      case 'oracle':
      default:
        return `"${name}"`
    }
  }

  const formatValue = (col: SqlColumn): string => {
    if (col.sampleValue !== undefined && col.sampleValue.trim() !== '') {
      const val = col.sampleValue.trim()
      const t = col.type.toUpperCase()
      if (
        t.includes('INT') ||
        t.includes('DECIMAL') ||
        t.includes('NUMERIC') ||
        t.includes('FLOAT') ||
        t.includes('DOUBLE') ||
        t.includes('REAL')
      ) {
        return isNaN(Number(val)) ? '0' : val
      }
      if (t.includes('BOOL')) {
        return val.toLowerCase() === 'true' || val === '1' ? 'TRUE' : 'FALSE'
      }
      if (val === 'NULL' || val === 'CURRENT_TIMESTAMP' || val === 'NOW()') {
        return val
      }
      return `'${val.replace(/'/g, "''")}'`
    }

    // Default value generator berdasarkan tipe data
    const t = col.type.toUpperCase()
    if (t.includes('INT')) return '1'
    if (t.includes('DECIMAL') || t.includes('NUMERIC') || t.includes('FLOAT')) return '0.00'
    if (t.includes('BOOL')) return dialect === 'tsql' ? '1' : 'TRUE'
    if (t.includes('DATE') || t.includes('TIME')) {
      return dialect === 'postgres' ? 'NOW()' : dialect === 'mysql' ? 'NOW()' : 'CURRENT_TIMESTAMP'
    }
    if (t.includes('UUID')) return `'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'`
    return `'contoh_${col.name}'`
  }

  switch (action) {
    case 'SELECT': {
      const colList =
        validCols.length > 0
          ? validCols.map((c) => `  ${quoteId(c.name)}`).join(',\n')
          : '  *'
      const wherePart = whereClause?.trim()
        ? `\nWHERE ${whereClause.trim()}`
        : pkCol
        ? `\nWHERE ${quoteId(pkCol.name)} = ${formatValue(pkCol)}`
        : ''

      let limitPart = ''
      if (dialect === 'tsql') {
        // SELECT TOP N
        return {
          sql: `SELECT TOP ${limit}\n${colList}\nFROM ${quoteId(cleanTable)}${wherePart};`,
          explanation: `Mengambil maksimal ${limit} baris data dari tabel ${cleanTable} (Sintaks T-SQL TOP).`,
        }
      } else if (dialect === 'oracle') {
        limitPart = `\nFETCH NEXT ${limit} ROWS ONLY`
      } else {
        limitPart = `\nLIMIT ${limit}`
      }

      return {
        sql: `SELECT\n${colList}\nFROM ${quoteId(cleanTable)}${wherePart}${limitPart};`,
        explanation: `Mengambil kolom terpilih dari tabel ${cleanTable} dengan batasan ${limit} baris data.`,
      }
    }

    case 'INSERT': {
      // Kecualikan auto-increment dari insert standar jika ada
      const insertCols = validCols.filter((c) => !c.isAutoIncrement)
      const targetCols = insertCols.length > 0 ? insertCols : validCols

      let returnClause = ''
      if (dialect === 'postgres' && pkCol) {
        returnClause = `\nRETURNING ${quoteId(pkCol.name)}`
      } else if (dialect === 'tsql' && pkCol) {
        returnClause = `\nOUTPUT INSERTED.${quoteId(pkCol.name)}`
      }

      const sql = `INSERT INTO ${quoteId(cleanTable)} (\n  ${targetCols
        .map((c) => quoteId(c.name))
        .join(',\n  ')}\n)${dialect === 'tsql' ? returnClause : ''}\nVALUES (\n  ${targetCols
        .map((c) => formatValue(c))
        .join(',\n  ')}\n)${dialect === 'postgres' ? returnClause : ''};`

      return {
        sql,
        explanation: `Menyisipkan 1 record baru ke dalam tabel ${cleanTable}.${
          returnClause ? ' Mengembalikan ID record yang baru dibuat.' : ''
        }`,
      }
    }

    case 'UPDATE': {
      const updatableCols = validCols.filter((c) => !c.isPrimaryKey && !c.isAutoIncrement)
      const targetCols = updatableCols.length > 0 ? updatableCols : validCols
      const setParts = targetCols
        .map((c) => `  ${quoteId(c.name)} = ${formatValue(c)}`)
        .join(',\n')
      const wherePart = whereClause?.trim()
        ? `WHERE ${whereClause.trim()}`
        : pkCol
        ? `WHERE ${quoteId(pkCol.name)} = ${formatValue(pkCol)}`
        : 'WHERE id = 1'

      const sql = `UPDATE ${quoteId(cleanTable)}\nSET\n${setParts}\n${wherePart};`
      return {
        sql,
        explanation: `Memperbarui record di tabel ${cleanTable} berdasarkan kondisi filter WHERE.`,
      }
    }

    case 'DELETE': {
      const wherePart = whereClause?.trim()
        ? `WHERE ${whereClause.trim()}`
        : pkCol
        ? `WHERE ${quoteId(pkCol.name)} = ${formatValue(pkCol)}`
        : 'WHERE id = 1'

      const sql = `DELETE FROM ${quoteId(cleanTable)}\n${wherePart};`
      return {
        sql,
        explanation: `Menghapus baris data dari tabel ${cleanTable}. Selalu pastikan klausa WHERE sesuai.`,
      }
    }

    case 'UPSERT': {
      // Upsert dialect specific
      const nonPkCols = validCols.filter((c) => !c.isPrimaryKey)
      const allColNames = validCols.map((c) => quoteId(c.name)).join(', ')
      const allValues = validCols.map((c) => formatValue(c)).join(', ')

      if (dialect === 'postgres') {
        const conflictTarget = pkCol ? quoteId(pkCol.name) : 'id'
        const updates = nonPkCols
          .map((c) => `  ${quoteId(c.name)} = EXCLUDED.${quoteId(c.name)}`)
          .join(',\n')
        const sql = `INSERT INTO ${quoteId(cleanTable)} (${allColNames})\nVALUES (${allValues})\nON CONFLICT (${conflictTarget})\nDO UPDATE SET\n${updates};`
        return {
          sql,
          explanation: `PostgreSQL ON CONFLICT DO UPDATE (Upsert) untuk tabel ${cleanTable}.`,
        }
      } else if (dialect === 'mysql') {
        const updates = nonPkCols
          .map((c) => `  ${quoteId(c.name)} = VALUES(${quoteId(c.name)})`)
          .join(',\n')
        const sql = `INSERT INTO ${quoteId(cleanTable)} (${allColNames})\nVALUES (${allValues})\nON DUPLICATE KEY UPDATE\n${updates};`
        return {
          sql,
          explanation: `MySQL ON DUPLICATE KEY UPDATE (Upsert) untuk tabel ${cleanTable}.`,
        }
      } else if (dialect === 'sqlite') {
        const updates = nonPkCols
          .map((c) => `  ${quoteId(c.name)} = excluded.${quoteId(c.name)}`)
          .join(',\n')
        const conflictTarget = pkCol ? quoteId(pkCol.name) : 'id'
        const sql = `INSERT INTO ${quoteId(cleanTable)} (${allColNames})\nVALUES (${allValues})\nON CONFLICT(${conflictTarget}) DO UPDATE SET\n${updates};`
        return {
          sql,
          explanation: `SQLite 3.24+ ON CONFLICT DO UPDATE (Upsert).`,
        }
      } else {
        // T-SQL MERGE
        const sql = `MERGE INTO ${quoteId(cleanTable)} AS target\nUSING (SELECT ${allValues}) AS source (${allColNames})\nON (target.${quoteId(
          pkCol?.name || 'id'
        )} = source.${quoteId(pkCol?.name || 'id')})\nWHEN MATCHED THEN\n  UPDATE SET ${nonPkCols
          .map((c) => `target.${quoteId(c.name)} = source.${quoteId(c.name)}`)
          .join(', ')}\nWHEN NOT MATCHED THEN\n  INSERT (${allColNames})\n  VALUES (${allColNames.replace(
          /\[|\]/g,
          'source.'
        )});`
        return {
          sql,
          explanation: `T-SQL MERGE statement untuk Upsert atomik di SQL Server.`,
        }
      }
    }

    case 'CREATE TABLE':
    default: {
      const colDefinitions = validCols.map((c) => {
        let typeStr = c.type
        // Dialect data type mapping
        if (dialect === 'postgres') {
          if (c.isAutoIncrement) {
            typeStr = c.type.toUpperCase().includes('BIG') ? 'BIGSERIAL' : 'SERIAL'
          }
        } else if (dialect === 'mysql') {
          if (c.isAutoIncrement) {
            typeStr = `${c.type} AUTO_INCREMENT`
          }
        } else if (dialect === 'tsql') {
          if (c.isAutoIncrement) {
            typeStr = `${c.type} IDENTITY(1,1)`
          }
        } else if (dialect === 'sqlite') {
          if (c.isPrimaryKey && c.isAutoIncrement) {
            return `  ${quoteId(c.name)} INTEGER PRIMARY KEY AUTOINCREMENT`
          }
        }

        const parts = [`  ${quoteId(c.name)} ${typeStr}`]
        if (c.isPrimaryKey && dialect !== 'sqlite') {
          parts.push('PRIMARY KEY')
        }
        if (c.isNullable === false) {
          parts.push('NOT NULL')
        }
        if (c.defaultValue && c.defaultValue.trim() !== '') {
          parts.push(`DEFAULT ${c.defaultValue.trim()}`)
        }
        return parts.join(' ')
      })

      const sql = `CREATE TABLE ${quoteId(cleanTable)} (\n${colDefinitions.join(',\n')}\n);`
      return {
        sql,
        explanation: `Pernyataan DDL CREATE TABLE ${cleanTable} dengan ${validCols.length} kolom sesuai dialek ${dialect.toUpperCase()}.`,
      }
    }
  }
}
