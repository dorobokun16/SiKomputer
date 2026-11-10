import {
  ArrowRightLeft,
  Binary,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Download,
  FileText,
  History,
  Image as ImageIcon,
  Play,
  Send,
  Terminal,
  Trash2,
  XCircle,
  FolderOpen,
  Copy,
  FileCode,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { db, type ApiHistoryEntity } from '@/db/dexie'
import {
  fileToBase64,
  base64ToFile,
  isValidBase64,
  textToBase64,
  base64ToText,
  type Base64EncodeResult,
  type Base64DecodeResult,
} from '@/services/base64.service'
import {
  executeHttpRequest,
  generateCurl,
  generateFetch,
  generateN8n,
  generatePython,
  parseCurl,
  type HttpRequestOptions,
  type HttpResponseResult,
  type KeyValueItem,
} from '@/services/http-client.service'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Chip,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/primitives'
import { Modal, Segmented, Tabs, useToast } from '@/components/ui/overlays'
import {
  CodeBlock,
  Dropzone,
  HttpMethodBadge,
  KeyValueEditor,
  PageHeader,
  StatusBadge,
  type KV,
} from '@/components/ui/blocks'
import { cn } from '@/lib/cn'

/* =========================================================================
   1. BASE64 STUDIO
   ========================================================================= */

const sampleBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

export function Base64Page() {
  type Mode = 'text-enc' | 'text-dec' | 'file-enc' | 'file-dec'
  const [mode, setMode] = useState<Mode>('text-enc')
  const toast = useToast()

  // ================= 1. TEKS KE BASE64 (ENCODE) =================
  const [textInput, setTextInput] = useState(
    'Halo! Selamat datang di SiKomputer — All-in-One Local Productivity Hub 🚀'
  )
  const [textFmt, setTextFmt] = useState<'raw' | 'url' | 'uri' | 'chunked'>('raw')
  const textEncResult = useMemo(() => textToBase64(textInput), [textInput])

  const currentTextEncOutput = useMemo(() => {
    if (!textEncResult.raw) return ''
    if (textFmt === 'url') return textEncResult.urlSafe
    if (textFmt === 'uri') return textEncResult.dataUri
    if (textFmt === 'chunked') return textEncResult.chunked
    return textEncResult.raw
  }, [textEncResult, textFmt])

  // ================= 2. BASE64 KE TEKS (DECODE) =================
  const [b64TextInput, setB64TextInput] = useState(
    'SGFsbyEgU2VsYW1hdCBkYXRhbmcgcGFkYSBTaUtvbXB1dGVyIOKAlCBBbGwtaW4tT25lIExvY2FsIFByb2R1Y3Rpdml0eSBIdWIg8J-agA=='
  )
  const textDecResult = useMemo(() => base64ToText(b64TextInput), [b64TextInput])

  // ================= 3. FILE KE BASE64 (ENCODE) =================
  const [encResult, setEncResult] = useState<Base64EncodeResult | null>(null)
  const [encLoading, setEncLoading] = useState(false)
  const [fileFmt, setFileFmt] = useState<'raw' | 'uri' | 'url'>('raw')

  // ================= 4. BASE64 KE FILE (DECODE) =================
  const [decInput, setDecInput] = useState(sampleBase64)
  const [customFileName, setCustomFileName] = useState('hasil-dekode')
  const [decResult, setDecResult] = useState<Base64DecodeResult | null>(null)

  // Jalankan dekode awal atau saat input berubah
  useEffect(() => {
    if (mode === 'file-dec') {
      if (isValidBase64(decInput)) {
        const res = base64ToFile(decInput, customFileName)
        setDecResult(res)
      } else {
        setDecResult(null)
      }
    }
  }, [decInput, customFileName, mode])

  // Handler Pilih Berkas
  const handleFilePicked = async (file: File) => {
    setEncLoading(true)
    try {
      const res = await fileToBase64(file)
      setEncResult(res)
      toast({ title: 'Berkas Berhasil Dikonversi ke Base64', tone: 'success' })
    } catch {
      toast({ title: 'Gagal mengonversi berkas', tone: 'danger' })
    } finally {
      setEncLoading(false)
    }
  }

  // Load sample file
  const handleLoadSampleFile = () => {
    setEncResult({
      fileName: 'sikomputer-sample.png',
      mimeType: 'image/png',
      originalSize: 68,
      raw: sampleBase64,
      dataUri: `data:image/png;base64,${sampleBase64}`,
      urlSafe: sampleBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      characterCount: sampleBase64.length,
    })
  }

  // Current encoded string according to selected format (File)
  const currentFileOutput = encResult
    ? fileFmt === 'uri'
      ? encResult.dataUri
      : fileFmt === 'url'
        ? encResult.urlSafe
        : encResult.raw
    : ''

  // Salin ke Clipboard helper
  const handleCopy = (content: string, label: string) => {
    if (!content) return
    void navigator.clipboard.writeText(content)
    toast({ title: `${label} disalin ke clipboard!`, tone: 'success' })
  }

  // Unduh berkas teks helper
  const handleDownloadTxt = (content: string, filename: string) => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: `Berkas ${filename} berhasil diunduh!`, tone: 'success' })
  }

  // Download decoded binary file
  const handleDownloadDecodedFile = () => {
    if (!decResult || !decResult.isValid) return
    const a = document.createElement('a')
    a.href = decResult.objectUrl
    a.download = decResult.fileName
    a.click()
  }

  // Tukar Teks ke Base64 -> Base64 ke Teks
  const handleSwapTextEncToDec = () => {
    if (!currentTextEncOutput) return
    setB64TextInput(currentTextEncOutput)
    setMode('text-dec')
    toast({
      title: 'Beralih ke Base64 → Teks',
      description: 'Hasil Base64 dipindahkan ke input dekoder untuk verifikasi.',
      tone: 'info',
    })
  }

  // Tukar Base64 ke Teks -> Teks ke Base64
  const handleSwapTextDecToEnc = () => {
    if (!textDecResult.text) return
    setTextInput(textDecResult.text)
    setMode('text-enc')
    toast({
      title: 'Beralih ke Teks → Base64',
      description: 'Hasil teks dipindahkan ke input enkoder.',
      tone: 'info',
    })
  }

  const isFileBase64Valid = isValidBase64(decInput)
  const isTextB64Valid = isValidBase64(b64TextInput)

  return (
    <>
      <PageHeader
        title="Base64 Studio"
        description="Konversi dua arah Teks & Berkas dengan Base64 standar, URL-Safe, Data URI, dan deteksi Magic Bytes — 100% diproses di perangkat lokal Anda"
        icon={<Binary className="size-5" />}
        color="var(--mod-dev)"
        actions={
          <Segmented
            value={mode}
            onChange={(val) => setMode(val as Mode)}
            options={[
              { id: 'text-enc', label: 'Teks → Base64', icon: <FileText className="size-3.5" /> },
              { id: 'text-dec', label: 'Base64 → Teks', icon: <Binary className="size-3.5" /> },
              { id: 'file-enc', label: 'File → Base64', icon: <ImageIcon className="size-3.5" /> },
              { id: 'file-dec', label: 'Base64 → File', icon: <Download className="size-3.5" /> },
            ]}
          />
        }
      />

      {/* 1. TEKS KE BASE64 */}
      {mode === 'text-enc' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Input Teks Biasa (UTF-8)"
              subtitle="Mendukung multibyte UTF-8, emoji, JSON, & token"
            />
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted font-medium">Contoh Cepat:</span>
                <Chip
                  onClick={() =>
                    setTextInput(
                      'Halo Dunia! 🌟 Selamat datang di workstation lokal SiKomputer.'
                    )
                  }
                  className="cursor-pointer"
                >
                  Pesan Teks
                </Chip>
                <Chip
                  onClick={() =>
                    setTextInput(
                      '{\n  "service": "SiKomputer Base64",\n  "status": "active",\n  "offline": true\n}'
                    )
                  }
                  className="cursor-pointer"
                >
                  JSON Payload
                </Chip>
                <Chip
                  onClick={() => setTextInput('admin:SuperSecretPass2026!')}
                  className="cursor-pointer"
                >
                  Basic Auth
                </Chip>
                <Chip
                  onClick={() =>
                    setTextInput(
                      'Karakter UTF-8: 🚀 🇮🇩 — “Petik Cantik” & Simbol €150'
                    )
                  }
                  className="cursor-pointer"
                >
                  Simbol & Emoji
                </Chip>
              </div>

              <Textarea
                mono
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-56 font-mono text-xs"
                placeholder="Ketik atau tempel teks biasa di sini..."
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <div className="flex gap-2">
                  <Badge tone="neutral">
                    {textEncResult.charCount.toLocaleString()} Karakter
                  </Badge>
                  <Badge tone="info">
                    {textEncResult.byteCount.toLocaleString()} Byte (UTF-8)
                  </Badge>
                </div>
                {textInput && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="size-3.5" />}
                    onClick={() => setTextInput('')}
                  >
                    Bersihkan
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hasil Konversi Base64"
              action={
                <Segmented
                  size="sm"
                  value={textFmt}
                  onChange={setTextFmt}
                  options={[
                    { id: 'raw', label: 'RFC 4648' },
                    { id: 'url', label: 'URL-Safe' },
                    { id: 'uri', label: 'Data URI' },
                    { id: 'chunked', label: '76-Col' },
                  ]}
                />
              }
            />
            <div className="space-y-4 p-4">
              {textInput ? (
                <>
                  <CodeBlock
                    label={`base64 (${textFmt})`}
                    code={currentTextEncOutput}
                    maxHeight={230}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {currentTextEncOutput.length.toLocaleString()} karakter (+33% Base64 overhead)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        icon={<Copy className="size-3.5" />}
                        onClick={() => handleCopy(currentTextEncOutput, 'String Base64')}
                      >
                        Salin
                      </Button>
                      <Button
                        size="sm"
                        icon={<Download className="size-3.5" />}
                        onClick={() =>
                          handleDownloadTxt(currentTextEncOutput, 'encoded_base64.txt')
                        }
                      >
                        Unduh .txt
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRightLeft className="size-3.5" />}
                        onClick={handleSwapTextEncToDec}
                      >
                        Tukar ke Dekoder
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-14 text-center text-[13px] text-muted">
                  Ketik atau tempel teks pada sisi kiri untuk melihat hasil konversi Base64 seketika.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 2. BASE64 KE TEKS */}
      {mode === 'text-dec' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Masukan String Base64"
              action={
                b64TextInput ? (
                  isTextB64Valid ? (
                    <Badge tone="success">
                      <CheckCircle2 className="size-3" />
                      Base64 Valid ({textDecResult.byteCount} bytes)
                    </Badge>
                  ) : (
                    <Badge tone="danger">
                      <XCircle className="size-3" />
                      Karakter Tidak Valid
                    </Badge>
                  )
                ) : (
                  <Badge tone="neutral">Menunggu Input</Badge>
                )
              }
            />
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted font-medium">Contoh Cepat:</span>
                <Chip
                  onClick={() =>
                    setB64TextInput(
                      'SGFsbyEgU2VsYW1hdCBkYXRhbmcgcGFkYSBTaUtvbXB1dGVyIOKAlCBBbGwtaW4tT25lIExvY2FsIFByb2R1Y3Rpdml0eSBIdWIg8J-agA=='
                    )
                  }
                  className="cursor-pointer"
                >
                  Preset Teks
                </Chip>
                <Chip
                  onClick={() =>
                    setB64TextInput(
                      'ewogICJ1c2VyIjogIkl3YW4gS3Vybmlhd2FuIiwKICAicm9sZSI6ICJNYXN0ZXIgQWRtaW4iLAogICJhY3RpdmUiOiB0cnVlCn0='
                    )
                  }
                  className="cursor-pointer"
                >
                  Preset JSON
                </Chip>
                <Chip
                  onClick={() =>
                    setB64TextInput('SGFsbyBEdW5pYSEg8J-MnyBTaUtvbXB1dGVy')
                  }
                  className="cursor-pointer"
                >
                  Preset URL-Safe
                </Chip>
              </div>

              <Textarea
                mono
                value={b64TextInput}
                onChange={(e) => setB64TextInput(e.target.value)}
                className="min-h-56 font-mono text-xs"
                placeholder="Tempel string Base64 atau Data URI (data:text/plain;base64,...)"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <p>
                  Prefix <code className="font-mono text-text">data:text/plain;base64,</code> dan variasi URL-safe otomatis dikenali.
                </p>
                {b64TextInput && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="size-3.5" />}
                    onClick={() => setB64TextInput('')}
                  >
                    Bersihkan
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hasil Teks Asli (UTF-8)"
              subtitle="Rekonstruksi karakter asli dari representasi Base64"
            />
            <div className="space-y-4 p-4">
              {textDecResult.isValid && textDecResult.text ? (
                <>
                  <CodeBlock
                    label="decoded text"
                    code={textDecResult.text}
                    maxHeight={230}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <div className="flex gap-2">
                      <Badge tone="neutral">
                        {textDecResult.charCount.toLocaleString()} Karakter
                      </Badge>
                      <Badge tone="success">
                        {textDecResult.byteCount.toLocaleString()} Byte (UTF-8)
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        icon={<Copy className="size-3.5" />}
                        onClick={() => handleCopy(textDecResult.text, 'Hasil Teks')}
                      >
                        Salin
                      </Button>
                      <Button
                        size="sm"
                        icon={<Download className="size-3.5" />}
                        onClick={() =>
                          handleDownloadTxt(textDecResult.text, 'decoded_text.txt')
                        }
                      >
                        Unduh .txt
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRightLeft className="size-3.5" />}
                        onClick={handleSwapTextDecToEnc}
                      >
                        Tukar ke Enkoder
                      </Button>
                    </div>
                  </div>
                </>
              ) : !textDecResult.isValid ? (
                <div className="py-14 text-center text-xs text-danger flex flex-col items-center gap-2">
                  <AlertTriangle className="size-6 text-danger" />
                  <span>
                    String Base64 tidak valid atau mengandung karakter korup. Pastikan hanya menggunakan karakter Base64 yang sah.
                  </span>
                </div>
              ) : (
                <div className="py-14 text-center text-[13px] text-muted">
                  Tempelkan string Base64 pada sisi kiri untuk melihat hasil dekode teks seketika.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 3. FILE KE BASE64 */}
      {mode === 'file-enc' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Input Berkas"
              subtitle="Gambar, PDF, audio, atau berkas apa pun (Maks 50 MB langsung di browser)"
            />
            <div className="p-4 space-y-4">
              {encResult ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
                  <span className="flex size-12 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <ImageIcon className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm">{encResult.fileName}</p>
                    <p className="text-xs text-muted">
                      {(encResult.originalSize / 1024).toFixed(1)} KB · {encResult.mimeType}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEncResult(null)}>
                    Ganti
                  </Button>
                </div>
              ) : (
                <Dropzone
                  compact
                  title="Tarik & lepas file di sini"
                  hint="PNG, JPEG, PDF, SVG, ZIP, dan dokumen didukung"
                  onFile={handleFilePicked}
                />
              )}

              <Button className="w-full" variant="secondary" onClick={handleLoadSampleFile}>
                Gunakan Contoh PNG (1×1 Pixel)
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hasil Base64 Berkas"
              action={
                <Segmented
                  size="sm"
                  value={fileFmt}
                  onChange={setFileFmt}
                  options={[
                    { id: 'raw', label: 'Raw' },
                    { id: 'uri', label: 'Data URI' },
                    { id: 'url', label: 'URL-Safe' },
                  ]}
                />
              }
            />
            <div className="space-y-4 p-4">
              {encLoading ? (
                <div className="space-y-2 py-8">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : encResult ? (
                <>
                  <CodeBlock label={`base64 (${fileFmt})`} code={currentFileOutput} maxHeight={220} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {currentFileOutput.length.toLocaleString()} karakter · asli{' '}
                      {(encResult.originalSize / 1024).toFixed(1)} KB (+33% Base64 overhead)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        icon={<Copy className="size-3.5" />}
                        onClick={() => handleCopy(currentFileOutput, 'String Base64')}
                      >
                        Salin
                      </Button>
                      <Button
                        size="sm"
                        icon={<Download className="size-3.5" />}
                        onClick={() => handleDownloadTxt(currentFileOutput, `${encResult.fileName}.txt`)}
                      >
                        Unduh .txt
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-14 text-center text-[13px] text-muted">
                  Pilih berkas di sisi kiri untuk melihat hasil konversi Base64 instan.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 4. BASE64 KE FILE */}
      {mode === 'file-dec' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Masukan String Base64 Berkas"
              action={
                isFileBase64Valid ? (
                  <Badge tone="success">
                    <CheckCircle2 className="size-3" />
                    Base64 Valid
                  </Badge>
                ) : (
                  <Badge tone="danger">
                    <XCircle className="size-3" />
                    Karakter Tidak Valid
                  </Badge>
                )
              }
            />
            <div className="p-4 space-y-3">
              <Textarea
                mono
                value={decInput}
                onChange={(e) => setDecInput(e.target.value)}
                className="min-h-64 font-mono text-xs"
                placeholder="Tempel string Base64 atau Data URI (data:image/png;base64,...)"
              />
              <p className="text-xs text-muted">
                Prefix <code className="font-mono text-text">data:mime;base64,</code> dan variasi URL-safe otomatis dikenali.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pratinjau &amp; Ekstraksi Berkas" />
            <div className="space-y-4 p-4">
              {decResult && decResult.isValid ? (
                <>
                  {decResult.mimeType.startsWith('image/') ? (
                    <div className="flex h-44 items-center justify-center rounded-lg border border-border bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px] overflow-hidden p-2">
                      <img
                        src={decResult.objectUrl}
                        alt="Pratinjau"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-border bg-surface-2 text-muted">
                      <FileCode className="size-10 mb-2 text-primary" />
                      <span className="text-xs font-medium text-text">Berkas Dokumen / Biner</span>
                      <span className="text-[11px] text-muted">{decResult.mimeType}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-[13px] rounded-lg border border-border bg-surface-2 p-3">
                    <div>
                      <p className="text-xs text-muted">MIME Terdeteksi (Magic Bytes)</p>
                      <p className="font-mono font-semibold text-text">{decResult.mimeType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Ukuran Berkas Nyata</p>
                      <p className="font-semibold text-text">
                        {decResult.size < 1024
                          ? `${decResult.size} byte`
                          : `${(decResult.size / 1024).toFixed(1)} KB`}
                      </p>
                    </div>
                  </div>

                  <Field label="Nama Berkas untuk Diunduh">
                    <Input
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="nama-berkas"
                    />
                  </Field>

                  <Button
                    variant="primary"
                    className="w-full"
                    icon={<Download className="size-4" />}
                    onClick={handleDownloadDecodedFile}
                  >
                    Unduh Berkas Asli ({decResult.fileName})
                  </Button>
                </>
              ) : (
                <div className="py-14 text-center text-xs text-danger flex flex-col items-center gap-2">
                  <AlertTriangle className="size-6 text-danger" />
                  <span>Masukkan string Base64 yang valid untuk menghasilkan berkas.</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

/* =========================================================================
   2. API TESTER
   ========================================================================= */

const initialPresets = [
  { name: 'Get Post (JSONPlaceholder)', method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' },
  { name: 'List Users (JSONPlaceholder)', method: 'GET', url: 'https://jsonplaceholder.typicode.com/users' },
  { name: 'Create Post (JSONPlaceholder)', method: 'POST', url: 'https://jsonplaceholder.typicode.com/posts' },
  { name: 'Localhost Ping', method: 'GET', url: 'http://localhost:3000/api/health' },
]

export function ApiTesterPage() {
  const [tab, setTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'code'>('body')
  const [rTab, setRTab] = useState<'pretty' | 'raw' | 'headers'>('pretty')
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [headers, setHeaders] = useState<KV[]>([
    { key: 'Accept', value: 'application/json', on: true },
    { key: '', value: '', on: true },
  ])
  const [params, setParams] = useState<KV[]>([{ key: '', value: '', on: true }])
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'apikey'>('none')
  const [authToken, setAuthToken] = useState('')
  const [bodyType, setBodyType] = useState<'json' | 'raw' | 'none'>('json')
  const [bodyContent, setBodyContent] = useState('{\n  "title": "Halo SiKomputer",\n  "body": "Workstation lokal",\n  "userId": 1\n}')

  const [responseResult, setResponseResult] = useState<HttpResponseResult | null>(null)
  const [historyList, setHistoryList] = useState<ApiHistoryEntity[]>([])
  const [sideOpen, setSideOpen] = useState(false)
  const [curlModalOpen, setCurlModalOpen] = useState(false)
  const [curlInput, setCurlInput] = useState('')
  const toast = useToast()

  // Load history from db
  const loadHistory = async () => {
    try {
      const list = await db.apiHistory.reverse().sortBy('createdAt')
      setHistoryList(list.slice(0, 20))
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  // Handler Tempel & Parse cURL Otomatis
  const handleApplyCurl = (rawCurl: string) => {
    try {
      const parsed = parseCurl(rawCurl)
      setMethod(parsed.method)
      setUrl(parsed.url)
      setParams(parsed.params)
      setHeaders(parsed.headers)
      setAuthType(parsed.authType)
      if (parsed.authToken) setAuthToken(parsed.authToken)
      setBodyType(parsed.bodyType)
      if (parsed.bodyContent) setBodyContent(parsed.bodyContent)

      // Tab navigasi otomatis ke bagian terpenting
      if (parsed.bodyType !== 'none' && parsed.bodyContent) {
        setTab('body')
      } else if (parsed.headers.some((h) => h.key)) {
        setTab('headers')
      } else if (parsed.params.some((p) => p.key)) {
        setTab('params')
      }

      setCurlModalOpen(false)
      setCurlInput('')
      toast({
        title: 'Perintah cURL Berhasil Diimpor!',
        description: `${parsed.method} ${parsed.url} (${parsed.headers.filter((h) => h.key).length} header, ${parsed.params.filter((p) => p.key).length} param).`,
        tone: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Gagal Mengurai cURL',
        description: err?.message || 'Pastikan sintaks diawali dengan "curl" atau argumen flag yang valid.',
        tone: 'danger',
      })
    }
  }

  // Execute Request
  const handleSend = async () => {
    setState('loading')
    try {
      const opts: HttpRequestOptions = {
        method,
        url,
        params: params as KeyValueItem[],
        headers: headers as KeyValueItem[],
        authType,
        authToken,
        bodyType,
        bodyContent,
      }
      const res = await executeHttpRequest(opts)
      setResponseResult(res)
      setState('done')
      void loadHistory()

      if (res.isCorsError) {
        toast({ title: 'Permintaan Diblokir CORS', description: 'Lihat tab respons untuk penjelasan.', tone: 'warning' })
      } else if (res.status >= 200 && res.status < 300) {
        toast({ title: `Sukses (${res.status} ${res.statusText})`, tone: 'success' })
      } else {
        toast({ title: `Status ${res.status} ${res.statusText}`, tone: 'danger' })
      }
    } catch (err: any) {
      toast({ title: 'Gagal mengirim request', description: err?.message, tone: 'danger' })
      setState('idle')
    }
  }

  // Load Preset or History Item
  const handleSelectPreset = (item: { method: string; url: string }) => {
    setMethod(item.method)
    setUrl(item.url)
    if (sideOpen) setSideOpen(false)
  }

  const currentOpts: HttpRequestOptions = {
    method,
    url,
    params: params as KeyValueItem[],
    headers: headers as KeyValueItem[],
    authType,
    authToken,
    bodyType,
    bodyContent,
  }

  return (
    <>
      <PageHeader
        title="API Tester"
        description="Uji endpoint HTTP client-side bebas biaya tanpa batas request di browser Anda"
        icon={<Send className="size-5" />}
        color="var(--mod-dev)"
        actions={
          <>
            <Badge tone="success" className="hidden xl:inline-flex">
              100% Client-Side · Tanpa Server Proxy
            </Badge>
            <Button
              variant="secondary"
              icon={<Terminal className="size-4" />}
              onClick={() => setCurlModalOpen(true)}
            >
              Tempel cURL
            </Button>
            <Button
              className="lg:hidden"
              icon={<FolderOpen className="size-4" />}
              onClick={() => setSideOpen((o) => !o)}
            >
              Preset &amp; Riwayat
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className={cn('space-y-4', !sideOpen && 'hidden lg:block')}>
          <Card>
            <CardHeader title="Preset API Publik" icon={<FolderOpen className="size-4 text-muted" />} />
            <div className="p-2 space-y-1">
              {initialPresets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelectPreset(p)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-xs hover:bg-surface-2 transition-colors"
                >
                  <HttpMethodBadge method={p.method} className="min-w-12 text-[10px]" />
                  <span className="truncate font-medium text-text">{p.name}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Riwayat Eksekusi"
              icon={<History className="size-4 text-muted" />}
              action={
                historyList.length > 0 && (
                  <button
                    onClick={async () => {
                      await db.apiHistory.clear()
                      setHistoryList([])
                      toast({ title: 'Riwayat API dibersihkan', tone: 'info' })
                    }}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Hapus
                  </button>
                )
              }
            />
            <ul className="p-2 space-y-1 max-h-72 overflow-y-auto">
              {historyList.map((h) => (
                <li
                  key={h.id}
                  onClick={() => handleSelectPreset({ method: h.method, url: h.url })}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-xs hover:bg-surface-2"
                >
                  <HttpMethodBadge method={h.method} className="min-w-12 text-[10px]" />
                  <span className="min-w-0 flex-1 truncate font-mono text-muted text-[11px]">{h.url}</span>
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold',
                      h.status >= 200 && h.status < 300
                        ? 'text-success'
                        : h.status === 0
                          ? 'text-warning'
                          : 'text-danger',
                    )}
                  >
                    {h.status === 0 ? 'CORS' : h.status}
                  </span>
                </li>
              ))}
              {historyList.length === 0 && (
                <li className="p-4 text-center text-xs text-muted">Belum ada riwayat permintaan.</li>
              )}
            </ul>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="font-mono font-bold shrink-0 sm:w-32"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
              <Input
                value={url}
                onChange={(e) => {
                  const val = e.target.value
                  if (val.trim().toLowerCase().startsWith('curl ') || val.trim().toLowerCase().startsWith('curl\n')) {
                    handleApplyCurl(val)
                    return
                  }
                  setUrl(val)
                }}
                placeholder="https://api.domain.com/v1/endpoint atau tempel cURL langsung di sini..."
                className="font-mono text-xs shrink-0 sm:flex-1"
              />
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => setCurlModalOpen(true)}
                  icon={<ClipboardPaste className="size-4" />}
                  title="Tempel & Import cURL"
                >
                  cURL
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  loading={state === 'loading'}
                  icon={<Play className="size-4" />}
                >
                  Kirim
                </Button>
              </div>
            </div>

            <Tabs
              className="mt-4"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'params', label: 'Params', count: params.filter((p) => p.key).length },
                { id: 'headers', label: 'Headers', count: headers.filter((h) => h.key).length },
                { id: 'body', label: 'Body' },
                { id: 'auth', label: 'Auth' },
                { id: 'code', label: 'Salin Kode' },
              ]}
            />

            <div className="pt-4">
              {tab === 'params' && <KeyValueEditor rows={params} onChange={setParams} />}
              {tab === 'headers' && <KeyValueEditor rows={headers} onChange={setHeaders} />}
              {tab === 'body' && (
                <div className="space-y-3">
                  <Segmented
                    size="sm"
                    value={bodyType}
                    onChange={(v: any) => setBodyType(v)}
                    options={[
                      { id: 'json', label: 'JSON' },
                      { id: 'raw', label: 'Raw Text' },
                      { id: 'none', label: 'None' },
                    ]}
                  />
                  {bodyType !== 'none' ? (
                    <Textarea
                      mono
                      className="min-h-44 font-mono text-xs"
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      placeholder="Masukkan payload body request..."
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-lg">
                      Request ini tidak mengirimkan request body.
                    </div>
                  )}
                </div>
              )}
              {tab === 'auth' && (
                <div className="space-y-4">
                  <Field label="Tipe Autentikasi">
                    <Select value={authType} onChange={(e: any) => setAuthType(e.target.value)}>
                      <option value="none">Tanpa Auth</option>
                      <option value="bearer">Bearer Token (JWT)</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key Header</option>
                    </Select>
                  </Field>
                  {(authType === 'bearer' || authType === 'basic') && (
                    <Field label={authType === 'bearer' ? 'Bearer Token' : 'Kredensial Basic (Base64)'}>
                      <Input
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder={authType === 'bearer' ? 'eyJhbGciOi...' : 'username:password'}
                        className="font-mono text-xs"
                      />
                    </Field>
                  )}
                </div>
              )}
              {tab === 'code' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(generateCurl(currentOpts))
                        toast({ title: 'cURL berhasil disalin' })
                      }}
                    >
                      Salin cURL
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(generatePython(currentOpts))
                        toast({ title: 'Script Python requests disalin' })
                      }}
                    >
                      Salin Python
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(generateFetch(currentOpts))
                        toast({ title: 'Fetch JS disalin' })
                      }}
                    >
                      Salin Fetch JS
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(generateN8n(currentOpts))
                        toast({ title: 'Node n8n JSON disalin' })
                      }}
                    >
                      Salin n8n
                    </Button>
                  </div>
                  <CodeBlock label="curl" code={generateCurl(currentOpts)} maxHeight={180} />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <h3 className="text-[15px] font-semibold">Respons</h3>
              {responseResult && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusBadge
                    code={responseResult.status}
                    text={responseResult.statusText}
                  />
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Clock className="size-3" />
                    {responseResult.timeMs} ms
                  </span>
                  <span className="text-muted">
                    {responseResult.sizeBytes < 1024
                      ? `${responseResult.sizeBytes} B`
                      : `${(responseResult.sizeBytes / 1024).toFixed(1)} KB`}
                  </span>
                </div>
              )}
              <div className="ml-auto">
                <Segmented
                  size="sm"
                  value={rTab}
                  onChange={setRTab}
                  options={[
                    { id: 'pretty', label: 'Pretty' },
                    { id: 'raw', label: 'Raw' },
                    { id: 'headers', label: 'Headers' },
                  ]}
                />
              </div>
            </div>

            <div className="p-4">
              {state === 'loading' ? (
                <div className="space-y-2 py-6">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : responseResult ? (
                rTab === 'headers' ? (
                  <CodeBlock
                    label="headers"
                    code={
                      Object.entries(responseResult.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n') || 'Tidak ada headers kustom yang dikembalikan.'
                    }
                    maxHeight={320}
                  />
                ) : (
                  <CodeBlock
                    label={responseResult.isJson ? 'json' : 'text'}
                    code={
                      rTab === 'pretty' && responseResult.isJson
                        ? JSON.stringify(JSON.parse(responseResult.body), null, 2)
                        : responseResult.body
                    }
                    maxHeight={360}
                  />
                )
              ) : (
                <p className="py-12 text-center text-[13px] text-muted">
                  Tekan tombol Kirim di atas untuk melihat respons HTTP nyata.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= MODAL TEMPEL CURL ================= */}
      <Modal
        open={curlModalOpen}
        onClose={() => setCurlModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Terminal className="size-5 text-primary" />
            <span>Tempel &amp; Import Perintah cURL</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Tempel perintah cURL lengkap dari terminal, Postman, Swagger, atau <b>Inspect &gt; Copy as cURL</b> di browser.
            Method HTTP, URL, query parameters, header, bearer token, dan request body akan otomatis diekstrak dan dipetakan.
          </p>

          <Textarea
            mono
            rows={7}
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            placeholder={`curl -X POST "https://api.example.com/v1/users?status=active" \\\n  -H "Authorization: Bearer my_token" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Iwan Kurniawan", "role": "admin"}'`}
            className="font-mono text-xs"
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Coba Contoh Preset:</span>
            <button
              type="button"
              onClick={() =>
                setCurlInput(
                  `curl -X POST "https://jsonplaceholder.typicode.com/posts" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n  "title": "Posting dari cURL",\n  "body": "Dibuat otomatis via parser cURL SiKomputer",\n  "userId": 1\n}'`,
                )
              }
              className="text-primary hover:underline cursor-pointer"
            >
              POST JSON
            </button>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={() =>
                setCurlInput(
                  `curl --location 'https://api.github.com/repos/facebook/react/issues?state=open&sort=comments' \\\n  --header 'Accept: application/vnd.github+json' \\\n  --header 'Authorization: Bearer demo_token_anda'`,
                )
              }
              className="text-primary hover:underline cursor-pointer"
            >
              GET dengan Params &amp; Bearer
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setCurlModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              disabled={!curlInput.trim()}
              onClick={() => handleApplyCurl(curlInput)}
              icon={<ClipboardPaste className="size-4" />}
            >
              Terapkan ke Request
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

