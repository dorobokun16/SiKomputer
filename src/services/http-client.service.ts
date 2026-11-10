/**
 * SiKomputer - HTTP Client Service
 * 100% Client-Side fetch executor, CORS diagnostic & Code Exporter
 */

import { db, type ApiHistoryEntity } from '@/db/dexie'

export interface KeyValueItem {
  key: string
  value: string
  on: boolean
}

export interface HttpRequestOptions {
  method: string
  url: string
  params?: KeyValueItem[]
  headers?: KeyValueItem[]
  authType?: 'none' | 'bearer' | 'basic' | 'apikey'
  authToken?: string
  authKey?: string
  authValue?: string
  bodyType?: 'none' | 'json' | 'form' | 'raw'
  bodyContent?: string
}

export interface HttpResponseResult {
  status: number
  statusText: string
  timeMs: number
  sizeBytes: number
  headers: Record<string, string>
  body: string
  isJson: boolean
  isCorsError: boolean
  error?: string
}

/**
 * Eksekusi HTTP Request via native fetch di browser
 */
export async function executeHttpRequest(opts: HttpRequestOptions): Promise<HttpResponseResult> {
  let finalUrl = opts.url.trim()
  if (!finalUrl) {
    throw new Error('Alamat URL wajib diisi.')
  }
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl
  }

  // 1. Susun URL Query Parameters
  if (opts.params && opts.params.length > 0) {
    try {
      const urlObj = new URL(finalUrl)
      opts.params.forEach((p) => {
        if (p.on && p.key.trim()) {
          urlObj.searchParams.append(p.key.trim(), p.value)
        }
      })
      finalUrl = urlObj.toString()
    } catch {
      // jika URL relatif atau format khusus
    }
  }

  // 2. Susun Headers
  const requestHeaders = new Headers()
  if (opts.headers) {
    opts.headers.forEach((h) => {
      if (h.on && h.key.trim()) {
        requestHeaders.set(h.key.trim(), h.value)
      }
    })
  }

  // Auth header
  if (opts.authType === 'bearer' && opts.authToken) {
    requestHeaders.set('Authorization', `Bearer ${opts.authToken.trim()}`)
  } else if (opts.authType === 'apikey' && opts.authKey && opts.authValue) {
    requestHeaders.set(opts.authKey.trim(), opts.authValue)
  }

  // 3. Susun Body
  let requestBody: string | undefined = undefined
  if (opts.method !== 'GET' && opts.method !== 'HEAD' && opts.bodyType !== 'none') {
    if (opts.bodyType === 'json') {
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
      }
      requestBody = opts.bodyContent
    } else if (opts.bodyType === 'raw' || opts.bodyType === 'form') {
      requestBody = opts.bodyContent
    }
  }

  const startTime = performance.now()

  try {
    const res = await fetch(finalUrl, {
      method: opts.method,
      headers: requestHeaders,
      body: requestBody,
    })

    const duration = Math.round(performance.now() - startTime)
    const resHeaders: Record<string, string> = {}
    res.headers.forEach((val, key) => {
      resHeaders[key] = val
    })

    const text = await res.text()
    const sizeBytes = new Blob([text]).size

    let isJson = false
    try {
      JSON.parse(text)
      isJson = true
    } catch {
      isJson = false
    }

    const result: HttpResponseResult = {
      status: res.status,
      statusText: res.statusText,
      timeMs: duration,
      sizeBytes,
      headers: resHeaders,
      body: text,
      isJson,
      isCorsError: false,
    }

    // Rekam riwayat ke IndexedDB
    void saveToHistory(opts, result)

    return result
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime)
    const isCors =
      err?.name === 'TypeError' &&
      (err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('Load failed'))

    const result: HttpResponseResult = {
      status: 0,
      statusText: isCors ? 'CORS / Network Error' : 'Error',
      timeMs: duration,
      sizeBytes: 0,
      headers: {},
      body: isCors
        ? JSON.stringify(
            {
              error: 'Permintaan Diblokir oleh Kebijakan CORS Peramban (Cross-Origin Resource Sharing).',
              penjelasan:
                'Browser modern memblokir request langsung ke domain eksternal yang tidak menyertakan header `Access-Control-Allow-Origin: *`.',
              solusi: [
                'Uji endpoint lokal Anda (misal http://localhost:3000 atau 8000) yang sudah mengaktifkan CORS.',
                'Gunakan ekstensi browser CORS Unblock / Allow CORS saat melakukan pengetesan API pihak ketiga.',
                'Atau deploy proxy ringan via Cloudflare Worker gratis (Rp 0).',
              ],
            },
            null,
            2,
          )
        : err?.message || 'Gagal mengirim request.',
      isJson: isCors,
      isCorsError: isCors,
      error: err?.message,
    }

    void saveToHistory(opts, result)
    return result
  }
}

/**
 * Simpan request ke riwayat IndexedDB
 */
async function saveToHistory(opts: HttpRequestOptions, result: HttpResponseResult) {
  try {
    const item: ApiHistoryEntity = {
      id: crypto.randomUUID(),
      method: opts.method,
      url: opts.url,
      status: result.status,
      durationMs: result.timeMs,
      sizeBytes: result.sizeBytes,
      responsePreview: result.body.slice(0, 120),
      createdAt: new Date().toISOString(),
    }
    await db.apiHistory.add(item)

    // Jaga agar history maksimal 50 item terbaru
    const count = await db.apiHistory.count()
    if (count > 50) {
      const oldest = await db.apiHistory.orderBy('createdAt').first()
      if (oldest) await db.apiHistory.delete(oldest.id)
    }
  } catch (err) {
    console.warn('Gagal menyimpan riwayat API:', err)
  }
}

/* ================= 4 Code Exporters ================= */

/**
 * 1. Export cURL
 */
export function generateCurl(opts: HttpRequestOptions): string {
  let curl = `curl -X ${opts.method} "${opts.url}"`

  if (opts.headers) {
    opts.headers.forEach((h) => {
      if (h.on && h.key.trim()) {
        curl += ` \\\n  -H "${h.key}: ${h.value}"`
      }
    })
  }

  if (opts.authType === 'bearer' && opts.authToken) {
    curl += ` \\\n  -H "Authorization: Bearer ${opts.authToken}"`
  }

  if (opts.bodyContent && opts.method !== 'GET') {
    curl += ` \\\n  -d '${opts.bodyContent.replace(/'/g, "'\\''")}'`
  }

  return curl
}

/**
 * 2. Export Python (requests)
 */
export function generatePython(opts: HttpRequestOptions): string {
  const headersObj: Record<string, string> = {}
  if (opts.headers) {
    opts.headers.forEach((h) => {
      if (h.on && h.key.trim()) headersObj[h.key] = h.value
    })
  }
  if (opts.authType === 'bearer' && opts.authToken) {
    headersObj['Authorization'] = `Bearer ${opts.authToken}`
  }

  return `import requests

url = "${opts.url}"
headers = ${JSON.stringify(headersObj, null, 4)}
${opts.bodyContent && opts.method !== 'GET' ? `payload = ${JSON.stringify(opts.bodyContent)}\n` : ''}
response = requests.${opts.method.toLowerCase()}(
    url,
    headers=headers${opts.bodyContent && opts.method !== 'GET' ? ',\n    data=payload' : ''}
)

print(response.status_code)
print(response.text)
`
}

/**
 * 3. Export JavaScript (fetch)
 */
export function generateFetch(opts: HttpRequestOptions): string {
  const headersObj: Record<string, string> = {}
  if (opts.headers) {
    opts.headers.forEach((h) => {
      if (h.on && h.key.trim()) headersObj[h.key] = h.value
    })
  }
  if (opts.authType === 'bearer' && opts.authToken) {
    headersObj['Authorization'] = `Bearer ${opts.authToken}`
  }

  return `const response = await fetch("${opts.url}", {
  method: "${opts.method}",
  headers: ${JSON.stringify(headersObj, null, 2)},
  ${opts.bodyContent && opts.method !== 'GET' ? `body: JSON.stringify(${opts.bodyContent}),` : ''}
});

const data = await response.json();
console.log(data);`
}

/**
 * 4. Export n8n HTTP Request node JSON
 */
export function generateN8n(opts: HttpRequestOptions): string {
  const n8nNode = {
    parameters: {
      url: opts.url,
      requestMethod: opts.method,
      jsonParameters: opts.bodyType === 'json',
      options: {},
    },
    id: crypto.randomUUID(),
    name: 'HTTP Request (SiKomputer)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [250, 300],
  }
  return JSON.stringify(n8nNode, null, 2)
}

/* ================= 5. cURL Parser (Tempel cURL) ================= */

export interface ParsedCurlResult {
  method: string
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  authType: 'none' | 'bearer' | 'basic' | 'apikey'
  authToken?: string
  bodyType: 'none' | 'json' | 'raw'
  bodyContent?: string
}

/**
 * Tokenize shell command strings respecting quotes and backslashes
 */
function tokenizeCurlCommand(command: string): string[] {
  const cleanCmd = command
    .replace(/\^\r?\n/g, ' ')
    .replace(/\\\r?\n/g, ' ')
    .trim()

  const tokens: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let isEscaped = false

  for (let i = 0; i < cleanCmd.length; i++) {
    const char = cleanCmd[i]

    if (isEscaped) {
      current += char
      isEscaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Parser Perintah cURL: Ekstraksi Method, URL, Query Params, Headers, Auth & Body otomatis
 */
export function parseCurl(curlCommand: string): ParsedCurlResult {
  const tokens = tokenizeCurlCommand(curlCommand)
  if (tokens.length === 0) {
    throw new Error('Perintah cURL kosong.')
  }

  let startIdx = 0
  if (tokens[0].toLowerCase() === 'curl') {
    startIdx = 1
  }

  let method = 'GET'
  let rawUrl = ''
  const headers: KeyValueItem[] = []
  const params: KeyValueItem[] = []
  let authType: 'none' | 'bearer' | 'basic' | 'apikey' = 'none'
  let authToken = ''
  let bodyType: 'none' | 'json' | 'raw' = 'none'
  let bodyContent = ''

  let hasExplicitMethod = false
  let hasBody = false

  for (let i = startIdx; i < tokens.length; i++) {
    const token = tokens[i]

    // Method flag: -X, --request
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase()
        hasExplicitMethod = true
      }
      continue
    }

    // Header flag: -H, --header
    if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i]
        const colonIdx = headerStr.indexOf(':')
        if (colonIdx !== -1) {
          const key = headerStr.slice(0, colonIdx).trim()
          const value = headerStr.slice(colonIdx + 1).trim()

          // Cek Authorization Bearer
          if (key.toLowerCase() === 'authorization' && /^Bearer\s+/i.test(value)) {
            authType = 'bearer'
            authToken = value.replace(/^Bearer\s+/i, '').trim()
          } else {
            headers.push({ key, value, on: true })
          }
        } else {
          headers.push({ key: headerStr.trim(), value: '', on: true })
        }
      }
      continue
    }

    // Body flag: -d, --data, --data-raw, --data-ascii, --data-binary
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-ascii' ||
      token === '--data-binary'
    ) {
      if (i + 1 < tokens.length) {
        bodyContent = tokens[++i]
        hasBody = true
      }
      continue
    }

    // Basic Auth: -u, --user
    if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const userPass = tokens[++i]
        try {
          const basicEncoded = btoa(userPass)
          headers.push({ key: 'Authorization', value: `Basic ${basicEncoded}`, on: true })
        } catch {
          // ignore btoa error
        }
      }
      continue
    }

    // URL flag: --url
    if (token === '--url') {
      if (i + 1 < tokens.length) {
        rawUrl = tokens[++i]
      }
      continue
    }

    // Skip flags that take an argument
    if (
      [
        '-A',
        '--user-agent',
        '-b',
        '--cookie',
        '-e',
        '--referer',
        '-o',
        '--output',
        '-m',
        '--max-time',
        '--connect-timeout',
        '-F',
        '--form',
      ].includes(token)
    ) {
      i++
      continue
    }

    // Skip boolean flags
    if (
      [
        '-k',
        '--insecure',
        '-s',
        '--silent',
        '-v',
        '--verbose',
        '-L',
        '--location',
        '--compressed',
        '-i',
        '--include',
        '-g',
        '--globoff',
      ].includes(token)
    ) {
      continue
    }

    // Jika belum ada URL dan bukan flag
    if (!token.startsWith('-') && !rawUrl) {
      rawUrl = token
    }
  }

  // Jika ada -d tapi tanpa -X explisit, cURL default ke POST
  if (hasBody && !hasExplicitMethod) {
    method = 'POST'
  }

  // Format body jika ada
  if (hasBody && bodyContent) {
    try {
      const parsedJson = JSON.parse(bodyContent)
      bodyType = 'json'
      bodyContent = JSON.stringify(parsedJson, null, 2)
    } catch {
      bodyType = 'raw'
    }
  }

  // Ekstraksi Query Parameters dari URL
  let finalCleanUrl = rawUrl
  if (rawUrl) {
    try {
      const dummyBase = /^https?:\/\//i.test(rawUrl) ? undefined : 'https://dummy.local'
      const parsedUrl = new URL(rawUrl, dummyBase)

      parsedUrl.searchParams.forEach((val, key) => {
        params.push({ key, value: val, on: true })
      })

      // Bersihkan search params dari URL field agar dipetakan di tabel params
      if (parsedUrl.search) {
        finalCleanUrl = rawUrl.split('?')[0]
      }
    } catch {
      //
    }
  }

  // Tambahkan baris kosong di akhir params dan headers untuk kenyamanan
  if (params.length === 0 || params[params.length - 1].key !== '') {
    params.push({ key: '', value: '', on: true })
  }
  if (headers.length === 0 || headers[headers.length - 1].key !== '') {
    headers.push({ key: '', value: '', on: true })
  }

  return {
    method,
    url: finalCleanUrl,
    params,
    headers,
    authType,
    authToken,
    bodyType,
    bodyContent,
  }
}

