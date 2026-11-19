import {
  ArrowRightLeft,
  Braces,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  GitCompareArrows,
  Link2,
  Plus,
  Regex,
  Replace,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  buildUrlFromParams,
  computeTextDiff,
  encodeDecodeUrl,
  executeTextReplace,
  formatJson,
  minifyJson,
  parseUrlAndQuery,
  testRegex,
  type QueryParamItem,
  type UrlCodecAction,
} from '@/services/toolbox.service'
import { Badge, Button, Card, CardHeader, Field, Input, Textarea } from '@/components/ui/primitives'
import { CodeBlock, PageHeader } from '@/components/ui/blocks'
import { useToast } from '@/components/ui/overlays'
import { cn } from '@/lib/cn'

type TextToolTab = 'json' | 'regex' | 'replace' | 'diff' | 'url'

const toolTabs: { id: TextToolTab; label: string; icon: typeof Braces }[] = [
  { id: 'json', label: 'JSON Formatter', icon: Braces },
  { id: 'regex', label: 'Regex Tester', icon: Regex },
  { id: 'replace', label: 'Text Replace', icon: Replace },
  { id: 'diff', label: 'Text Diff', icon: GitCompareArrows },
  { id: 'url', label: 'URL & Query Parser', icon: Link2 },
]

function sortObjectKeys(val: unknown): unknown {
  if (Array.isArray(val)) return val.map(sortObjectKeys)
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortObjectKeys(obj[k])
        return acc
      }, {})
  }
  return val
}

const DEFAULT_PARSED = parseUrlAndQuery(
  'https://api.sikomputer.local/v1/rpa/monitoring?status=FAILED&priority=true&tag=invoice&tag=dispatcher&q=Cloud%20Timeout%20429#summary',
)

export function TextStudioPage() {
  const toast = useToast()
  const [tab, setTab] = useState<TextToolTab>('json')

  // 1. JSON Formatter State
  const [jsonInput, setJsonInput] = useState(
    '{\n  "app": "SiKomputer",\n  "version": "1.2.0",\n  "features": ["Text Studio", "PDF Studio", "QR Code", "RPA"],\n  "isOffline": true\n}',
  )
  const [jsonIndent, setJsonIndent] = useState<2 | 4>(2)
  const [jsonMinified, setJsonMinified] = useState(false)
  const [jsonSortKeys, setJsonSortKeys] = useState(false)

  const jsonComputed = useMemo(() => {
    if (!jsonInput.trim()) return { output: '', isValid: true, error: null as string | null, charCount: 0, lineCount: 0 }
    if (jsonSortKeys) {
      try {
        const sorted = sortObjectKeys(JSON.parse(jsonInput))
        const formatted = jsonMinified ? JSON.stringify(sorted) : JSON.stringify(sorted, null, jsonIndent)
        return {
          output: formatted,
          isValid: true,
          error: null as string | null,
          charCount: formatted.length,
          lineCount: formatted.split('\n').length,
        }
      } catch (err: unknown) {
        return {
          output: jsonInput,
          isValid: false,
          error: err instanceof Error ? err.message : 'Sintaks JSON tidak valid.',
          charCount: jsonInput.length,
          lineCount: jsonInput.split('\n').length,
        }
      }
    }
    if (jsonMinified) {
      const minRes = minifyJson(jsonInput)
      return {
        output: minRes.minified,
        isValid: minRes.isValid,
        error: minRes.error || null,
        charCount: minRes.minified.length,
        lineCount: minRes.minified ? minRes.minified.split('\n').length : 0,
      }
    }
    const fmt = formatJson(jsonInput, jsonIndent)
    return {
      output: fmt.formatted,
      isValid: fmt.isValid,
      error: fmt.error || null,
      charCount: fmt.charCount,
      lineCount: fmt.lineCount,
    }
  }, [jsonInput, jsonIndent, jsonMinified, jsonSortKeys])

  // 2. Regex Tester State
  const [regexPattern, setRegexPattern] = useState('[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}')
  const [regexFlags, setRegexFlags] = useState('g')
  const [regexText, setRegexText] = useState(
    'Halo, silakan hubungi tim kami di support@sikomputer.app atau admin@kantor.co.id untuk info lebih lanjut.',
  )

  // 3. Text Replace State
  const [replaceSource, setReplaceSource] = useState(
    `Update monitoring robot PA status : \n\nROB-065, 1 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun jobs\n\nROB-206, 3 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun dispatcher\n\nROB-269, 1 Hours ago\nIssue: Unable to login to Jarvis website.\n> Action: Rerun jobs`,
  )
  const [findText, setFindText] = useState('Cloud connector call failed')
  const [replaceWith, setReplaceWith] = useState('Gateway Timeout 504')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)

  // 4. Text Diff State
  const [diffOrig, setDiffOrig] = useState('baris pertama\nbaris kedua konfigurasi lama\nbaris ketiga tetap')
  const [diffMod, setDiffMod] = useState(
    'baris pertama\nbaris kedua konfigurasi BARU (diupdate)\nbaris ketiga tetap\nbaris keempat tambahan',
  )

  // 5. URL Encoder/Decoder & Query String Parser State
  const [urlCodecInput, setUrlCodecInput] = useState(
    'https://sikomputer.local/search?q=Laporan Bot RPA #1 & Status=OK',
  )
  const [urlCodecAction, setUrlCodecAction] = useState<UrlCodecAction>('encode-component')
  const [urlPlusSpace, setUrlPlusSpace] = useState(false)

  const [queryInput, setQueryInput] = useState(
    'https://api.sikomputer.local/v1/rpa/monitoring?status=FAILED&priority=true&tag=invoice&tag=dispatcher&q=Cloud%20Timeout%20429#summary',
  )
  const [parsedBaseUrl, setParsedBaseUrl] = useState(DEFAULT_PARSED.baseUrl)
  const [parsedHost, setParsedHost] = useState(DEFAULT_PARSED.host)
  const [parsedPath, setParsedPath] = useState(DEFAULT_PARSED.pathname)
  const [parsedHash, setParsedHash] = useState(DEFAULT_PARSED.hash)
  const [queryParams, setQueryParams] = useState<QueryParamItem[]>(DEFAULT_PARSED.params)
  const [queryPlusSpace, setQueryPlusSpace] = useState(false)

  const codecResult = useMemo(
    () => encodeDecodeUrl(urlCodecInput, urlCodecAction, urlPlusSpace),
    [urlCodecInput, urlCodecAction, urlPlusSpace],
  )

  const builtUrl = useMemo(
    () => buildUrlFromParams(parsedBaseUrl, queryParams, parsedHash, queryPlusSpace),
    [parsedBaseUrl, queryParams, parsedHash, queryPlusSpace],
  )

  const applyQueryParse = (raw: string) => {
    setQueryInput(raw)
    const res = parseUrlAndQuery(raw)
    setParsedBaseUrl(res.baseUrl)
    setParsedHost(res.host)
    setParsedPath(res.pathname)
    setParsedHash(res.hash)
    setQueryParams(res.params)
  }

  const copyText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text)
    toast({ title: `${label} disalin ke clipboard`, tone: 'success' })
  }

  const downloadTextFile = (content: string, filename: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime })
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = filename
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(u), 2000)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Text Studio"
        description="Format JSON, uji Regex, cari & ganti teks, bandingkan Diff, serta encode/decode URL & Query String Parser 100% lokal."
        icon={<FileCode2 className="size-5" />}
        color="var(--mod-dev)"
      />

      {/* Bar Navigasi Tab */}
      <div className="flex flex-wrap gap-1.5">
        {toolTabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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

      {/* ================= 1. JSON FORMATTER ================= */}
      {tab === 'json' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Input JSON Mentah" subtitle="Indentasi, urutkan kunci, validasi, dan minifikasi instan" />
            <div className="space-y-3 p-4">
              <Textarea
                mono
                className="min-h-72 font-mono text-xs"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={!jsonMinified && jsonIndent === 2 ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setJsonMinified(false)
                    setJsonIndent(2)
                    if (jsonComputed.isValid) toast({ title: 'JSON diformat (2 spasi)' })
                  }}
                >
                  Prettify (2 Spasi)
                </Button>
                <Button
                  variant={!jsonMinified && jsonIndent === 4 ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setJsonMinified(false)
                    setJsonIndent(4)
                    if (jsonComputed.isValid) toast({ title: 'JSON diformat (4 spasi)' })
                  }}
                >
                  Prettify (4 Spasi)
                </Button>
                <Button
                  variant={jsonMinified ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setJsonMinified(true)
                    if (jsonComputed.isValid) toast({ title: 'JSON diminifikasi' })
                  }}
                >
                  Minify (Satu Baris)
                </Button>
                <label className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-2/50 px-2.5 py-1.5 text-xs text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jsonSortKeys}
                    onChange={(e) => setJsonSortKeys(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  Sort Keys (A-Z)
                </label>
                <Button variant="ghost" size="sm" onClick={() => setJsonInput('')}>
                  Bersihkan
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hasil Validasi JSON"
              subtitle={`${jsonComputed.lineCount} baris · ${jsonComputed.charCount} karakter`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {jsonComputed.isValid ? (
                    <Badge tone="success">
                      <CheckCircle2 className="size-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge tone="danger">
                      <XCircle className="size-3" />
                      Sintaks Error
                    </Badge>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadTextFile(jsonComputed.output, 'formatted.json', 'application/json')}
                    icon={<Download className="size-3.5" />}
                  >
                    .json
                  </Button>
                </div>
              }
            />
            <div className="p-4 space-y-3">
              {jsonComputed.error && (
                <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-mono">
                  {jsonComputed.error}
                </div>
              )}
              <CodeBlock label="json" code={jsonComputed.output} maxHeight={340} />
            </div>
          </Card>
        </div>
      )}

      {/* ================= 2. REGEX TESTER ================= */}
      {tab === 'regex' && (() => {
        const regexRes = testRegex(regexPattern, regexFlags, regexText)
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Pengaturan Pola Regex" subtitle="Pilih preset cepat atau tulis ekspresi reguler Anda" />
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="self-center text-muted mr-1">Preset:</span>
                  {[
                    { label: 'Email', p: '[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}', f: 'g' },
                    { label: 'URL HTTPS', p: 'https?://[^\\s/$.?#].[^\\s]*', f: 'gi' },
                    { label: 'HP Indonesia', p: '(?:\\+62|62|0)8[1-9][0-9]{6,10}', f: 'g' },
                    { label: 'IPv4', p: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', f: 'g' },
                    { label: 'Tanggal ISO', p: '\\b\\d{4}-\\d{2}-\\d{2}\\b', f: 'g' },
                  ].map((pr) => (
                    <button
                      key={pr.label}
                      type="button"
                      onClick={() => {
                        setRegexPattern(pr.p)
                        setRegexFlags(pr.f)
                      }}
                      className="rounded border border-border bg-surface-2/60 px-2 py-1 text-[11px] hover:border-primary/60 hover:text-primary cursor-pointer"
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Field label="Pola Ekspresi Reguler">
                      <Input
                        value={regexPattern}
                        onChange={(e) => setRegexPattern(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="Flags">
                      <Input
                        value={regexFlags}
                        onChange={(e) => setRegexFlags(e.target.value)}
                        placeholder="g, i, m"
                        className="font-mono text-xs"
                      />
                    </Field>
                  </div>
                </div>

                <Field label="Teks Uji untuk Pencocokan">
                  <Textarea
                    mono
                    className="min-h-48 font-mono text-xs"
                    value={regexText}
                    onChange={(e) => setRegexText(e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Hasil Pencocokan"
                action={
                  <div className="flex items-center gap-2">
                    <Badge tone={regexRes.count > 0 ? 'success' : 'neutral'}>{regexRes.count} Cocok</Badge>
                    {regexRes.matches.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Copy className="size-3.5" />}
                        onClick={() => copyText(regexRes.matches.map((m) => m.match).join('\n'), 'Daftar Match')}
                      >
                        Salin Semua
                      </Button>
                    )}
                  </div>
                }
              />
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {regexRes.error ? (
                  <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/30 rounded-md">
                    {regexRes.error}
                  </div>
                ) : regexRes.matches.length > 0 ? (
                  regexRes.matches.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded border border-border bg-surface-2 text-xs font-mono space-y-1">
                      <div className="flex justify-between text-muted text-[10px]">
                        <span>Match #{idx + 1}</span>
                        <span>Indeks: {m.index}</span>
                      </div>
                      <p className="font-semibold text-primary break-all">{m.match}</p>
                      {m.groups.length > 0 && (
                        <p className="text-muted text-[11px]">Grup: {m.groups.join(', ')}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-12 text-center text-xs text-muted">
                    Tidak ada teks yang cocok dengan pola regex di atas.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )
      })()}

      {/* ================= 3. TEXT REPLACE ================= */}
      {tab === 'replace' && (() => {
        const replaceRes = executeTextReplace(replaceSource, {
          findText,
          replaceText: replaceWith,
          matchCase,
          wholeWord,
          useRegex,
        })

        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Cari & Ganti Teks (Find & Replace)"
                subtitle="Dukungan regex, kata utuh, dan sensitif huruf besar-kecil"
              />
              <div className="space-y-3 p-4">
                <Field label="Teks Input Sumber">
                  <Textarea
                    mono
                    className="min-h-48 font-mono text-xs"
                    placeholder="Ketik atau tempel teks yang ingin dicari/diganti di sini..."
                    value={replaceSource}
                    onChange={(e) => setReplaceSource(e.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Cari Teks / Pola">
                    <Input
                      placeholder="Kata atau pola yang dicari..."
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                  <Field label="Ganti Dengan">
                    <Input
                      placeholder="Teks pengganti baru..."
                      value={replaceWith}
                      onChange={(e) => setReplaceWith(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-text hover:bg-surface-2/80">
                    <input
                      type="checkbox"
                      checked={matchCase}
                      onChange={(e) => setMatchCase(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    <span>Sensitif Huruf</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-text hover:bg-surface-2/80">
                    <input
                      type="checkbox"
                      checked={wholeWord}
                      onChange={(e) => setWholeWord(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    <span>Kata Utuh</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-text hover:bg-surface-2/80">
                    <input
                      type="checkbox"
                      checked={useRegex}
                      onChange={(e) => setUseRegex(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    <span>Mode Regex</span>
                  </label>
                </div>

                {replaceRes.error && (
                  <div className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                    {replaceRes.error}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setReplaceSource(replaceRes.result)
                      toast({ title: `${replaceRes.matchCount} Kemunculan berhasil diganti`, tone: 'success' })
                    }}
                    disabled={!findText || replaceRes.matchCount === 0}
                  >
                    Ganti Semua ({replaceRes.matchCount})
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const single = executeTextReplace(
                        replaceSource,
                        { findText, replaceText: replaceWith, matchCase, wholeWord, useRegex },
                        'first',
                      )
                      setReplaceSource(single.result)
                      toast({ title: '1 Kemunculan pertama diganti', tone: 'success' })
                    }}
                    disabled={!findText || replaceRes.matchCount === 0}
                  >
                    Ganti Pertama
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplaceSource(replaceRes.result)
                      toast({ title: 'Hasil ditukar menjadi teks input', tone: 'info' })
                    }}
                    icon={<ArrowRightLeft className="size-3.5" />}
                  >
                    Tukar ke Input
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplaceSource('')
                      setFindText('')
                      setReplaceWith('')
                    }}
                  >
                    Bersihkan
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Hasil Pratinjau Teks (Live Output)"
                subtitle={`Ditemukan ${replaceRes.matchCount} kemunculan · ${replaceRes.result.length} karakter`}
              />
              <div className="space-y-3 p-4">
                <Textarea
                  mono
                  readOnly
                  className="min-h-72 font-mono text-xs bg-surface-2/30"
                  value={replaceRes.result}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted">
                    {replaceRes.matchCount > 0 ? (
                      <span className="text-success font-medium">
                        {replaceRes.matchCount} bagian cocok &amp; siap diganti
                      </span>
                    ) : (
                      'Tidak ada kecocokan yang ditemukan'
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Copy className="size-3.5" />}
                      onClick={() => copyText(replaceRes.result, 'Hasil teks')}
                    >
                      Salin Hasil
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download className="size-3.5" />}
                      onClick={() => {
                        downloadTextFile(replaceRes.result, `replace-result-${Date.now()}.txt`)
                        toast({ title: 'File .txt diunduh', tone: 'success' })
                      }}
                    >
                      Unduh .txt
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )
      })()}

      {/* ================= 4. TEXT DIFF ================= */}
      {tab === 'diff' && (() => {
        const diffLines = computeTextDiff(diffOrig, diffMod)
        const addedCount = diffLines.filter((l) => l.type === 'added').length
        const removedCount = diffLines.filter((l) => l.type === 'removed').length
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Input Dua Teks" subtitle="Bandingkan perubahan per baris secara langsung" />
              <div className="p-4 space-y-3">
                <Field label="Teks Asli (Original)">
                  <Textarea
                    mono
                    className="min-h-36 font-mono text-xs"
                    value={diffOrig}
                    onChange={(e) => setDiffOrig(e.target.value)}
                  />
                </Field>
                <Field label="Teks Baru (Modified)">
                  <Textarea
                    mono
                    className="min-h-36 font-mono text-xs"
                    value={diffMod}
                    onChange={(e) => setDiffMod(e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Hasil Perbandingan Baris (Diff)"
                action={
                  <div className="flex items-center gap-1.5">
                    <Badge tone="success">+{addedCount} Tambah</Badge>
                    <Badge tone="danger">-{removedCount} Hapus</Badge>
                  </div>
                }
              />
              <div className="p-3 font-mono text-xs max-h-96 overflow-y-auto space-y-0.5">
                {diffLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-1 px-2 rounded flex items-start gap-2',
                      line.type === 'added'
                        ? 'bg-success/15 text-success'
                        : line.type === 'removed'
                          ? 'bg-danger/15 text-danger'
                          : 'text-muted',
                    )}
                  >
                    <span className="select-none font-bold shrink-0 w-3">
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap break-words min-w-0 flex-1">{line.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      })()}

      {/* ================= 5. URL ENCODER/DECODER & QUERY STRING PARSER ================= */}
      {tab === 'url' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* KIRI: URL ENCODER / DECODER */}
          <Card>
            <CardHeader
              title="URL Encoder / Decoder"
              subtitle="Encode/decode URL component, full URI, maupun Base64URL secara aman"
              icon={<Link2 className="size-4" />}
            />
            <div className="space-y-4 p-4">
              <Field label="Teks atau URL Masukan">
                <Textarea
                  mono
                  className="min-h-28 font-mono text-xs"
                  value={urlCodecInput}
                  onChange={(e) => setUrlCodecInput(e.target.value)}
                  placeholder="Ketik teks atau tempel URL ter-encode..."
                />
              </Field>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'encode-component', label: 'Encode Component' },
                    { id: 'decode-component', label: 'Decode Component' },
                    { id: 'encode-uri', label: 'Encode Full URI' },
                    { id: 'decode-uri', label: 'Decode Full URI' },
                    { id: 'encode-base64url', label: 'Base64URL Encode' },
                    { id: 'decode-base64url', label: 'Base64URL Decode' },
                  ] as const
                ).map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={urlCodecAction === m.id ? 'primary' : 'secondary'}
                    onClick={() => setUrlCodecAction(m.id)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={urlPlusSpace}
                  onChange={(e) => setUrlPlusSpace(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                <span>Perlakukan spasi sebagai tanda <code className="text-text">+</code> (form-urlencoded)</span>
              </label>

              {!codecResult.isValid && codecResult.error && (
                <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-mono">
                  {codecResult.error}
                </div>
              )}

              <Field label="Hasil Konversi">
                <Textarea
                  mono
                  readOnly
                  className="min-h-28 font-mono text-xs bg-surface-2/40"
                  value={codecResult.output}
                />
              </Field>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Copy className="size-3.5" />}
                  onClick={() => copyText(codecResult.output, 'Hasil URL')}
                  disabled={!codecResult.output}
                >
                  Salin Hasil
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowRightLeft className="size-3.5" />}
                  onClick={() => {
                    if (!codecResult.isValid) return
                    setUrlCodecInput(codecResult.output)
                    toast({ title: 'Hasil ditukar ke input', tone: 'info' })
                  }}
                  disabled={!codecResult.output}
                >
                  Tukar ke Input
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyQueryParse(codecResult.isValid && codecResult.output ? codecResult.output : urlCodecInput)}
                >
                  Kirim ke Query Parser →
                </Button>
              </div>
            </div>
          </Card>

          {/* KANAN: QUERY STRING PARSER & URL BUILDER */}
          <Card>
            <CardHeader
              title="Query String Parser & URL Builder"
              subtitle="Pecah parameter ?key=value ke tabel interaktif & rakit ulang URL"
              action={
                <Badge tone="primary">{queryParams.filter((p) => p.enabled && p.key.trim()).length} Parameter</Badge>
              }
            />
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted">Contoh:</span>
                {[
                  {
                    label: 'Webhook RPA',
                    val: 'https://api.sikomputer.local/v1/rpa/monitoring?status=FAILED&priority=true&tag=invoice&tag=dispatcher&q=Cloud%20Timeout%20429#summary',
                  },
                  {
                    label: 'OAuth Redirect',
                    val: 'https://github.com/login/oauth/authorize?client_id=Iv1_demo123&redirect_uri=https%3A%2F%2Fsikomputer.local%2Fcallback&scope=repo%20read%3Auser&state=xyz987',
                  },
                  {
                    label: 'Raw Query Only',
                    val: '?page=2&limit=25&sort=updated_at%20desc&filter=active',
                  },
                ].map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => applyQueryParse(ex.val)}
                    className="rounded border border-border bg-surface-2/60 px-2 py-1 text-[11px] hover:border-primary/60 hover:text-primary cursor-pointer"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              <Field label="Tempel URL Lengkap atau Query String (?a=1&b=2)">
                <Textarea
                  mono
                  rows={2}
                  className="font-mono text-xs"
                  value={queryInput}
                  onChange={(e) => applyQueryParse(e.target.value)}
                  placeholder="https://example.com/path?foo=bar&baz=1"
                />
              </Field>

              {(parsedHost || parsedPath || parsedHash) && (
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {parsedHost && <Badge tone="neutral">Host: {parsedHost}</Badge>}
                  {parsedPath && <Badge tone="neutral">Path: {parsedPath}</Badge>}
                  {parsedHash && <Badge tone="info">Hash: {parsedHash}</Badge>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Base URL">
                    <Input
                      className="font-mono text-xs"
                      value={parsedBaseUrl}
                      onChange={(e) => setParsedBaseUrl(e.target.value)}
                      placeholder="https://example.com/api"
                    />
                  </Field>
                </div>
                <Field label="Hash (#fragment)">
                  <Input
                    className="font-mono text-xs"
                    value={parsedHash}
                    onChange={(e) => setParsedHash(e.target.value)}
                    placeholder="#section"
                  />
                </Field>
              </div>

              {/* Parameter List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Parameter Query ({queryParams.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={queryPlusSpace}
                        onChange={(e) => setQueryPlusSpace(e.target.checked)}
                        className="rounded border-border accent-primary"
                      />
                      Spasi (+)
                    </label>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Plus className="size-3.5" />}
                      onClick={() =>
                        setQueryParams((prev) => [
                          ...prev,
                          { id: 'qp-' + Math.random().toString(36).slice(2, 9), key: '', value: '', enabled: true },
                        ])
                      }
                    >
                      Tambah Param
                    </Button>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {queryParams.map((p) => (
                    <div key={p.id} className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            onChange={(e) =>
                              setQueryParams((prev) =>
                                prev.map((it) => (it.id === p.id ? { ...it, enabled: e.target.checked } : it)),
                              )
                            }
                            className="rounded border-border accent-primary"
                          />
                          Aktif
                        </label>
                        <button
                          type="button"
                          onClick={() => setQueryParams((prev) => prev.filter((it) => it.id !== p.id))}
                          className="text-muted hover:text-danger p-1"
                          aria-label="Hapus parameter"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                      <Input
                        value={p.key}
                        onChange={(e) =>
                          setQueryParams((prev) =>
                            prev.map((it) => (it.id === p.id ? { ...it, key: e.target.value } : it)),
                          )
                        }
                        placeholder="Key"
                        className="font-mono text-xs"
                      />
                      <Input
                        value={p.value}
                        onChange={(e) =>
                          setQueryParams((prev) =>
                            prev.map((it) => (it.id === p.id ? { ...it, value: e.target.value } : it)),
                          )
                        }
                        placeholder="Value (terdekode)"
                        className="font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface-2/30 sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-surface-2/60 text-muted">
                      <tr>
                        <th className="w-9 px-2.5 py-2 text-center">On</th>
                        <th className="px-2.5 py-2 font-medium">Key</th>
                        <th className="px-2.5 py-2 font-medium">Value (Terdekode)</th>
                        <th className="w-10 px-2 py-2 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {queryParams.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-5 text-center text-muted">
                            Tidak ada query parameter. Klik &quot;Tambah Param&quot; untuk menambahkan.
                          </td>
                        </tr>
                      ) : (
                        queryParams.map((p) => (
                          <tr key={p.id}>
                            <td className="px-2.5 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={p.enabled}
                                onChange={(e) =>
                                  setQueryParams((prev) =>
                                    prev.map((it) => (it.id === p.id ? { ...it, enabled: e.target.checked } : it)),
                                  )
                                }
                                className="rounded border-border accent-primary"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={p.key}
                                onChange={(e) =>
                                  setQueryParams((prev) =>
                                    prev.map((it) => (it.id === p.id ? { ...it, key: e.target.value } : it)),
                                  )
                                }
                                placeholder="key"
                                className="w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={p.value}
                                onChange={(e) =>
                                  setQueryParams((prev) =>
                                    prev.map((it) => (it.id === p.id ? { ...it, value: e.target.value } : it)),
                                  )
                                }
                                placeholder="value"
                                className="w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-text focus:outline-hidden focus:ring-1 focus:ring-primary"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setQueryParams((prev) => prev.filter((it) => it.id !== p.id))}
                                className="rounded p-1 text-muted hover:bg-surface hover:text-danger cursor-pointer"
                                title="Hapus Parameter"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Rebuilt URL + JSON Preview */}
              <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text">Hasil URL Tergenerate</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Copy className="size-3.5" />}
                      onClick={() => copyText(builtUrl.fullUrl, 'URL lengkap')}
                    >
                      Salin URL
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyText(builtUrl.queryString ? `?${builtUrl.queryString}` : '', 'Query String')}
                    >
                      Salin Query
                    </Button>
                  </div>
                </div>
                <p className="break-all rounded border border-border bg-surface p-2 font-mono text-[11px] text-primary">
                  {builtUrl.fullUrl || '(kosong)'}
                </p>
              </div>

              <CodeBlock label="Parsed Query JSON" code={JSON.stringify(builtUrl.jsonObject, null, 2)} maxHeight={200} />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
