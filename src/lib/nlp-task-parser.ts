/**
 * SiKomputer - NLP Quick-Add Task Parser
 * Mengekstrak judul, tanggal/waktu relatif, tingkat prioritas, dan tag dari input teks bebas.
 */

export interface ParsedTaskInput {
  title: string
  priority: 'tinggi' | 'sedang' | 'rendah'
  dueAt?: string
  dueLabel?: string
  labels: string[]
}

const DAYS_MAP: Record<string, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
}

export function parseQuickTask(input: string): ParsedTaskInput {
  let text = input.trim()
  let priority: 'tinggi' | 'sedang' | 'rendah' = 'sedang'
  const labels: string[] = []
  let dueAt: Date | undefined = undefined
  let dueLabel: string | undefined = undefined

  // 1. Ekstraksi Prioritas: !tinggi, !urgent, !high, !sedang, !rendah, !low
  if (/!(tinggi|urgent|high)/i.test(text)) {
    priority = 'tinggi'
    text = text.replace(/!(tinggi|urgent|high)/gi, '')
  } else if (/!(rendah|low)/i.test(text)) {
    priority = 'rendah'
    text = text.replace(/!(rendah|low)/gi, '')
  } else if (/!(sedang|medium)/i.test(text)) {
    priority = 'sedang'
    text = text.replace(/!(sedang|medium)/gi, '')
  }

  // 2. Ekstraksi Tags / Labels: #dev, #bug, #ui
  const tagMatches = text.match(/#([A-Za-z0-9_-]+)/g)
  if (tagMatches) {
    tagMatches.forEach((tag) => {
      labels.push(tag.slice(1))
    })
    text = text.replace(/#([A-Za-z0-9_-]+)/g, '')
  }

  // 3. Ekstraksi Jam: "jam 14:00", "pukul 09:30", "14:00"
  let targetHour = 17 // default jam 17:00 jika hanya tanggal yang disebut
  let targetMinute = 0
  const timeMatch = text.match(/(?:jam|pukul)?\s*(\d{1,2})[:.](\d{2})/i) || text.match(/(?:jam|pukul)\s*(\d{1,2})/i)

  if (timeMatch) {
    targetHour = parseInt(timeMatch[1], 10)
    targetMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
    text = text.replace(timeMatch[0], '')
  }

  // 4. Ekstraksi Hari / Tanggal Relatif
  const lower = text.toLowerCase()
  const now = new Date()

  if (lower.includes('hari ini') || lower.includes('today')) {
    dueAt = new Date(now)
    dueLabel = `Hari ini ${formatTime(targetHour, targetMinute)}`
    text = text.replace(/hari ini|today/gi, '')
  } else if (lower.includes('besok') || lower.includes('tomorrow')) {
    dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    dueLabel = `Besok ${formatTime(targetHour, targetMinute)}`
    text = text.replace(/besok|tomorrow/gi, '')
  } else if (lower.includes('lusa')) {
    dueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    dueLabel = `Lusa ${formatTime(targetHour, targetMinute)}`
    text = text.replace(/lusa/gi, '')
  } else {
    // Cek nama hari (senin, selasa, dst.)
    for (const [dayName, dayIndex] of Object.entries(DAYS_MAP)) {
      const reg = new RegExp(`\\b${dayName}\\b`, 'i')
      if (reg.test(lower)) {
        const currentDay = now.getDay()
        let diff = dayIndex - currentDay
        if (diff <= 0) diff += 7 // ambil hari tersebut di minggu depan/terdekat
        dueAt = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000)
        dueLabel = `${dayName[0].toUpperCase() + dayName.slice(1)} ${formatTime(targetHour, targetMinute)}`
        text = text.replace(reg, '')
        break
      }
    }
  }

  if (dueAt) {
    dueAt.setHours(targetHour, targetMinute, 0, 0)
  }

  // Bersihkan spasi berlebih pada judul
  const cleanTitle = text.replace(/\s+/g, ' ').trim() || 'Tugas Baru'

  return {
    title: cleanTitle,
    priority,
    dueAt: dueAt ? dueAt.toISOString() : undefined,
    dueLabel,
    labels,
  }
}

function formatTime(h: number, m: number): string {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

