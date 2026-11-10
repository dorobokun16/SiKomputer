/**
 * SiKomputer - iCalendar (.ics) Generator
 * Menghasilkan berkas kalender standar RFC 5545 tanpa ketergantungan server luar.
 */

export interface CalendarEvent {
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  location?: string
  url?: string
}

export function generateIcs(event: CalendarEvent): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const toUtcStr = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

  const now = new Date()
  const stamp = toUtcStr(now)
  const start = toUtcStr(event.startDate)
  const end = toUtcStr(event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000))
  const uid = `sk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@sikomputer.local`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SiKomputer//Workstation Local//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : 'DESCRIPTION:Dibuat oleh SiKomputer Workstation',
    event.location ? `LOCATION:${escapeIcs(event.location)}` : 'LOCATION:SiKomputer Local Workstation',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pengingat Tugas SiKomputer',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}

export function downloadIcs(event: CalendarEvent, fileName?: string): void {
  const content = generateIcs(event)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ? (fileName.endsWith('.ics') ? fileName : `${fileName}.ics`) : `reminder-${Date.now()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

