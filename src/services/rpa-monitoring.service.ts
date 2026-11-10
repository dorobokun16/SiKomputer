/**
 * RPA Monitoring Service
 * Memproses berkas Excel Monitoring RPA (sheet "Robot List") dan menghasilkan format laporan status insiden.
 */
import * as XLSX from 'xlsx'

export interface RpaRobotItem {
  id: string
  robotNo: string
  jobName: string
  robotName: string
  priority: boolean
  status: string
  thresholdStatus: string
  thresholdWord: string
  timeAgo: string
  issue: string
  action: string
  rawRowIndex: number
}

export interface RpaMonitoringResult {
  fileName: string
  totalScanned: number
  totalColumns: number
  hiddenColumnsCount: number
  hiddenColumnNames: string[]
  priorityItems: RpaRobotItem[]
  nonPriorityItems: RpaRobotItem[]
  priorityText: string
  nonPriorityText: string
}

export type RpaFilterMode = 'all_issues' | 'thresh_only' | 'failed_only' | 'both_strict'

/**
 * Normalisasi format nomor robot menjadi ROB-XXX
 */
export function formatRobotNumber(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return 'ROB-UNKNOWN'
  const s = String(raw).trim()
  if (/^ROB[-_]/i.test(s)) return s.toUpperCase()

  // Ambil angka dari string (contoh: "065", "206 Dispatcher" -> "065", "206")
  const m = s.match(/(\d+[A-Za-z]*)/)
  if (m) {
    let num = m[1]
    if (/^\d+$/.test(num)) {
      if (num.length === 1) num = '00' + num
      else if (num.length === 2) num = '0' + num
    }
    return `ROB-${num}`
  }
  return `ROB-${s}`
}

/**
 * Ekstrak ringkasan pesan error/issue yang bersih (tanpa dump JSON atau stack trace panjang).
 * Mampu membaca seluruh kolom (termasuk hidden columns) sebagai fallback.
 */
export function extractCleanIssue(
  errRaw: unknown,
  errClean: unknown,
  lastFailedNotes: unknown,
  threshWord: string,
  threshStatus: string,
  row?: unknown[]
): string {
  const candidates = [errClean, errRaw, lastFailedNotes]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      let firstLine = c.trim().split(/\r?\n/)[0].trim()
      // Hapus prefix umum jika ada
      firstLine = firstLine.replace(/^Error:\s*/i, '')
      // Hapus karakter whitespace ganda
      firstLine = firstLine.replace(/\s+/g, ' ').trim()
      if (firstLine.length > 0) {
        return firstLine
      }
    }
  }

  // Fallback: telusuri seluruh kolom pada baris (termasuk kolom tersembunyi / hidden columns) jika ada pesan error
  if (row && Array.isArray(row)) {
    for (const cell of row) {
      if (typeof cell === 'string' && cell.trim()) {
        const lower = cell.toLowerCase()
        if (
          (lower.includes('error') || lower.includes('exception') || lower.includes('failed')) &&
          !lower.includes('last queue') &&
          cell.length < 500
        ) {
          let line = cell.trim().split(/\r?\n/)[0].trim()
          line = line.replace(/^Error:\s*/i, '').replace(/\s+/g, ' ').trim()
          if (line.length > 0 && line.length < 200) {
            return line
          }
        }
      }
    }
  }

  if (threshStatus.toUpperCase() === 'NOK') {
    return `Last Queue Success melebihi threshold (${threshWord || 'Threshold NOK'})`
  }

  return 'Kendala operasional robot (memerlukan pengecekan log runner)'
}

/**
 * Ekstrak waktu relatif (misal: "1 Hours ago", "43 minutes ago", "3 days ago").
 * Mampu memindai kolom tersembunyi (hidden columns) jika waktu berada di kolom tersembunyi.
 */
export function extractTimeAgo(
  row: unknown[],
  isThresholdOnly = false,
  dynamicIndices?: number[]
): string {
  // Indeks umum & dinamis:
  // Jika kendala murni threshold NOK (status job succeeded), utamakan Last Queue Success (indeks 19)
  // Jika job failed/berkendala, utamakan Job Completed Time (indeks 15) atau Start Time (indeks 12)
  const timeIndices = [
    ...(dynamicIndices || []),
    ...(isThresholdOnly ? [19, 15, 12, 23] : [15, 12, 19, 23]),
  ]

  for (const idx of timeIndices) {
    if (idx >= 0 && idx < row.length) {
      const val = row[idx]
      if (typeof val === 'string' && val.toLowerCase().includes('ago')) {
        return val.trim()
      }
    }
  }

  // Fallback: periksa seluruh kolom baris (termasuk hidden columns) jika terdapat pola "... ago"
  for (const cell of row) {
    if (typeof cell === 'string' && /\b(hours?|mins?|minutes?|days?|secs?|seconds?)\s*ago\b/i.test(cell)) {
      return cell.trim()
    }
  }

  return 'Recently'
}

/**
 * Buat format teks pesan monitoring sesuai template yang diminta
 */
export function generateReportText(
  title: string,
  items: RpaRobotItem[]
): string {
  let out = `${title}\n\n`
  if (items.length === 0) {
    out += `Semua robot berjalan normal (Tidak ada kendala / threshold terlampaui).\n\n`
  } else {
    items.forEach((item) => {
      out += `${item.robotNo}, ${item.timeAgo}\n`
      out += `Issue: ${item.issue}\n`
      out += `> Action: ${item.action || ''}\n\n`
    })
  }
  out += `\nTerima Kasih`
  return out
}

/**
 * Parsing berkas Excel monitoring
 */
export async function parseRpaMonitoringExcel(
  fileBuffer: ArrayBuffer,
  fileName = 'Monitoring.xlsx',
  filterMode: RpaFilterMode = 'all_issues'
): Promise<RpaMonitoringResult> {
  // Aktifkan cellStyles & sheetStubs agar seluruh hidden columns dan stub cell terbaca lengkap
  const wb = XLSX.read(fileBuffer, {
    type: 'array',
    cellStyles: true,
    sheetStubs: true,
    cellDates: true,
  })

  // Cari sheet 'Robot List' (case-insensitive) atau fallback ke sheet pertama
  const targetSheetName =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === 'robot list') ||
    wb.SheetNames[0]

  const sheet = wb.Sheets[targetSheetName]
  if (!sheet) {
    throw new Error('Sheet "Robot List" tidak ditemukan dalam berkas Excel.')
  }

  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  })

  if (rawRows.length < 2) {
    throw new Error('Sheet "Robot List" tidak memiliki data baris.')
  }

  // Baris header
  const headers = (rawRows[0] || []).map((h) => String(h || '').trim().toLowerCase())

  // Deteksi kolom-kolom tersembunyi (hidden columns) dari metadata sheet
  const colsMeta = (sheet['!cols'] || []) as Array<{ hidden?: boolean | number; [key: string]: unknown }>
  const hiddenColIndices: number[] = []
  colsMeta.forEach((col, idx) => {
    if (col && (col.hidden === true || col.hidden === 1)) {
      hiddenColIndices.push(idx)
    }
  })

  const hiddenColumnNames = hiddenColIndices
    .map((idx) => headers[idx] || `Kolom ${idx + 1}`)
    .filter((name) => Boolean(name && name.trim()))

  // Cari indeks kolom waktu secara dinamis (mencakup kolom tersembunyi)
  const dynamicTimeCols: number[] = []
  headers.forEach((h, idx) => {
    if (
      h.includes('completed time') ||
      h.includes('job completed') ||
      h.includes('start time') ||
      h.includes('last queue success')
    ) {
      dynamicTimeCols.push(idx)
    }
  })

  // Pemetaan kolom fleksibel: coba exact match dulu, lalu substring
  const findCol = (exactOrSub: string[], fallbackIdx: number): number => {
    let idx = headers.findIndex((h) => exactOrSub.some((k) => h === k.toLowerCase()))
    if (idx !== -1) return idx
    idx = headers.findIndex((h) => exactOrSub.some((k) => h.includes(k.toLowerCase())))
    return idx !== -1 ? idx : fallbackIdx
  }

  const colRobotNo = findCol(['robot number', 'number'], 1)
  const colJobName = findCol(['job name'], 0)
  const colRobotName = findCol(['robot name'], 7)
  const colPriority = findCol(['priority', 'is priority'], 2)
  const colStatus = findCol(['status', 'job status'], 8)
  const colThreshWord = findCol(['threshold (word)', 'threshold word'], 6)
  const colThreshStatus = findCol(['threshold status'], 21)
  const colErrRaw = findCol(['error remarks raw', 'error raw'], 16)
  const colErr = findCol(['error remarks', 'error clean'], 17)
  const colFailedNotes = findCol(['last failed notes'], 24)

  const priorityItems: RpaRobotItem[] = []
  const nonPriorityItems: RpaRobotItem[] = []
  const seenPriority = new Set<string>()
  const seenNonPriority = new Set<string>()

  let totalScanned = 0

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || row.length === 0) continue

    const robotNoRaw = row[colRobotNo] || row[colJobName]
    if (!robotNoRaw && robotNoRaw !== 0) continue

    totalScanned++

    const prioVal = row[colPriority]
    const isPriority = prioVal === true || String(prioVal).toLowerCase() === 'true'

    const status = String(row[colStatus] || '').trim()
    const threshStatus = String(row[colThreshStatus] || '').trim().toUpperCase()
    const threshWord = String(row[colThreshWord] || '').trim()

    const isNotSuccess = Boolean(status && status.toLowerCase() !== 'succeeded' && status !== '0')
    const isNOK = threshStatus === 'NOK'

    // Terapkan filter
    let match = false
    if (filterMode === 'all_issues') {
      match = isNotSuccess || isNOK
    } else if (filterMode === 'thresh_only') {
      match = isNOK
    } else if (filterMode === 'failed_only') {
      match = isNotSuccess
    } else if (filterMode === 'both_strict') {
      match = isNotSuccess && isNOK
    }

    if (!match) continue

    const robotNo = formatRobotNumber(robotNoRaw)
    const timeAgo = extractTimeAgo(row, isNOK && !isNotSuccess, dynamicTimeCols)
    const issue = extractCleanIssue(
      row[colErrRaw],
      row[colErr],
      row[colFailedNotes],
      threshWord,
      threshStatus,
      row
    )

    const item: RpaRobotItem = {
      id: `rpa-${i}-${robotNo}`,
      robotNo,
      jobName: String(row[colJobName] || robotNo),
      robotName: String(row[colRobotName] || ''),
      priority: isPriority,
      status: status || (isNOK ? 'Threshold NOK' : 'Unknown'),
      thresholdStatus: threshStatus || '-',
      thresholdWord: threshWord || '-',
      timeAgo,
      issue,
      action: '', // dikosongkan sesuai instruksi user
      rawRowIndex: i + 1,
    }

    if (isPriority) {
      if (!seenPriority.has(robotNo)) {
        seenPriority.add(robotNo)
        priorityItems.push(item)
      }
    } else {
      if (!seenNonPriority.has(robotNo)) {
        seenNonPriority.add(robotNo)
        nonPriorityItems.push(item)
      }
    }
  }

  const priorityText = generateReportText(
    'Update monitoring robot PA status : ',
    priorityItems
  )

  const nonPriorityText = generateReportText(
    'Update Monitoring robot Non Prior PA Status :',
    nonPriorityItems
  )

  return {
    fileName,
    totalScanned,
    totalColumns: headers.length,
    hiddenColumnsCount: hiddenColIndices.length,
    hiddenColumnNames,
    priorityItems,
    nonPriorityItems,
    priorityText,
    nonPriorityText,
  }
}
