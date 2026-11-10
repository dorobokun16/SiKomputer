import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileSpreadsheet,
  Filter,
  Flame,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
} from '@/components/ui/primitives'
import { Dropzone, PageHeader } from '@/components/ui/blocks'
import { Tabs, useToast } from '@/components/ui/overlays'
import {
  generateReportText,
  parseRpaMonitoringExcel,
  type RpaFilterMode,
  type RpaMonitoringResult,
  type RpaRobotItem,
} from '@/services/rpa-monitoring.service'

export function RpaMonitoringPage() {
  const toast = useToast()
  const [filterMode, setFilterMode] = useState<RpaFilterMode>('all_issues')
  const [activeTab, setActiveTab] = useState<'priority' | 'non-priority'>('priority')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Current Buffer for re-filtering
  const [currentBuffer, setCurrentBuffer] = useState<ArrayBuffer | null>(null)
  const [result, setResult] = useState<RpaMonitoringResult | null>(null)

  // Editable items state
  const [priorityItems, setPriorityItems] = useState<RpaRobotItem[]>([])
  const [nonPriorityItems, setNonPriorityItems] = useState<RpaRobotItem[]>([])

  const resetAll = () => {
    setCurrentBuffer(null)
    setResult(null)
    setPriorityItems([])
    setNonPriorityItems([])
  }

  const handleProcessBuffer = async (
    buffer: ArrayBuffer,
    fileName: string,
    filter: RpaFilterMode = filterMode
  ) => {
    setLoading(true)
    try {
      const res = await parseRpaMonitoringExcel(buffer, fileName, filter)
      setCurrentBuffer(buffer)
      setResult(res)
      setPriorityItems(res.priorityItems)
      setNonPriorityItems(res.nonPriorityItems)
      toast({
        title: 'Berkas Monitoring Berhasil Dipindai',
        description: `Ditemukan ${res.priorityItems.length} Robot Priority & ${res.nonPriorityItems.length} Non-Priority berkendala.${res.hiddenColumnsCount > 0 ? ` Termasuk ${res.hiddenColumnsCount} kolom tersembunyi terbaca.` : ''}`,
        tone: 'success',
      })
    } catch (e) {
      toast({
        title: 'Gagal Memproses Berkas',
        description: e instanceof Error ? e.message : 'Pastikan format Excel sesuai.',
        tone: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle User Upload
  const handleFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer()
    await handleProcessBuffer(buffer, file.name)
  }

  // Handle Load Sample In-Memory (100% Offline, tanpa perlu file eksternal)
  const handleLoadSample = async () => {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')
      const now = new Date()
      const hrsAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString()
      const minsAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000).toISOString()

      const rows = [
        [
          'Job Name',
          'Robot Number',
          'Priority',
          'Last Queue Success',
          'Threshold Status',
          'Threshold (word)',
          'Robot Name',
          'Status',
          'Error Remarks',
        ],
        [
          'Invoice Dispatcher',
          'ROB-065',
          true,
          hrsAgo(1),
          'Over Threshold',
          '1 Hours ago',
          'Invoice Bot PA',
          'Faulted',
          "Cloud connector call failed with status code '429'.",
        ],
        [
          'Rekonsiliasi Harian',
          'ROB-206',
          true,
          hrsAgo(3),
          'Over Threshold',
          '3 Hours ago',
          'Rekon Bot PA',
          'Failed',
          "Cloud connector call failed with status code '429'.",
        ],
        [
          'Sync Portal Jarvis',
          'ROB-269',
          true,
          hrsAgo(1),
          'Over Threshold',
          '1 Hours ago',
          'Jarvis Sync Bot',
          'Faulted',
          'Unable to login to Jarvis website.',
        ],
        [
          'Report Non-Prior',
          'ROB-203',
          false,
          minsAgo(43),
          'Over Threshold',
          '43 minutes ago',
          'Archiving Bot',
          'Faulted',
          "Cloud connector call failed with status code '429'.",
        ],
        [
          'Payroll Export',
          'ROB-101',
          true,
          minsAgo(10),
          'OK',
          '10 minutes ago',
          'Payroll Bot',
          'Succeeded',
          '',
        ],
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      // Tandai salah satu kolom sebagai hidden column untuk verifikasi fitur pembacaan hidden column
      ws['!cols'] = [{}, {}, {}, {}, { hidden: true }, { hidden: true }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Robot List')
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

      await handleProcessBuffer(out, 'Monitoring-Contoh.xlsx')
    } catch {
      toast({
        title: 'Gagal Membaca Sampel',
        description: 'Silakan unggah berkas Excel Monitoring Anda secara manual.',
        tone: 'warning',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle Filter Change
  const handleFilterChange = async (newMode: RpaFilterMode) => {
    setFilterMode(newMode)
    if (currentBuffer && result) {
      await handleProcessBuffer(currentBuffer, result.fileName, newMode)
    }
  }

  // Update Action on specific item
  const handleActionChange = (id: string, newAction: string, isPrio: boolean) => {
    if (isPrio) {
      setPriorityItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, action: newAction } : item))
      )
    } else {
      setNonPriorityItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, action: newAction } : item))
      )
    }
  }

  // Generate real-time output text
  const currentPriorityText = generateReportText(
    'Update monitoring robot PA status : ',
    priorityItems
  )

  const currentNonPriorityText = generateReportText(
    'Update Monitoring robot Non Prior PA Status :',
    nonPriorityItems
  )

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast({
      title: 'Teks Format Berhasil Disalin',
      description: 'Siap ditempelkan ke chat tim atau laporan operasional.',
      tone: 'success',
    })
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Monitoring RPA"
        description="Pindai sheet 'Robot List' dari berkas Excel monitoring untuk mendeteksi robot gagal atau melewati threshold, dan hasilkan format pesan siap salin."
        icon={<Bot className="size-5" />}
        color="var(--mod-dev)"
        actions={
          result && (
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={resetAll}>
              Ganti Berkas
            </Button>
          )
        }
      />

      {/* Area Upload File */}
      {!result ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Unggah Berkas Excel Monitoring"
              subtitle="Berkas diproses langsung di memori browser (tidak disimpan ke database / server)"
              icon={<FileSpreadsheet className="size-4 text-primary" />}
            />
            <div className="space-y-4 p-4 sm:p-5">
              <Dropzone
                title="Tarik Berkas Excel Monitoring ke Sini"
                hint="Mendukung format .xlsx atau .xls (sheet 'Robot List'). Termasuk kemampuan membaca kolom tersembunyi (hidden columns)."
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onFile={handleFileUpload}
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted">
                  Ingin langsung menguji dengan data contoh?
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Sparkles className="size-3.5 text-primary" />}
                  onClick={handleLoadSample}
                  loading={loading}
                >
                  Uji dengan Monitoring.xlsx
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Baris Ringkasan & Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" className="px-2.5 py-1">
                Berkas: <strong className="ml-1 text-foreground">{result.fileName}</strong>
              </Badge>
              <Badge tone="info" className="px-2.5 py-1">
                {result.totalScanned} Total Robot
              </Badge>
              <Badge tone="danger" className="px-2.5 py-1">
                {priorityItems.length} Priority Berkendala
              </Badge>
              <Badge tone="warning" className="px-2.5 py-1">
                {nonPriorityItems.length} Non-Priority Berkendala
              </Badge>
              {result.hiddenColumnsCount > 0 && (
                <Badge tone="success" className="px-2.5 py-1">
                  <Eye className="mr-1 inline-block size-3.5" />
                  {result.hiddenColumnsCount} Kolom Tersembunyi Terbaca
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted" />
              <Select
                value={filterMode}
                onChange={(e) => handleFilterChange(e.target.value as RpaFilterMode)}
                className="w-64 text-xs"
              >
                <option value="all_issues">Semua Kendala (Gagal / NOK)</option>
                <option value="thresh_only">Hanya Melebihi Threshold (NOK)</option>
                <option value="failed_only">Hanya Status Gagal (Failed)</option>
                <option value="both_strict">Gagal DAN Melebihi Threshold</option>
              </Select>
            </div>
          </div>

          {/* Banner Informasi Kolom Tersembunyi (Hidden Columns) */}
          {result.hiddenColumnsCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              <Eye className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {result.hiddenColumnsCount} Kolom Tersembunyi (Hidden Columns) Berhasil Dibaca Lengkap
                </p>
                <p className="text-muted leading-relaxed">
                  Kolom tersembunyi yang diekstrak:{' '}
                  <span className="font-mono font-medium text-foreground">
                    {result.hiddenColumnNames.join(', ')}
                  </span>
                  . Seluruh data rincian error, log runner, dan timestamp insiden diproses tanpa ada informasi yang hilang.
                </p>
              </div>
            </div>
          )}

          {/* Tab Pilihan Priority vs Non-Priority */}
          <Tabs<'priority' | 'non-priority'>
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              {
                id: 'priority',
                label: `Priority Robots (${priorityItems.length})`,
                icon: <Flame className="size-4 text-rose-500" />,
              },
              {
                id: 'non-priority',
                label: `Non-Priority Robots (${nonPriorityItems.length})`,
                icon: <Activity className="size-4 text-amber-500" />,
              },
            ]}
          />

          {/* Grid: Output Teks Siap Salin (Kiri) & Daftar Robot Interaktif (Kanan) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[450px_minmax(0,1fr)]">
            {/* Panel Kiri: Text Output Ready to Copy */}
            <div className="space-y-4">
              <Card className="border-primary/40 bg-gradient-to-b from-primary/5 to-surface">
                <CardHeader
                  title={
                    activeTab === 'priority'
                      ? 'Format Chat: Status Robot Priority'
                      : 'Format Chat: Status Robot Non-Priority'
                  }
                  subtitle="Teks output terstruktur siap dikirim ke tim"
                  action={
                    <Button
                      size="sm"
                      variant="primary"
                      icon={
                        copiedKey === activeTab ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )
                      }
                      onClick={() =>
                        handleCopyText(
                          activeTab === 'priority' ? currentPriorityText : currentNonPriorityText,
                          activeTab
                        )
                      }
                    >
                      {copiedKey === activeTab ? 'Tersalin!' : 'Salin Format Chat'}
                    </Button>
                  }
                />

                <div className="p-4 pt-0">
                  <div className="relative rounded-lg border border-border bg-surface-2/60 p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-[560px] overflow-y-auto">
                    {activeTab === 'priority' ? currentPriorityText : currentNonPriorityText}
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Bagian <code>&gt; Action:</code> dibiarkan kosong sesuai instruksi untuk diisi manual oleh Support RPA. Anda juga dapat mengetik langsung aksi pada kartu di sebelah kanan untuk memperbarui teks secara langsung.
                  </p>
                </div>
              </Card>
            </div>

            {/* Panel Kanan: Daftar Robot Berkendala dengan Input Action Opsional */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  Daftar Robot yang Memerlukan Tindakan ({activeTab === 'priority' ? priorityItems.length : nonPriorityItems.length})
                </h4>
                <span className="text-xs text-muted">Ketik tindakan di bawah untuk melengkapi laporan</span>
              </div>

              {(activeTab === 'priority' ? priorityItems : nonPriorityItems).length === 0 ? (
                <Card className="p-8 text-center text-muted">
                  <CheckCircle2 className="mx-auto size-10 text-success mb-2" />
                  <p className="text-sm font-medium text-foreground">Kondisi Normal</p>
                  <p className="text-xs text-muted">Tidak ada robot yang bermasalah pada kategori ini.</p>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {(activeTab === 'priority' ? priorityItems : nonPriorityItems).map((item) => (
                    <Card key={item.id} className="p-4 space-y-2.5 border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {item.robotNo}
                            </span>
                            <Badge
                              tone={
                                item.status.toLowerCase().includes('failed')
                                  ? 'danger'
                                  : item.status.toLowerCase().includes('running')
                                  ? 'info'
                                  : 'warning'
                              }
                            >
                              {item.status}
                            </Badge>
                            {item.thresholdStatus === 'NOK' && (
                              <Badge tone="danger">Threshold NOK ({item.thresholdWord})</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted mt-0.5 truncate max-w-md" title={item.robotName}>
                            {item.robotName || item.jobName}
                          </p>
                        </div>

                        <span className="flex items-center gap-1 text-[11px] text-muted whitespace-nowrap">
                          <Clock className="size-3" />
                          {item.timeAgo}
                        </span>
                      </div>

                      {/* Detail Issue */}
                      <div className="rounded border border-border bg-surface-2/40 p-2 text-xs">
                        <span className="font-semibold text-rose-500 mr-1.5">Issue:</span>
                        <span className="text-muted leading-relaxed">{item.issue}</span>
                      </div>

                      {/* Input Opsional untuk Action */}
                      <Field label="Tindakan / Action (Opsional)">
                        <Input
                          value={item.action}
                          onChange={(e) =>
                            handleActionChange(item.id, e.target.value, activeTab === 'priority')
                          }
                          placeholder="Contoh: Rerun jobs / Rerun dispatcher / Restart runner..."
                          className="text-xs h-8"
                        />
                      </Field>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
