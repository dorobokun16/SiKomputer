import {
  FileSpreadsheet,
  ArrowRightLeft,
  Download,
  Copy,
  Check,
  Table,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Select,
} from '@/components/ui/primitives'
import { Dropzone, PageHeader } from '@/components/ui/blocks'
import { Segmented, useToast } from '@/components/ui/overlays'
import {
  convertCsvToXlsx,
  convertXlsxToCsv,
  type SpreadsheetPreview,
} from '@/services/spreadsheet.service'

type Mode = 'csv-to-xlsx' | 'xlsx-to-csv'

const sampleCsvData = `ID,Nama,Posisi,Departemen,Gaji,Status
101,Budi Santoso,RPA Developer,IT & Automation,12500000,Aktif
102,Siti Rahma,Data Analyst,Business Intelligence,11000000,Aktif
103,Ahmad Fauzi,QA Automation,Quality Assurance,9500000,Aktif
104,Dewi Lestari,Product Manager,Digital Transformation,16000000,Aktif
105,Rian Pratama,Backend Engineer,Core Engineering,13000000,Aktif`

export function SpreadsheetConverterPage() {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('csv-to-xlsx')
  const [delimiter, setDelimiter] = useState(',')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // CSV to XLSX State
  const [rawCsvText, setRawCsvText] = useState('')
  const [xlsxResultBlob, setXlsxResultBlob] = useState<Blob | null>(null)
  const [csvPreview, setCsvPreview] = useState<SpreadsheetPreview | null>(null)

  // XLSX to CSV State
  const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [csvResultText, setCsvResultText] = useState('')
  const [csvResultBlob, setCsvResultBlob] = useState<Blob | null>(null)
  const [xlsxPreview, setXlsxPreview] = useState<SpreadsheetPreview | null>(null)

  const resetAll = () => {
    setFileName('')
    setRawCsvText('')
    setXlsxResultBlob(null)
    setCsvPreview(null)
    setXlsxBuffer(null)
    setSheetNames([])
    setSelectedSheetIndex(0)
    setCsvResultText('')
    setCsvResultBlob(null)
    setXlsxPreview(null)
  }

  // Handle CSV File Upload
  const handleCsvFile = async (file: File) => {
    setLoading(true)
    setFileName(file.name)
    try {
      const text = await file.text()
      setRawCsvText(text)
      const res = await convertCsvToXlsx(text, { delimiter })
      setXlsxResultBlob(res.xlsxBlob)
      setCsvPreview(res.preview)
      toast({ title: 'CSV Berhasil Dibaca', tone: 'success' })
    } catch {
      toast({ title: 'Gagal memproses berkas CSV', tone: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  // Load Sample CSV
  const handleLoadSample = async () => {
    setLoading(true)
    setFileName('data-karyawan-sample.csv')
    setRawCsvText(sampleCsvData)
    try {
      const res = await convertCsvToXlsx(sampleCsvData, { delimiter })
      setXlsxResultBlob(res.xlsxBlob)
      setCsvPreview(res.preview)
      toast({ title: 'Sampel CSV Dimuat', tone: 'info' })
    } finally {
      setLoading(false)
    }
  }

  // Handle XLSX File Upload
  const handleXlsxFile = async (file: File) => {
    setLoading(true)
    setFileName(file.name)
    try {
      const buffer = await file.arrayBuffer()
      setXlsxBuffer(buffer)
      const res = await convertXlsxToCsv(buffer, {
        sheetIndex: 0,
        delimiter,
      })
      setSheetNames(res.sheetNames)
      setSelectedSheetIndex(0)
      setCsvResultText(res.csvText)
      setCsvResultBlob(res.csvBlob)
      setXlsxPreview(res.preview)
      toast({ title: 'Berkas Excel Berhasil Dikonversi', tone: 'success' })
    } catch {
      toast({ title: 'Gagal membaca berkas Excel', tone: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  // Change Sheet
  const handleSelectSheet = async (index: number) => {
    if (!xlsxBuffer) return
    setSelectedSheetIndex(index)
    setLoading(true)
    try {
      const res = await convertXlsxToCsv(xlsxBuffer, {
        sheetIndex: index,
        delimiter,
      })
      setCsvResultText(res.csvText)
      setCsvResultBlob(res.csvBlob)
      setXlsxPreview(res.preview)
    } finally {
      setLoading(false)
    }
  }

  // Change Delimiter
  const handleDelimiterChange = async (newDelim: string) => {
    setDelimiter(newDelim)
    if (mode === 'csv-to-xlsx' && rawCsvText) {
      const res = await convertCsvToXlsx(rawCsvText, { delimiter: newDelim })
      setXlsxResultBlob(res.xlsxBlob)
      setCsvPreview(res.preview)
    } else if (mode === 'xlsx-to-csv' && xlsxBuffer) {
      const res = await convertXlsxToCsv(xlsxBuffer, {
        sheetIndex: selectedSheetIndex,
        delimiter: newDelim,
      })
      setCsvResultText(res.csvText)
      setCsvResultBlob(res.csvBlob)
    }
  }

  // Download Output
  const handleDownload = () => {
    if (mode === 'csv-to-xlsx' && xlsxResultBlob) {
      const url = URL.createObjectURL(xlsxResultBlob)
      const a = document.createElement('a')
      a.href = url
      const outName = fileName ? fileName.replace(/\.[^/.]+$/, '') + '.xlsx' : 'spreadsheet-converted.xlsx'
      a.download = outName
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Berkas XLSX Diunduh', tone: 'success' })
    } else if (mode === 'xlsx-to-csv' && csvResultBlob) {
      const url = URL.createObjectURL(csvResultBlob)
      const a = document.createElement('a')
      a.href = url
      const sheetName = sheetNames[selectedSheetIndex] ? `-${sheetNames[selectedSheetIndex]}` : ''
      const outName = fileName ? fileName.replace(/\.[^/.]+$/, '') + `${sheetName}.csv` : 'spreadsheet-converted.csv'
      a.download = outName
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Berkas CSV Diunduh', tone: 'success' })
    }
  }

  // Copy CSV Text
  const handleCopyCsv = () => {
    if (!csvResultText) return
    navigator.clipboard.writeText(csvResultText)
    setCopied(true)
    toast({ title: 'Teks CSV Tersalin ke Clipboard', tone: 'success' })
    setTimeout(() => setCopied(false), 2000)
  }

  const currentPreview = mode === 'csv-to-xlsx' ? csvPreview : xlsxPreview

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konverter CSV & Excel"
        description="Konversi berkas dua arah CSV ke Excel (.xlsx) atau Excel (.xlsx) ke CSV secara instan tanpa mengunggah berkas ke server."
        icon={<FileSpreadsheet className="size-5" />}
        color="var(--mod-dev)"
        actions={
          (fileName || rawCsvText) && (
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={resetAll}>
              Reset
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Panel Kiri: Input & Pengaturan */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Arah Konversi"
              subtitle="Pilih format awal dan format tujuan"
              icon={<ArrowRightLeft className="size-4 text-primary" />}
            />
            <div className="space-y-4 p-4 pt-0">
              <Segmented<Mode>
                options={[
                  { id: 'csv-to-xlsx', label: 'CSV ➔ Excel (.xlsx)' },
                  { id: 'xlsx-to-csv', label: 'Excel (.xlsx) ➔ CSV' },
                ]}
                value={mode}
                onChange={(m) => {
                  setMode(m)
                  resetAll()
                }}
              />

              {mode === 'csv-to-xlsx' ? (
                <div className="space-y-3">
                  <Dropzone
                    title="Pilih atau Tarik Berkas CSV"
                    hint="Format .csv (Comma / Semicolon separated)"
                    accept=".csv,text/csv"
                    onFile={handleCsvFile}
                    compact
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted">Belum punya berkas?</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Sparkles className="size-3.5 text-primary" />}
                      onClick={handleLoadSample}
                    >
                      Coba Data Sampel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Dropzone
                    title="Pilih atau Tarik Berkas Excel"
                    hint="Format .xlsx atau .xls"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onFile={handleXlsxFile}
                    compact
                  />
                </div>
              )}

              {/* Opsi Pembatas / Delimiter */}
              <Field
                label="Karakter Pemisah (Delimiter CSV)"
                hint="Gunakan Titik Koma (;) untuk standar Excel Indonesia / Eropa"
              >
                <Select
                  value={delimiter}
                  onChange={(e) => handleDelimiterChange(e.target.value)}
                >
                  <option value=",">Koma (,) — Standar Internasional</option>
                  <option value=";">Titik Koma (;) — Standar Excel Indonesia / Regional</option>
                  <option value="&#9;">Tab (\t) — TSV (Tab Separated)</option>
                  <option value="|">Garis Tegak (|) — Pipe Separated</option>
                </Select>
              </Field>

              {/* Opsi Pilih Sheet (untuk XLSX to CSV) */}
              {mode === 'xlsx-to-csv' && sheetNames.length > 1 && (
                <Field label="Pilih Lembar Kerja (Worksheet)">
                  <Select
                    value={selectedSheetIndex}
                    onChange={(e) => handleSelectSheet(Number(e.target.value))}
                  >
                    {sheetNames.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          {/* Kartu Tombol Unduh */}
          {((mode === 'csv-to-xlsx' && xlsxResultBlob) || (mode === 'xlsx-to-csv' && csvResultBlob)) && (
            <Card className="border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Hasil Siap Diunduh</h4>
                  <p className="text-xs text-muted">
                    {mode === 'csv-to-xlsx' ? 'Format Excel Workbook (.xlsx)' : 'Format Text Comma Separated (.csv)'}
                  </p>
                </div>
                <Badge tone="success">100% Offline</Badge>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="primary"
                  icon={<Download className="size-4" />}
                  onClick={handleDownload}
                  loading={loading}
                  className="w-full"
                >
                  Unduh Berkas {mode === 'csv-to-xlsx' ? '.xlsx' : '.csv'}
                </Button>

                {mode === 'xlsx-to-csv' && csvResultText && (
                  <Button
                    variant="secondary"
                    icon={copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                    onClick={handleCopyCsv}
                  >
                    Salin Teks CSV
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Panel Kanan: Pratinjau Tabel Data */}
        <div className="space-y-4">
          <Card className="min-h-[480px]">
            <CardHeader
              title="Pratinjau Data Tabel"
              subtitle={
                currentPreview
                  ? `Menampilkan ${currentPreview.rows.length} dari total ${currentPreview.totalRows} baris • ${currentPreview.totalCols} kolom`
                  : 'Pratinjau tabel akan muncul setelah berkas dimuat'
              }
              icon={<Table className="size-4 text-primary" />}
              action={
                currentPreview && (
                  <Badge tone="info">{currentPreview.totalRows} Baris</Badge>
                )
              }
            />

            <div className="p-4 pt-0">
              {currentPreview && currentPreview.headers.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-muted w-10 text-center">#</th>
                        {currentPreview.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 whitespace-nowrap">
                            {h || `Kolom ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {currentPreview.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-surface-2/40 transition-colors">
                          <td className="px-3 py-1.5 text-muted text-center font-mono text-[10px]">
                            {rIdx + 1}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-foreground font-mono">
                              {String(cell !== null && cell !== undefined ? cell : '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
                  <FileSpreadsheet className="size-12 text-muted/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">Belum Ada Data yang Dimuat</p>
                  <p className="mt-1 text-xs text-muted max-w-sm">
                    Tarik berkas CSV atau Excel ke panel sebelah kiri, atau klik &quot;Coba Data Sampel&quot; untuk langsung menguji konversi.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
