/**
 * Spreadsheet Converter Service — 100% Client-Side via SheetJS (xlsx)
 * Konversi berkas dua arah CSV <-> XLSX tanpa kirim data ke server.
 */
import * as XLSX from 'xlsx'

export interface SpreadsheetPreview {
  headers: string[]
  rows: (string | number | boolean | null)[][]
  totalRows: number
  totalCols: number
  sheetNames?: string[]
}

/**
 * Membaca berkas CSV dan menghasilkan pratinjau serta Blob XLSX
 */
export async function convertCsvToXlsx(
  csvData: string | ArrayBuffer,
  options: {
    delimiter?: string
    sheetName?: string
  } = {}
): Promise<{ xlsxBlob: Blob; preview: SpreadsheetPreview }> {
  let text = ''
  if (typeof csvData === 'string') {
    text = csvData
  } else {
    text = new TextDecoder('utf-8').decode(new Uint8Array(csvData))
  }

  // Baca CSV dengan SheetJS
  const workbook = XLSX.read(text, {
    type: 'string',
    raw: false,
    FS: options.delimiter || ',',
  })

  const sheetName = options.sheetName || 'Sheet1'
  const firstSheetName = workbook.SheetNames[0] || sheetName
  const worksheet = workbook.Sheets[firstSheetName]

  // Konversi sheet ke array of arrays untuk preview
  const data: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  })

  const headers = (data[0] || []).map((h) => String(h || ''))
  const sampleRows = data.slice(1, 101) // ambil hingga 100 baris untuk preview

  // Buat workbook baru untuk output XLSX
  const newWb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(newWb, worksheet, sheetName)

  // Generate buffer XLSX
  const xlsxBuffer = XLSX.write(newWb, {
    bookType: 'xlsx',
    type: 'array',
  })

  const xlsxBlob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return {
    xlsxBlob,
    preview: {
      headers,
      rows: sampleRows,
      totalRows: Math.max(0, data.length - 1),
      totalCols: headers.length,
    },
  }
}

/**
 * Membaca berkas XLSX dan menghasilkan teks CSV, Blob CSV, serta daftar sheet
 */
export async function convertXlsxToCsv(
  fileBuffer: ArrayBuffer,
  options: {
    sheetIndex?: number
    delimiter?: string
  } = {}
): Promise<{
  csvText: string
  csvBlob: Blob
  sheetNames: string[]
  selectedSheet: string
  preview: SpreadsheetPreview
}> {
  const workbook = XLSX.read(fileBuffer, { type: 'array' })
  const sheetNames = workbook.SheetNames

  if (sheetNames.length === 0) {
    throw new Error('Berkas Excel tidak memiliki sheet yang dapat dibaca.')
  }

  const selectedSheet = sheetNames[options.sheetIndex || 0] || sheetNames[0]
  const worksheet = workbook.Sheets[selectedSheet]

  const delimiter = options.delimiter || ','
  const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: delimiter })

  // Pratinjau data tabel
  const data: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  })

  const headers = (data[0] || []).map((h) => String(h || ''))
  const sampleRows = data.slice(1, 101)

  const csvBlob = new Blob([new TextEncoder().encode(csvText)], {
    type: 'text/csv;charset=utf-8;',
  })

  return {
    csvText,
    csvBlob,
    sheetNames,
    selectedSheet,
    preview: {
      headers,
      rows: sampleRows,
      totalRows: Math.max(0, data.length - 1),
      totalCols: headers.length,
      sheetNames,
    },
  }
}

