import {
  ArrowLeft,
  ArrowRightLeft,
  Braces,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Table,
  Trash,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { db, type SnippetEntity } from '@/db/dexie'
import { toolboxTools } from '@/mocks'
import {
  formatJson,
  minifyJson,
  decodeJwt,
  testRegex,
  explainCron,
  generateUuids,
  calculateHashes,
  epochToDates,
  computeTextDiff,
  executeTextReplace,
  generateSqlCode,
  type SqlAction,
  type SqlDialect,
  type SqlColumn,
} from '@/services/toolbox.service'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Chip,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui/primitives'
import { Modal, useToast } from '@/components/ui/overlays'
import { CodeBlock, PageHeader } from '@/components/ui/blocks'
import { cn } from '@/lib/cn'

/* =========================================================================
   1. DEV TOOLBOX (7 PERKAKAS CEPAT)
   ========================================================================= */

export function ToolboxPage() {
  const toast = useToast()
  const [sel, setSel] = useState<string | null>(null)
  const tool = toolboxTools.find((t) => t.id === sel)

  // 1. JSON State
  const [jsonInput, setJsonInput] = useState(
    '{\n  "app": "SiKomputer",\n  "version": "1.0.0",\n  "features": ["Base64", "API Tester", "MoM AI", "Toolbox"],\n  "isOffline": true\n}',
  )
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // 2. JWT State
  const [jwtInput, setJwtInput] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikl3YW4gS3Vybmlhd2FuIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  )
  const [jwtDecoded, setJwtDecoded] = useState<any>(null)

  // 3. Regex State
  const [regexPattern, setRegexPattern] = useState('[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}')
  const [regexFlags, setRegexFlags] = useState('g')
  const [regexText, setRegexText] = useState(
    'Halo, silakan hubungi tim kami di support@sikomputer.app atau admin@kantor.co.id untuk info lebih lanjut.',
  )

  // 4. Cron State
  const [cronInput, setCronInput] = useState('0 9 * * 1-5')

  // 5. UUID & Hash State
  const [hashInput, setHashInput] = useState('sikomputer-2026')
  const [hashes, setHashes] = useState({ md5: '', sha1: '', sha256: '', sha512: '' })
  const [generatedUuids, setGeneratedUuids] = useState<string[]>(() => generateUuids(5))

  // 6. Epoch State
  const [epochInput, setEpochInput] = useState(String(Math.floor(Date.now() / 1000)))

  // 7. Text Diff State
  const [diffOrig, setDiffOrig] = useState('baris pertama\nbaris kedua konfigurasi lama\nbaris ketiga tetap')
  const [diffMod, setDiffMod] = useState('baris pertama\nbaris kedua konfigurasi BARU (diupdate)\nbaris ketiga tetap\nbaris keempat tambahan')

  // 8. Text Replace State
  const [replaceSource, setReplaceSource] = useState(
    `Update monitoring robot PA status : \n\nROB-065, 1 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun jobs\n\nROB-206, 3 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun dispatcher\n\nROB-269, 1 Hours ago\nIssue: Unable to login to Jarvis website.\n> Action: Rerun jobs`
  )
  const [findText, setFindText] = useState('Cloud connector call failed')
  const [replaceWith, setReplaceWith] = useState('Gateway Timeout 504')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [replaceOutput, setReplaceOutput] = useState('')

  // 9. SQL Generator State
  const [sqlTable, setSqlTable] = useState('robot_monitoring_logs')
  const [sqlAction, setSqlAction] = useState<SqlAction>('SELECT')
  const [sqlDialect, setSqlDialect] = useState<SqlDialect>('postgres')
  const [sqlWhere, setSqlWhere] = useState("status = 'FAILED' AND priority = TRUE")
  const [sqlLimit, setSqlLimit] = useState(50)
  const [sqlColumns, setSqlColumns] = useState<SqlColumn[]>([
    { name: 'id', type: 'BIGINT', isPrimaryKey: true, isAutoIncrement: true, defaultValue: '', sampleValue: '1' },
    { name: 'robot_code', type: 'VARCHAR(50)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'ROB-065' },
    { name: 'process_name', type: 'VARCHAR(150)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'Invoice Dispatcher Bot' },
    { name: 'status', type: 'VARCHAR(30)', isPrimaryKey: false, isNullable: false, defaultValue: "'PENDING'", sampleValue: 'FAILED' },
    { name: 'error_message', type: 'TEXT', isPrimaryKey: false, isNullable: true, defaultValue: '', sampleValue: "Cloud connector call failed with status code '429'." },
    { name: 'priority', type: 'BOOLEAN', isPrimaryKey: false, isNullable: false, defaultValue: 'TRUE', sampleValue: 'TRUE' },
    { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isNullable: true, defaultValue: 'CURRENT_TIMESTAMP', sampleValue: '2026-11-10 10:00:00' },
  ])

  // Effect untuk update perkakas yang aktif
  useEffect(() => {
    if (sel === 'json') {
      const res = formatJson(jsonInput, 2)
      setJsonOutput(res.formatted)
      setJsonError(res.error || null)
    } else if (sel === 'jwt') {
      setJwtDecoded(decodeJwt(jwtInput))
    } else if (sel === 'uuid') {
      void calculateHashes(hashInput).then(setHashes)
    } else if (sel === 'replace') {
      const res = executeTextReplace(replaceSource, {
        findText,
        replaceText: replaceWith,
        matchCase,
        wholeWord,
        useRegex,
      })
      setReplaceOutput(res.result)
    }
  }, [sel, jsonInput, jwtInput, hashInput, replaceSource, findText, replaceWith, matchCase, wholeWord, useRegex])

  return (
    <>
      <PageHeader
        title="Dev Toolbox"
        description="Kumpulan 9 utilitas cepat pengembang harian — 100% diproses di browser tanpa server luar"
        icon={<Wrench className="size-5" />}
        color="var(--mod-dev)"
        actions={
          sel && (
            <Button icon={<ArrowLeft className="size-4" />} onClick={() => setSel(null)}>
              Semua Tool
            </Button>
          )
        }
      />

      {!tool ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {toolboxTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setSel(t.id)}
              className="shadow-card group rounded-lg border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 cursor-pointer"
            >
              <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-mod-dev/15 font-mono text-sm font-bold text-mod-dev">
                {t.name.slice(0, 2).toUpperCase()}
              </span>
              <p className="font-semibold">{t.name}</p>
              <p className="mt-1 text-[13px] text-muted">{t.desc}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ================= 1. TOOL: JSON FORMATTER ================= */}
          {sel === 'json' && (
            <>
              <Card>
                <CardHeader title="Input JSON Mentah" subtitle="Indentasi, validasi, dan minifikasi instan" />
                <div className="space-y-3 p-4">
                  <Textarea
                    mono
                    className="min-h-72 font-mono text-xs"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const res = formatJson(jsonInput, 2)
                        setJsonOutput(res.formatted)
                        setJsonError(res.error || null)
                        if (res.isValid) toast({ title: 'JSON diformat dengan rapi' })
                      }}
                    >
                      Prettify (Indent 2)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const res = minifyJson(jsonInput)
                        setJsonOutput(res.minified)
                        setJsonError(res.error || null)
                        if (res.isValid) toast({ title: 'JSON diminifikasi' })
                      }}
                    >
                      Minify (Satu Baris)
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setJsonInput('')}>
                      Bersihkan
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Hasil Validasi JSON"
                  action={
                    !jsonError ? (
                      <Badge tone="success">
                        <CheckCircle2 className="size-3" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <XCircle className="size-3" />
                        Sintaks Error
                      </Badge>
                    )
                  }
                />
                <div className="p-4 space-y-3">
                  {jsonError ? (
                    <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-mono">
                      {jsonError}
                    </div>
                  ) : null}
                  <CodeBlock label="json" code={jsonOutput} maxHeight={340} />
                </div>
              </Card>
            </>
          )}

          {/* ================= 2. TOOL: JWT DECODER ================= */}
          {sel === 'jwt' && (
            <>
              <Card>
                <CardHeader title="Token JWT Mentah" subtitle="Mendekode Base64URL header dan payload" />
                <div className="space-y-3 p-4">
                  <Textarea
                    mono
                    className="min-h-56 font-mono text-xs"
                    value={jwtInput}
                    onChange={(e) => setJwtInput(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setJwtDecoded(decodeJwt(jwtInput))
                      toast({ title: 'Token JWT didekode' })
                    }}
                  >
                    Decode Token
                  </Button>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Status &amp; Isi Token"
                  action={
                    jwtDecoded?.isValid ? (
                      jwtDecoded.isExpired ? (
                        <Badge tone="danger">Expired</Badge>
                      ) : (
                        <Badge tone="success">Aktif</Badge>
                      )
                    ) : (
                      <Badge tone="danger">Invalid</Badge>
                    )
                  }
                />
                <div className="p-4 space-y-4">
                  {jwtDecoded && jwtDecoded.isValid ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-lg border border-border bg-surface-2 p-3">
                        <div>
                          <span className="text-muted block">Status Kedaluwarsa:</span>
                          <span className="font-semibold text-text">{jwtDecoded.expiresIn}</span>
                        </div>
                        <div>
                          <span className="text-muted block">Dibuat Pada (iat):</span>
                          <span className="font-semibold text-text">{jwtDecoded.issuedAt}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold mb-1 text-muted uppercase">Header:</p>
                        <CodeBlock
                          label="header"
                          code={JSON.stringify(jwtDecoded.header, null, 2)}
                          maxHeight={140}
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold mb-1 text-muted uppercase">Payload:</p>
                        <CodeBlock
                          label="payload"
                          code={JSON.stringify(jwtDecoded.payload, null, 2)}
                          maxHeight={180}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="py-10 text-center text-xs text-danger">
                      {jwtDecoded?.error || 'Token tidak valid'}
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* ================= 3. TOOL: REGEX TESTER ================= */}
          {sel === 'regex' && (() => {
            const regexRes = testRegex(regexPattern, regexFlags, regexText)
            return (
              <>
                <Card>
                  <CardHeader title="Pengaturan Pola Regex" />
                  <div className="space-y-4 p-4">
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
                      <Badge tone={regexRes.count > 0 ? 'success' : 'neutral'}>
                        {regexRes.count} Cocok
                      </Badge>
                    }
                  />
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {regexRes.error ? (
                      <div className="p-3 text-xs text-danger bg-danger/10 border border-danger/30 rounded-md">
                        {regexRes.error}
                      </div>
                    ) : regexRes.matches.length > 0 ? (
                      regexRes.matches.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded border border-border bg-surface-2 text-xs font-mono space-y-1"
                        >
                          <div className="flex justify-between text-muted text-[10px]">
                            <span>Match #{idx + 1}</span>
                            <span>Indeks: {m.index}</span>
                          </div>
                          <p className="font-semibold text-primary">{m.match}</p>
                          {m.groups.length > 0 && (
                            <p className="text-muted text-[11px]">
                              Grup: {m.groups.join(', ')}
                            </p>
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
              </>
            )
          })()}

          {/* ================= 4. TOOL: CRON BUILDER ================= */}
          {sel === 'cron' && (() => {
            const cronRes = explainCron(cronInput)
            return (
              <>
                <Card>
                  <CardHeader
                    title="Ekspresi Cron 5-Bagian"
                    subtitle="Format standar: [menit] [jam] [hari] [bulan] [hari_minggu]"
                  />
                  <div className="space-y-4 p-4">
                    <Field label="Sintaks Cron">
                      <Input
                        value={cronInput}
                        onChange={(e) => setCronInput(e.target.value)}
                        className="font-mono text-base font-bold tracking-widest text-primary"
                      />
                    </Field>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-muted">Preset Cepat:</span>
                      <button
                        onClick={() => setCronInput('0 9 * * 1-5')}
                        className="underline hover:text-text cursor-pointer"
                      >
                        Hari Kerja 09:00
                      </button>
                      <button
                        onClick={() => setCronInput('*/15 * * * *')}
                        className="underline hover:text-text cursor-pointer"
                      >
                        Setiap 15 Menit
                      </button>
                      <button
                        onClick={() => setCronInput('0 0 1 * *')}
                        className="underline hover:text-text cursor-pointer"
                      >
                        Awal Bulan
                      </button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Penjelasan Bahasa Manusia" />
                  <div className="p-4 space-y-4">
                    <div className="rounded-lg border border-border bg-surface-2 p-3">
                      <p className="text-sm font-semibold text-text">{cronRes.explanation}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-2 text-muted uppercase">
                        5 Eksekusi Mendatang:
                      </p>
                      <ul className="space-y-1.5 font-mono text-xs">
                        {cronRes.nextRuns.map((r, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 p-1.5 rounded bg-surface border border-border/50 text-muted"
                          >
                            <Clock className="size-3.5 text-primary" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </>
            )
          })()}

          {/* ================= 5. TOOL: UUID & HASH ================= */}
          {sel === 'uuid' && (
            <>
              <Card>
                <CardHeader
                  title="Generator UUID v4"
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setGeneratedUuids(generateUuids(5))}
                      icon={<RefreshCw className="size-3.5" />}
                    >
                      Acak Ulang
                    </Button>
                  }
                />
                <div className="p-4 space-y-2">
                  {generatedUuids.map((id, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-surface-2 border border-border/50 font-mono text-xs font-semibold"
                    >
                      <span className="select-all">{id}</span>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(id)
                          toast({ title: 'UUID disalin' })
                        }}
                        className="text-muted hover:text-text ml-2 p-1"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader title="Kalkulator Hash Kriptografi" />
                <div className="p-4 space-y-3">
                  <Field label="Teks Input">
                    <Input
                      value={hashInput}
                      onChange={(e) => setHashInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>

                  <div className="space-y-2 pt-2">
                    {[
                      { name: 'MD5', val: hashes.md5 },
                      { name: 'SHA-1', val: hashes.sha1 },
                      { name: 'SHA-256', val: hashes.sha256 },
                      { name: 'SHA-512', val: hashes.sha512 },
                    ].map((h) => (
                      <div key={h.name} className="p-2 rounded bg-surface-2 border border-border/50 text-xs">
                        <div className="flex justify-between text-muted text-[10px] mb-0.5">
                          <span className="font-bold text-text">{h.name}</span>
                          <button
                            onClick={() => {
                              void navigator.clipboard.writeText(h.val)
                              toast({ title: `Hash ${h.name} disalin` })
                            }}
                            className="hover:text-text cursor-pointer"
                          >
                            Salin
                          </button>
                        </div>
                        <p className="font-mono truncate select-all text-text">{h.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* ================= 6. TOOL: EPOCH CONVERTER ================= */}
          {sel === 'epoch' && (() => {
            const dateRes = epochToDates(epochInput)
            return (
              <>
                <Card>
                  <CardHeader
                    title="Timestamp Unix (Epoch)"
                    subtitle="Dukungan otomatis format detik (10-digit) atau milidetik (13-digit)"
                  />
                  <div className="space-y-4 p-4">
                    <Field label="Nilai Epoch">
                      <Input
                        value={epochInput}
                        onChange={(e) => setEpochInput(e.target.value)}
                        className="font-mono text-lg font-bold tracking-wider"
                      />
                    </Field>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEpochInput(String(Math.floor(Date.now() / 1000)))}
                    >
                      Gunakan Waktu Saat Ini
                    </Button>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Konversi Waktu Kalender" />
                  <div className="p-4 space-y-2 text-xs">
                    {[
                      { label: 'WIB (Jakarta - UTC+7)', val: dateRes.wib },
                      { label: 'WITA (Makassar - UTC+8)', val: dateRes.wita },
                      { label: 'WIT (Jayapura - UTC+9)', val: dateRes.wit },
                      { label: 'UTC (GMT)', val: dateRes.utc },
                      { label: 'Format ISO 8601', val: dateRes.iso },
                      { label: 'Waktu Relatif', val: dateRes.relative },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-2.5 rounded bg-surface-2 border border-border/50"
                      >
                        <span className="text-muted">{item.label}</span>
                        <span className="font-mono font-semibold text-text">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )
          })()}

          {/* ================= 7. TOOL: TEXT DIFF ================= */}
          {sel === 'diff' && (() => {
            const diffLines = computeTextDiff(diffOrig, diffMod)
            return (
              <>
                <Card>
                  <CardHeader title="Input Dua Teks" />
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
                  <CardHeader title="Hasil Perbandingan Baris (Diff)" />
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
                        <span className="whitespace-pre-wrap">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )
          })()}

          {/* ================= 8. TOOL: TEXT REPLACE ================= */}
          {sel === 'replace' && (() => {
            const replaceRes = executeTextReplace(replaceSource, {
              findText,
              replaceText: replaceWith,
              matchCase,
              wholeWord,
              useRegex,
            })

            const handleSwap = () => {
              setReplaceSource(replaceOutput || replaceRes.result)
              toast({ title: 'Hasil ditukar menjadi teks input', tone: 'info' })
            }

            const handleReplaceFirst = () => {
              const singleRes = executeTextReplace(
                replaceSource,
                { findText, replaceText: replaceWith, matchCase, wholeWord, useRegex },
                'first'
              )
              setReplaceSource(singleRes.result)
              toast({ title: '1 Kemunculan pertama diganti', tone: 'success' })
            }

            const handleReplaceAllNow = () => {
              setReplaceSource(replaceRes.result)
              toast({
                title: `${replaceRes.matchCount} Kemunculan berhasil diganti`,
                tone: 'success',
              })
            }

            const handleLoadSample = () => {
              setReplaceSource(
                `Update monitoring robot PA status :\n\nROB-065, 1 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun jobs\n\nROB-206, 3 Hours ago\nIssue: Cloud connector call failed with status code '429'.\n> Action: Rerun dispatcher\n\nROB-269, 1 Hours ago\nIssue: Unable to login to Jarvis website.\n> Action: Rerun jobs`
              )
              setFindText('Cloud connector call failed')
              setReplaceWith('Gateway Connection Timeout')
              toast({ title: 'Contoh teks RPA dimuat', tone: 'info' })
            }

            return (
              <>
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

                    {/* Options checkboxes */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-foreground hover:bg-surface-2/80">
                        <input
                          type="checkbox"
                          checked={matchCase}
                          onChange={(e) => setMatchCase(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                        <span>Sensitif Huruf (Case Sensitive)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-foreground hover:bg-surface-2/80">
                        <input
                          type="checkbox"
                          checked={wholeWord}
                          onChange={(e) => setWholeWord(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                        <span>Kata Utuh (Whole Word)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none rounded bg-surface-2 px-2.5 py-1 text-foreground hover:bg-surface-2/80">
                        <input
                          type="checkbox"
                          checked={useRegex}
                          onChange={(e) => setUseRegex(e.target.checked)}
                          className="rounded border-border text-primary"
                        />
                        <span>Mode Regex</span>
                      </label>
                    </div>

                    {replaceRes.error && (
                      <div className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                        ⚠️ {replaceRes.error}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        variant="primary"
                        onClick={handleReplaceAllNow}
                        disabled={!findText || replaceRes.matchCount === 0}
                      >
                        Ganti Semua ({replaceRes.matchCount})
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleReplaceFirst}
                        disabled={!findText || replaceRes.matchCount === 0}
                      >
                        Ganti Pertama
                      </Button>
                      <Button variant="ghost" onClick={handleSwap}>
                        <ArrowRightLeft className="mr-1.5 size-3.5" />
                        Tukar ke Input
                      </Button>
                      <Button variant="ghost" onClick={handleLoadSample}>
                        Contoh Teks
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setReplaceSource('')
                          setFindText('')
                          setReplaceWith('')
                        }}
                      >
                        <Trash className="mr-1.5 size-3.5" />
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

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted">
                        {replaceRes.matchCount > 0 ? (
                          <span className="text-success font-medium">
                            ✓ {replaceRes.matchCount} bagian siap/telah diganti
                          </span>
                        ) : (
                          'Tidak ada kecocokan yang ditemukan'
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(replaceRes.result)
                            toast({ title: 'Hasil berhasil disalin ke clipboard', tone: 'success' })
                          }}
                        >
                          <Copy className="mr-1.5 size-3.5" />
                          Salin Hasil
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            const blob = new Blob([replaceRes.result], { type: 'text/plain;charset=utf-8' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `replace-result-${Date.now()}.txt`
                            a.click()
                            URL.revokeObjectURL(url)
                            toast({ title: 'File .txt diunduh', tone: 'success' })
                          }}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          Unduh .txt
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )
          })()}

          {/* ================= 9. TOOL: SQL GENERATOR ================= */}
          {sel === 'sql' && (() => {
            const sqlOutput = generateSqlCode({
              tableName: sqlTable,
              action: sqlAction,
              dialect: sqlDialect,
              columns: sqlColumns,
              whereClause: sqlWhere,
              limit: sqlLimit,
            })

            const handleAddColumn = () => {
              setSqlColumns([
                ...sqlColumns,
                {
                  name: `kolom_${sqlColumns.length + 1}`,
                  type: 'VARCHAR(100)',
                  isPrimaryKey: false,
                  isNullable: true,
                  defaultValue: '',
                  sampleValue: '',
                },
              ])
            }

            const handleRemoveColumn = (index: number) => {
              setSqlColumns(sqlColumns.filter((_, i) => i !== index))
            }

            const handleColumnChange = (index: number, updates: Partial<SqlColumn>) => {
              setSqlColumns(
                sqlColumns.map((col, i) => (i === index ? { ...col, ...updates } : col))
              )
            }

            const applyPreset = (presetName: 'rpa' | 'user' | 'audit') => {
              if (presetName === 'rpa') {
                setSqlTable('robot_monitoring_logs')
                setSqlAction('SELECT')
                setSqlWhere("status = 'FAILED' AND priority = TRUE")
                setSqlColumns([
                  { name: 'id', type: 'BIGINT', isPrimaryKey: true, isAutoIncrement: true, defaultValue: '', sampleValue: '1' },
                  { name: 'robot_code', type: 'VARCHAR(50)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'ROB-065' },
                  { name: 'process_name', type: 'VARCHAR(150)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'Invoice Dispatcher Bot' },
                  { name: 'status', type: 'VARCHAR(30)', isPrimaryKey: false, isNullable: false, defaultValue: "'PENDING'", sampleValue: 'FAILED' },
                  { name: 'error_message', type: 'TEXT', isPrimaryKey: false, isNullable: true, defaultValue: '', sampleValue: "Cloud connector call failed with status code '429'." },
                  { name: 'priority', type: 'BOOLEAN', isPrimaryKey: false, isNullable: false, defaultValue: 'TRUE', sampleValue: 'TRUE' },
                  { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isNullable: true, defaultValue: 'CURRENT_TIMESTAMP', sampleValue: '2026-11-10 10:00:00' },
                ])
                toast({ title: 'Preset RPA Bot Monitoring Dimuat', tone: 'info' })
              } else if (presetName === 'user') {
                setSqlTable('users')
                setSqlAction('CREATE TABLE')
                setSqlColumns([
                  { name: 'id', type: 'UUID', isPrimaryKey: true, defaultValue: 'gen_random_uuid()', sampleValue: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
                  { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'iwan@sikomputer.local' },
                  { name: 'full_name', type: 'VARCHAR(100)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'Iwan Kurniawan' },
                  { name: 'role', type: 'VARCHAR(50)', isPrimaryKey: false, isNullable: false, defaultValue: "'RPA Developer'", sampleValue: 'RPA Developer' },
                  { name: 'is_active', type: 'BOOLEAN', isPrimaryKey: false, isNullable: false, defaultValue: 'TRUE', sampleValue: 'TRUE' },
                  { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', sampleValue: '2026-11-10 08:00:00' },
                ])
                toast({ title: 'Preset User & Akun Dimuat', tone: 'info' })
              } else {
                setSqlTable('audit_logs')
                setSqlAction('INSERT')
                setSqlColumns([
                  { name: 'id', type: 'BIGINT', isPrimaryKey: true, isAutoIncrement: true, defaultValue: '', sampleValue: '1' },
                  { name: 'user_id', type: 'VARCHAR(50)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'u-master' },
                  { name: 'action', type: 'VARCHAR(100)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'RERUN_JOB' },
                  { name: 'target_table', type: 'VARCHAR(100)', isPrimaryKey: false, isNullable: false, defaultValue: '', sampleValue: 'rpa_tasks' },
                  { name: 'details_json', type: 'JSONB', isPrimaryKey: false, isNullable: true, defaultValue: '', sampleValue: '{"reason": "retry_429"}' },
                  { name: 'ip_address', type: 'VARCHAR(45)', isPrimaryKey: false, isNullable: true, defaultValue: '', sampleValue: '127.0.0.1' },
                  { name: 'logged_at', type: 'TIMESTAMP', isPrimaryKey: false, isNullable: false, defaultValue: 'CURRENT_TIMESTAMP', sampleValue: '2026-11-10 11:00:00' },
                ])
                toast({ title: 'Preset Audit Log Dimuat', tone: 'info' })
              }
            }

            return (
              <>
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Generator Kode SQL Otomatis"
                    subtitle="Pilih dialek database, operasi SQL (SELECT, INSERT, UPDATE, CREATE, UPSERT), dan sesuaikan skema kolom"
                    action={
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted mr-1">Preset:</span>
                        <Button variant="ghost" className="h-7 text-xs px-2" onClick={() => applyPreset('rpa')}>
                          🤖 RPA Monitoring
                        </Button>
                        <Button variant="ghost" className="h-7 text-xs px-2" onClick={() => applyPreset('user')}>
                          👤 User Profile
                        </Button>
                        <Button variant="ghost" className="h-7 text-xs px-2" onClick={() => applyPreset('audit')}>
                          📋 Audit Log
                        </Button>
                      </div>
                    }
                  />

                  <div className="p-4 space-y-4">
                    {/* Top Row: Table Name, Dialect, Action */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Nama Tabel Database">
                        <Input
                          placeholder="contoh: monitoring_logs"
                          value={sqlTable}
                          onChange={(e) => setSqlTable(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </Field>

                      <Field label="Dialek Database">
                        <Select
                          value={sqlDialect}
                          onChange={(e) => setSqlDialect(e.target.value as SqlDialect)}
                        >
                          <option value="postgres">PostgreSQL</option>
                          <option value="mysql">MySQL / MariaDB</option>
                          <option value="tsql">SQL Server (T-SQL)</option>
                          <option value="sqlite">SQLite</option>
                          <option value="oracle">Oracle</option>
                        </Select>
                      </Field>

                      <Field label="Operasi / Aksi SQL">
                        <Select
                          value={sqlAction}
                          onChange={(e) => setSqlAction(e.target.value as SqlAction)}
                        >
                          <option value="SELECT">SELECT (Query Data)</option>
                          <option value="INSERT">INSERT INTO (Tambah Baris)</option>
                          <option value="UPDATE">UPDATE (Perbarui Data)</option>
                          <option value="DELETE">DELETE (Hapus Data)</option>
                          <option value="CREATE TABLE">CREATE TABLE (DDL Skema)</option>
                          <option value="UPSERT">UPSERT (Insert on Duplicate)</option>
                        </Select>
                      </Field>
                    </div>

                    {/* Filter WHERE & LIMIT jika berlaku */}
                    {(sqlAction === 'SELECT' || sqlAction === 'UPDATE' || sqlAction === 'DELETE') && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Field label="Klausa Filter (WHERE)">
                            <Input
                              placeholder="contoh: status = 'FAILED' AND priority = TRUE"
                              value={sqlWhere}
                              onChange={(e) => setSqlWhere(e.target.value)}
                              className="font-mono text-xs"
                            />
                          </Field>
                        </div>
                        {sqlAction === 'SELECT' && (
                          <Field label="Batas Baris (LIMIT / TOP)">
                            <Input
                              type="number"
                              min={1}
                              max={10000}
                              value={sqlLimit}
                              onChange={(e) => setSqlLimit(Number(e.target.value) || 50)}
                              className="font-mono text-xs"
                            />
                          </Field>
                        )}
                      </div>
                    )}

                    {/* Columns Table Manager */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table className="size-4 text-primary" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                            Daftar Kolom ({sqlColumns.length})
                          </span>
                        </div>
                        <Button variant="secondary" className="h-7 text-xs px-2.5" onClick={handleAddColumn}>
                          <Plus className="mr-1 size-3.5" />
                          Tambah Kolom
                        </Button>
                      </div>

                      {/* Mobile Compact Cards */}
                      <div className="space-y-2.5 sm:hidden">
                        {sqlColumns.map((col, idx) => (
                          <div key={idx} className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={col.name}
                                onChange={(e) => handleColumnChange(idx, { name: e.target.value })}
                                className="w-full rounded border border-border bg-surface px-2 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                placeholder="nama_kolom"
                              />
                              <input
                                type="text"
                                value={col.type}
                                onChange={(e) => handleColumnChange(idx, { type: e.target.value })}
                                className="w-full rounded border border-border bg-surface px-2 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                placeholder="VARCHAR(255)"
                                list="data-types-list"
                              />
                            </div>
                            <input
                              type="text"
                              value={col.sampleValue || ''}
                              onChange={(e) => handleColumnChange(idx, { sampleValue: e.target.value })}
                              className="w-full rounded border border-border bg-surface px-2 py-1.5 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                              placeholder="Nilai contoh (mis. ROB-065)"
                            />
                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex items-center gap-3 text-[11px] text-muted">
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={col.isPrimaryKey || false}
                                    onChange={(e) => handleColumnChange(idx, { isPrimaryKey: e.target.checked })}
                                    className="rounded border-border text-primary"
                                  />
                                  PK
                                </label>
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={col.isAutoIncrement || false}
                                    onChange={(e) => handleColumnChange(idx, { isAutoIncrement: e.target.checked })}
                                    className="rounded border-border text-primary"
                                  />
                                  AutoInc
                                </label>
                              </div>
                              <button
                                onClick={() => handleRemoveColumn(idx)}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted hover:bg-surface hover:text-danger"
                              >
                                <Trash className="size-3.5" />
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface-2/30 sm:block">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border bg-surface-2/60 text-muted">
                            <tr>
                              <th className="py-2 px-3 font-medium">Nama Kolom</th>
                              <th className="py-2 px-3 font-medium">Tipe Data</th>
                              <th className="py-2 px-2 text-center font-medium">PK</th>
                              <th className="py-2 px-2 text-center font-medium">AutoInc</th>
                              <th className="py-2 px-3 font-medium">Nilai Contoh</th>
                              <th className="py-2 px-2 text-center font-medium">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {sqlColumns.map((col, idx) => (
                              <tr key={idx} className="hover:bg-surface-2/40">
                                <td className="py-1.5 px-3">
                                  <input
                                    type="text"
                                    value={col.name}
                                    onChange={(e) => handleColumnChange(idx, { name: e.target.value })}
                                    className="w-full rounded bg-surface border border-border px-2 py-1 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                    placeholder="nama_kolom"
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  <input
                                    type="text"
                                    value={col.type}
                                    onChange={(e) => handleColumnChange(idx, { type: e.target.value })}
                                    className="w-full rounded bg-surface border border-border px-2 py-1 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                    placeholder="VARCHAR(255)"
                                    list="data-types-list"
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={col.isPrimaryKey || false}
                                    onChange={(e) => handleColumnChange(idx, { isPrimaryKey: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    title="Primary Key"
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={col.isAutoIncrement || false}
                                    onChange={(e) => handleColumnChange(idx, { isAutoIncrement: e.target.checked })}
                                    className="rounded border-border text-primary"
                                    title="Auto Increment / Identity"
                                  />
                                </td>
                                <td className="py-1.5 px-3">
                                  <input
                                    type="text"
                                    value={col.sampleValue || ''}
                                    onChange={(e) => handleColumnChange(idx, { sampleValue: e.target.value })}
                                    className="w-full rounded bg-surface border border-border px-2 py-1 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                    placeholder="contoh_nilai"
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveColumn(idx)}
                                    className="p-1 rounded text-muted hover:text-danger hover:bg-surface transition-colors"
                                    title="Hapus Kolom"
                                  >
                                    <Trash className="size-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <datalist id="data-types-list">
                          <option value="VARCHAR(50)" />
                          <option value="VARCHAR(150)" />
                          <option value="VARCHAR(255)" />
                          <option value="TEXT" />
                          <option value="INT" />
                          <option value="BIGINT" />
                          <option value="DECIMAL(12,2)" />
                          <option value="BOOLEAN" />
                          <option value="TIMESTAMP" />
                          <option value="DATE" />
                          <option value="UUID" />
                          <option value="JSONB" />
                        </datalist>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Output Card */}
                <Card className="lg:col-span-2">
                  <CardHeader
                    title="Kode SQL Tergenerate"
                    subtitle={sqlOutput.explanation}
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{sqlDialect.toUpperCase()}</Badge>
                        <Badge tone="neutral">{sqlAction}</Badge>
                        <Button
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(sqlOutput.sql)
                            toast({ title: 'Query SQL Tersalin ke Clipboard', tone: 'success' })
                          }}
                        >
                          <Copy className="mr-1.5 size-3.5" />
                          Salin SQL
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => {
                            const blob = new Blob([sqlOutput.sql], { type: 'text/sql;charset=utf-8' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `${sqlTable}-${sqlAction.toLowerCase().replace(/\s+/g, '_')}.sql`
                            a.click()
                            URL.revokeObjectURL(url)
                            toast({ title: 'File .sql berhasil diunduh', tone: 'success' })
                          }}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          Unduh .sql
                        </Button>
                      </div>
                    }
                  />

                  <div className="p-4 space-y-3">
                    <pre className="rounded-lg border border-border bg-[#090d16] p-4 font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                      <code>{sqlOutput.sql}</code>
                    </pre>
                  </div>
                </Card>
              </>
            )
          })()}
        </div>
      )}
    </>
  )
}

/* =========================================================================
   2. SNIPPET & PROMPT VAULT
   ========================================================================= */

const initialSeedSnippets: SnippetEntity[] = [
  {
    id: 'sn-1',
    kind: 'code',
    lang: 'typescript',
    title: 'useDebounce Hook',
    code: `import { useEffect, useState } from 'react'\n\nexport function useDebounce<T>(value: T, delay = {{delayMs}}): T {\n  const [debounced, setDebounced] = useState(value)\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay)\n    return () => clearTimeout(timer)\n  }, [value, delay])\n  return debounced\n}`,
    tags: ['react', 'hook', 'debounce'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sn-2',
    kind: 'prompt',
    lang: 'markdown',
    title: 'Refactor Code Clean Architecture',
    code: `Anda adalah software architect senior. Silakan lakukan refactor pada kode {{bahasa}} berikut dengan memisahkan domain logic dari framework adapter. Pastikan kode memiliki unit test ready:\n\n{{kode}}`,
    tags: ['ai', 'refactor', 'prompt'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sn-3',
    kind: 'payload',
    lang: 'bash',
    title: 'cURL Auth Bearer Template',
    code: `curl -X POST "{{url}}"\n  -H "Authorization: Bearer {{token}}"\n  -H "Content-Type: application/json"\n  -d '{"query": "{{query}}"}'`,
    tags: ['curl', 'api', 'bash'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const kindTone = { code: 'info', prompt: 'accent', payload: 'warning' } as const

export function VaultPage() {
  const toast = useToast()
  const [kind, setKind] = useState<'all' | 'code' | 'prompt' | 'payload'>('all')
  const [search, setSearch] = useState('')
  const [snippetsList, setSnippetsList] = useState<SnippetEntity[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // New Item Modal State
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState<'code' | 'prompt' | 'payload'>('code')
  const [newLang, setNewLang] = useState('typescript')
  const [newCode, setNewCode] = useState('')
  const [newTags, setNewTags] = useState('react, utility')

  // Variable Fill Modal State
  const [varModalOpen, setVarModalOpen] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  // Load snippets from Dexie
  const loadSnippets = async () => {
    try {
      const count = await db.snippets.count()
      if (count === 0 && !localStorage.getItem('sk-has-seeded')) {
        await db.snippets.bulkAdd(initialSeedSnippets)
      }
      const all = await db.snippets.reverse().sortBy('updatedAt')
      setSnippetsList(all)
      if (all.length > 0 && !selectedId) {
        setSelectedId(all[0].id)
      }
    } catch {
      //
    }
  }

  useEffect(() => {
    void loadSnippets()
  }, [])

  // Filtered List
  const filteredList = snippetsList.filter((s) => {
    const matchesKind = kind === 'all' || s.kind === kind
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    return matchesKind && matchesSearch
  })

  const cur = snippetsList.find((s) => s.id === selectedId) || snippetsList[0]
  const allTags = Array.from(new Set(snippetsList.flatMap((s) => s.tags)))

  // Handle Save New Snippet
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newCode.trim()) {
      toast({ title: 'Judul dan kode wajib diisi', tone: 'danger' })
      return
    }

    const item: SnippetEntity = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      kind: newKind,
      lang: newLang,
      code: newCode,
      tags: newTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.snippets.add(item)
    void loadSnippets()
    setSelectedId(item.id)
    setNewModalOpen(false)
    setNewTitle('')
    setNewCode('')
    toast({ title: 'Snippet Disimpan ke Vault', tone: 'success' })
  }

  // Handle Delete Snippet
  const handleDeleteSnippet = async (id: string) => {
    await db.snippets.delete(id)
    void loadSnippets()
    toast({ title: 'Snippet dihapus', tone: 'info' })
  }

  // Extract variables like {{name}}
  const detectedVariables = cur?.code
    ? Array.from(new Set(cur.code.match(/\{\{\w+\}\}/g) || [])).map((v) => v.slice(2, -2))
    : []

  // Handle Open Variable Fill Modal
  const handleOpenVarModal = () => {
    const initVals: Record<string, string> = {}
    detectedVariables.forEach((v) => {
      initVals[v] = variableValues[v] || ''
    })
    setVariableValues(initVals)
    setVarModalOpen(true)
  }

  // Generate code with filled variables
  const substitutedCode = cur
    ? cur.code.replace(/\{\{(\w+)\}\}/g, (_, key) => variableValues[key] || `{{${key}}}`)
    : ''

  return (
    <>
      <PageHeader
        title="Snippet &amp; Prompt Vault"
        description="Simpan snippet kode, prompt AI, dan payload request ber-parameter yang tersimpan aman di IndexedDB"
        icon={<Braces className="size-5" />}
        color="var(--mod-dev)"
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setNewModalOpen(true)}>
            Item Baru
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <Input
            leading={<Search className="size-4" />}
            placeholder="Cari judul, tag, atau kode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {(['all', 'code', 'prompt', 'payload'] as const).map((k) => (
              <Chip
                key={k}
                active={kind === k}
                onClick={() => setKind(k)}
                className="shrink-0 capitalize"
              >
                {k === 'all' ? 'Semua' : k}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap gap-1">
            {allTags.map((t) => (
              <Badge
                key={t}
                className="cursor-pointer hover:text-text"
                onClick={() => setSearch(t)}
              >
                #{t}
              </Badge>
            ))}
          </div>

          <ul className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredList.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    'w-full rounded-lg border bg-surface p-3 text-left transition-colors cursor-pointer',
                    selectedId === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted/50',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-xs text-text">{s.title}</span>
                    <Badge tone={kindTone[s.kind as keyof typeof kindTone] || 'neutral'}>
                      {s.kind}
                    </Badge>
                  </div>
                  <p className="line-clamp-1 font-mono text-[11px] text-muted">
                    {s.code.replace(/\n/g, ' ')}
                  </p>
                </button>
              </li>
            ))}
            {filteredList.length === 0 && (
              <li className="p-8 text-center text-xs text-muted border border-dashed border-border rounded-lg">
                Tidak ada snippet yang cocok.
              </li>
            )}
          </ul>
        </div>

        {cur ? (
          <Card className="h-fit">
            <CardHeader
              title={cur.title}
              subtitle={`${cur.kind.toUpperCase()} · ${cur.lang}`}
              action={
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    icon={<Copy className="size-3.5" />}
                    onClick={() => {
                      void navigator.clipboard.writeText(cur.code)
                      toast({ title: 'Snippet disalin' })
                    }}
                  >
                    Salin
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSnippet(cur.id)}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              }
            />
            <div className="space-y-4 p-4">
              <CodeBlock label={cur.lang} code={cur.code} maxHeight={340} />

              {detectedVariables.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-2 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-xs text-text">
                        Parameter Variabel Terdeteksi ({detectedVariables.length})
                      </p>
                      <p className="text-[11px] text-muted">
                        Format <code>{'{{variable}}'}</code> dapat diisi otomatis sebelum disalin.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Sparkles className="size-3.5" />}
                      onClick={handleOpenVarModal}
                    >
                      Isi Variabel &amp; Salin
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {detectedVariables.map((v) => (
                      <Badge key={v} tone="accent" className="font-mono text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                {cur.tags.map((t) => (
                  <Badge key={t} tone="primary">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div className="py-20 text-center text-xs text-muted">Pilih snippet untuk melihat detail.</div>
        )}
      </div>

      {/* ================= MODAL ITEM BARU ================= */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <span>Tambah Snippet / Prompt Baru</span>
          </div>
        }
      >
        <form onSubmit={handleSaveNew} className="space-y-4">
          <Field label="Judul Item">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Regex Email Parser"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jenis Item">
              <Select value={newKind} onChange={(e: any) => setNewKind(e.target.value)}>
                <option value="code">Kode Program</option>
                <option value="prompt">Prompt AI</option>
                <option value="payload">Payload / Request</option>
              </Select>
            </Field>

            <Field label="Bahasa / Format">
              <Select value={newLang} onChange={(e) => setNewLang(e.target.value)}>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="bash">Bash / Shell</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
                <option value="markdown">Markdown</option>
              </Select>
            </Field>
          </div>

          <Field
            label="Isi Konten / Kode"
            hint="Gunakan format {{variabel}} untuk parameter dinamis"
          >
            <Textarea
              mono
              className="min-h-40 font-mono text-xs"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Masukkan kode atau prompt Anda..."
            />
          </Field>

          <Field label="Tags (Pisahkan koma)">
            <Input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="react, api, auth"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" type="button" onClick={() => setNewModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan ke Vault
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL ISI VARIABEL ================= */}
      <Modal
        open={varModalOpen}
        onClose={() => setVarModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span>Isi Nilai Variabel Dinamis</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Masukkan nilai untuk setiap variabel di bawah ini. Kode akan otomatis disesuaikan secara real-time.
          </p>

          <div className="space-y-3">
            {detectedVariables.map((v) => (
              <Field key={v} label={`Variabel: {{${v}}}`}>
                <Input
                  value={variableValues[v] || ''}
                  onChange={(e) =>
                    setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                  }
                  placeholder={`Isi nilai untuk ${v}`}
                  className="font-mono text-xs"
                />
              </Field>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold mb-1 text-muted uppercase">Pratinjau Hasil:</p>
            <CodeBlock label={cur?.lang} code={substitutedCode} maxHeight={160} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setVarModalOpen(false)}>
              Tutup
            </Button>
            <Button
              variant="primary"
              icon={<Copy className="size-4" />}
              onClick={() => {
                void navigator.clipboard.writeText(substitutedCode)
                toast({ title: 'Kode dengan variabel berhasil disalin ke clipboard!', tone: 'success' })
                setVarModalOpen(false)
              }}
            >
              Salin Kode Hasil
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
