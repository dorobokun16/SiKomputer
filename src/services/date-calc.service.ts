/**
 * Date Calculator Service — 100% Native TypeScript/JavaScript
 * Perhitungan tanggal lokal presisi: selisih, tambah/kurang, hari kerja, deadline proyek, dan usia.
 */

export interface DateDiffResult {
  isNegative: boolean
  formattedSummary: string
  years: number
  months: number
  days: number
  totalDays: number
  weeks: number
  remainingDaysAfterWeeks: number
  workdays: number
  weekends: number
  totalHours: number
  totalMinutes: number
  totalSeconds: number
  percentageOfYear: number
}

export interface AgeMilestonesResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalHours: number
  birthDayName: string
  nextBirthday: Date
  daysToNextBirthday: number
  nextBirthdayDayName: string
  zodiac: { sign: string; icon: string; range: string }
  generation: string
  approximateHeartbeats: number // estimasi ~70 bpm
  approximateSleepDays: number // estimasi ~8 jam/hari (1/3 hidup)
}

export interface ProjectDeadlineResult {
  targetDate: Date
  targetDateFormatted: string
  dayName: string
  totalCalendarDays: number
  workdaysCount: number
  weekendDaysCount: number
  holidaysSkipped: number
  skippedHolidayNames: string[]
}

// Daftar Libur Nasional Umum Indonesia
export interface Holiday {
  dateStr: string // "YYYY-MM-DD" atau "MM-DD" untuk libur tahunan tetap
  name: string
}

export const INDONESIAN_COMMON_HOLIDAYS: Holiday[] = [
  { dateStr: '01-01', name: 'Tahun Baru Masehi' },
  { dateStr: '05-01', name: 'Hari Buruh Internasional' },
  { dateStr: '06-01', name: 'Hari Lahir Pancasila' },
  { dateStr: '08-17', name: 'Hari Kemerdekaan RI' },
  { dateStr: '12-25', name: 'Hari Raya Natal' },
]

/**
 * Format tanggal ke bahasa Indonesia
 */
export function formatIndoDate(d: Date, withTime = false): string {
  if (isNaN(d.getTime())) return '-'
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  if (withTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  return new Intl.DateTimeFormat('id-ID', options).format(d)
}

/**
 * Format ringkas tanggal YYYY-MM-DD untuk input date
 */
export function toInputDateFormat(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse string "YYYY-MM-DD" menjadi Date lokal murni (jam 00:00:00)
 */
export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/**
 * Hitung selisih antara dua tanggal
 */
export function calculateDateDiff(
  d1: Date,
  d2: Date,
  options: { inclusive?: boolean } = {}
): DateDiffResult {
  const inclusive = options.inclusive ?? false
  let start = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate())
  let end = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate())

  const isNegative = start.getTime() > end.getTime()
  if (isNegative) {
    const temp = start
    start = end
    end = temp
  }

  // Jika inklusif, tambahkan 1 hari ke end untuk perhitungan total hari
  const adjustedEnd = new Date(end)
  if (inclusive) {
    adjustedEnd.setDate(adjustedEnd.getDate() + 1)
  }

  const diffMs = adjustedEnd.getTime() - start.getTime()
  const totalDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))

  // Hitung tahun, bulan, hari secara kalender
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate() + (inclusive ? 1 : 0)

  if (days < 0) {
    // Pinjam hari dari bulan sebelumnya
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate()
    days += prevMonthLastDay
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  // Hitung hari kerja (Senin-Jumat) dan akhir pekan (Sabtu-Minggu)
  let workdays = 0
  let weekends = 0
  const cur = new Date(start)
  const loopEnd = new Date(adjustedEnd)

  while (cur < loopEnd) {
    const dayOfWeek = cur.getDay() // 0 = Minggu, 6 = Sabtu
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++
    } else {
      workdays++
    }
    cur.setDate(cur.getDate() + 1)
  }

  const weeks = Math.floor(totalDays / 7)
  const remainingDaysAfterWeeks = totalDays % 7

  const totalHours = totalDays * 24
  const totalMinutes = totalHours * 60
  const totalSeconds = totalMinutes * 60
  const percentageOfYear = Number(((totalDays / 365.25) * 100).toFixed(1))

  // Rangkuman teks
  const parts: string[] = []
  if (years > 0) parts.push(`${years} tahun`)
  if (months > 0) parts.push(`${months} bulan`)
  if (days > 0 || parts.length === 0) parts.push(`${days} hari`)
  const formattedSummary = parts.join(', ')

  return {
    isNegative,
    formattedSummary,
    years,
    months,
    days,
    totalDays,
    weeks,
    remainingDaysAfterWeeks,
    workdays,
    weekends,
    totalHours,
    totalMinutes,
    totalSeconds,
    percentageOfYear,
  }
}

/**
 * Tambah / Kurang tanggal
 */
export function addSubtractDate(
  baseDate: Date,
  delta: {
    years?: number
    months?: number
    weeks?: number
    days?: number
    direction: 'add' | 'subtract'
  },
  options: {
    workdaysOnly?: boolean
    workdaysPerWeek?: 5 | 6
  } = {}
): Date {
  const dir = delta.direction === 'add' ? 1 : -1
  const years = (delta.years || 0) * dir
  const months = (delta.months || 0) * dir
  const weeks = (delta.weeks || 0) * dir
  const days = (delta.days || 0) * dir

  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())

  if (options.workdaysOnly) {
    // Mode hari kerja: hanya tambahkan/kurangkan hari kerja
    const totalWorkdaysToMove = (weeks * (options.workdaysPerWeek || 5)) + days
    let remaining = Math.abs(totalWorkdaysToMove)
    const step = totalWorkdaysToMove >= 0 ? 1 : -1

    while (remaining > 0) {
      result.setDate(result.getDate() + step)
      const day = result.getDay()
      const isWorkday = options.workdaysPerWeek === 6 ? day !== 0 : day !== 0 && day !== 6
      if (isWorkday) {
        remaining--
      }
    }

    // Jika ada tahun / bulan, terapkan juga
    if (years !== 0) result.setFullYear(result.getFullYear() + years)
    if (months !== 0) result.setMonth(result.getMonth() + months)
  } else {
    // Mode kalender standar
    if (years !== 0) result.setFullYear(result.getFullYear() + years)
    if (months !== 0) result.setMonth(result.getMonth() + months)
    const totalDays = (weeks * 7) + days
    if (totalDays !== 0) result.setDate(result.getDate() + totalDays)
  }

  return result
}

/**
 * Hitung deadline proyek berdasarkan jumlah hari kerja
 */
export function calculateProjectDeadline(
  startDate: Date,
  workdaysNeeded: number,
  options: {
    workdaysPerWeek?: 5 | 6
    holidays?: string[] // array of "YYYY-MM-DD"
  } = {}
): ProjectDeadlineResult {
  const workdaysPerWeek = options.workdaysPerWeek || 5
  const holidaySet = new Set(options.holidays || [])

  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  let workdaysCount = 0
  let weekendDaysCount = 0
  let holidaysSkipped = 0
  const skippedHolidayNames: string[] = []

  // Jika workdaysNeeded <= 0, langsung return hari mulai
  if (workdaysNeeded <= 0) {
    return {
      targetDate: cur,
      targetDateFormatted: formatIndoDate(cur),
      dayName: getDayNameIndo(cur),
      totalCalendarDays: 0,
      workdaysCount: 0,
      weekendDaysCount: 0,
      holidaysSkipped: 0,
      skippedHolidayNames: [],
    }
  }

  let totalCalendarDays = 0

  while (workdaysCount < workdaysNeeded) {
    cur.setDate(cur.getDate() + 1)
    totalCalendarDays++

    const dayOfWeek = cur.getDay()
    const isWeekend = workdaysPerWeek === 6 ? dayOfWeek === 0 : dayOfWeek === 0 || dayOfWeek === 6

    if (isWeekend) {
      weekendDaysCount++
      continue
    }

    const isoDate = toInputDateFormat(cur)
    const monthDay = isoDate.substring(5) // "MM-DD"

    // Cek apakah tanggal ini libur kustom atau libur nasional tetap
    const matchedCommonHoliday = INDONESIAN_COMMON_HOLIDAYS.find((h) => h.dateStr === monthDay)
    const isHoliday = holidaySet.has(isoDate) || !!matchedCommonHoliday

    if (isHoliday) {
      holidaysSkipped++
      const name = matchedCommonHoliday ? matchedCommonHoliday.name : `Libur (${isoDate})`
      if (!skippedHolidayNames.includes(name)) skippedHolidayNames.push(name)
      continue
    }

    workdaysCount++
  }

  return {
    targetDate: cur,
    targetDateFormatted: formatIndoDate(cur),
    dayName: getDayNameIndo(cur),
    totalCalendarDays,
    workdaysCount,
    weekendDaysCount,
    holidaysSkipped,
    skippedHolidayNames,
  }
}

/**
 * Dapatkan nama hari bahasa Indonesia
 */
export function getDayNameIndo(d: Date): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[d.getDay()]
}

/**
 * Hitung zodiak berdasarkan tanggal dan bulan
 */
export function getZodiac(day: number, month: number): { sign: string; icon: string; range: string } {
  // month: 1 - 12
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: 'Aries', icon: '♈', range: '21 Mar - 19 Apr' }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: 'Taurus', icon: '♉', range: '20 Apr - 20 Mei' }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: 'Gemini', icon: '♊', range: '21 Mei - 20 Jun' }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: 'Cancer', icon: '♋', range: '21 Jun - 22 Jul' }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: 'Leo', icon: '♌', range: '23 Jul - 22 Agu' }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: 'Virgo', icon: '♍', range: '23 Agu - 22 Sep' }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: 'Libra', icon: '♎', range: '23 Sep - 22 Okt' }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: 'Scorpio', icon: '♏', range: '23 Okt - 21 Nov' }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: 'Sagitarius', icon: '♐', range: '22 Nov - 21 Des' }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: 'Capricorn', icon: '♑', range: '22 Des - 19 Jan' }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: 'Aquarius', icon: '♒', range: '20 Jan - 18 Feb' }
  return { sign: 'Pisces', icon: '♓', range: '19 Feb - 20 Mar' }
}

/**
 * Tentukan nama generasi
 */
export function getGeneration(birthYear: number): string {
  if (birthYear >= 2013) return 'Gen Alpha (2013 - Sekarang)'
  if (birthYear >= 1997) return 'Gen Z (1997 - 2012)'
  if (birthYear >= 1981) return 'Milenial / Gen Y (1981 - 1996)'
  if (birthYear >= 1965) return 'Gen X (1965 - 1980)'
  if (birthYear >= 1946) return 'Baby Boomers (1946 - 1964)'
  return 'Silent Generation (< 1946)'
}

/**
 * Kalkulasi usia dan milestone
 */
export function calculateAgeMilestones(birthDate: Date, today = new Date()): AgeMilestonesResult {
  const b = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate())
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let years = t.getFullYear() - b.getFullYear()
  let months = t.getMonth() - b.getMonth()
  let days = t.getDate() - b.getDate()

  if (days < 0) {
    const prevMonthDays = new Date(t.getFullYear(), t.getMonth(), 0).getDate()
    days += prevMonthDays
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  const diffMs = Math.max(0, t.getTime() - b.getTime())
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const totalHours = totalDays * 24

  // Ulang tahun berikutnya
  let nextBdayYear = t.getFullYear()
  const candidate = new Date(nextBdayYear, b.getMonth(), b.getDate())
  if (candidate < t) {
    nextBdayYear += 1
  }
  const nextBirthday = new Date(nextBdayYear, b.getMonth(), b.getDate())
  const daysToNextBirthday = Math.round((nextBirthday.getTime() - t.getTime()) / (1000 * 60 * 60 * 24))

  const zodiac = getZodiac(b.getDate(), b.getMonth() + 1)
  const generation = getGeneration(b.getFullYear())

  // Estimasi statistik hidup
  const approximateHeartbeats = totalDays * 24 * 60 * 72 // ~72 denyut per menit
  const approximateSleepDays = Math.round(totalDays / 3) // ~8 jam per hari

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    totalDays,
    totalHours,
    birthDayName: getDayNameIndo(b),
    nextBirthday,
    daysToNextBirthday,
    nextBirthdayDayName: getDayNameIndo(nextBirthday),
    zodiac,
    generation,
    approximateHeartbeats,
    approximateSleepDays,
  }
}

