/**
 * SiKomputer - Auto Task Scheduler Service
 * 100% Client-Side Recurring Task Automation (Misal: Timesheet Karyawan RPA)
 */

import { db, type TaskEntity, type TaskScheduleEntity } from '@/db/dexie'
import { playAudioChime, showDesktopNotification } from '@/services/notification.service'

/**
 * Format teks tanggal lokal dan interpolasi variabel:
 * {{today}} -> "Senin, 09 Nov 2026"
 * {{date}}  -> "09/11/2026"
 * {{month}} -> "November 2026"
 * {{time}}  -> "16:30"
 */
export function interpolateTitle(template: string, date: Date = new Date()): string {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ]

  const pad = (n: number) => n.toString().padStart(2, '0')

  const dayName = dayNames[date.getDay()]
  const dayNum = pad(date.getDate())
  const monthName = monthNames[date.getMonth()]
  const monthShort = monthNamesShort[date.getMonth()]
  const year = date.getFullYear()
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  const formattedToday = `${dayName}, ${dayNum} ${monthShort} ${year}`
  const formattedDate = `${dayNum}/${pad(date.getMonth() + 1)}/${year}`
  const formattedMonth = `${monthName} ${year}`
  const formattedTime = `${hours}:${minutes}`

  return template
    .replace(/\{\{today\}\}/gi, formattedToday)
    .replace(/\{\{date\}\}/gi, formattedDate)
    .replace(/\{\{month\}\}/gi, formattedMonth)
    .replace(/\{\{time\}\}/gi, formattedTime)
}

/**
 * Buat TaskEntity nyata dari TaskScheduleEntity ke dalam db.tasks
 */
export async function createTaskFromSchedule(
  schedule: TaskScheduleEntity,
  _options?: { bypassDateCheck?: boolean }
): Promise<TaskEntity> {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Interpolasi nama judul dengan tanggal riil hari ini
  const finalTitle = interpolateTitle(schedule.title, now)

  // Susun deskripsi & rincian checklist
  let finalDescription = schedule.description || ''
  if (schedule.subtasks && schedule.subtasks.length > 0) {
    const checklistStr = schedule.subtasks.map((st) => `- [ ] ${st}`).join('\n')
    finalDescription = finalDescription
      ? `${finalDescription}\n\n**Checklist Pengerjaan:**\n${checklistStr}`
      : `**Checklist Pengerjaan:**\n${checklistStr}`
  }

  // Set tenggat waktu (dueAt): hari ini pada jam schedule atau jam 18:00
  const [h, m] = schedule.time.split(':').map((v) => parseInt(v, 10) || 0)
  const dueDate = new Date()
  dueDate.setHours(h, m, 0, 0)

  const newTask: TaskEntity = {
    id: crypto.randomUUID(),
    projectId: schedule.projectId || 'p1',
    title: finalTitle,
    description: finalDescription,
    status: schedule.targetStatus || 'todo',
    priority: schedule.priority || 'tinggi',
    dueAt: dueDate.toISOString(),
    position: String(Date.now()),
    labels: [...(schedule.labels || [])],
    subDone: 0,
    subTotal: schedule.subtasks?.length || 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  // Simpan ke IndexedDB
  await db.tasks.add(newTask)

  // Catat tanggal eksekusi terakhir
  await db.taskSchedules.update(schedule.id, {
    lastTriggeredDate: todayStr,
  })

  // Tampilkan notifikasi desktop & alarm nada dering
  try {
    showDesktopNotification(
      '🤖 Tugas Otomatis Dibuat!',
      `Tugas "${finalTitle}" telah dijadwalkan otomatis di kolom ${schedule.targetStatus.toUpperCase()} papan Kanban.`
    )
    playAudioChime()
  } catch {
    //
  }

  // Kirim event ke seluruh komponen aktif peramban
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sikomputer-task-auto-created', {
        detail: { task: newTask, schedule },
      })
    )
  }

  return newTask
}

/**
 * Pemeriksa berkala: berjalan di background setiap 30-60 detik
 */
export async function checkAndRunTaskSchedules(): Promise<TaskEntity[]> {
  try {
    const activeSchedules = await db.taskSchedules.where('active').equals(1).toArray()
    if (activeSchedules.length === 0) return []

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const currentH = now.getHours().toString().padStart(2, '0')
    const currentM = now.getMinutes().toString().padStart(2, '0')
    const currentTimeStr = `${currentH}:${currentM}`
    const dayOfWeek = now.getDay() // 0=Minggu, 1=Senin, ..., 5=Jumat, 6=Sabtu

    const createdTasks: TaskEntity[] = []

    for (const schedule of activeSchedules) {
      // 1. Cek idempotency: Jangan buat ganda di hari yang sama
      if (schedule.lastTriggeredDate === todayStr) {
        continue
      }

      // 2. Cek frekuensi hari
      let isDayMatch = false
      if (schedule.frequency === 'daily') {
        isDayMatch = true
      } else if (schedule.frequency === 'weekdays') {
        // Senin s/d Jumat (1 sampai 5)
        isDayMatch = dayOfWeek >= 1 && dayOfWeek <= 5
      } else if (schedule.frequency === 'weekly') {
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          isDayMatch = schedule.daysOfWeek.includes(dayOfWeek)
        } else {
          // Default Jumat (5)
          isDayMatch = dayOfWeek === 5
        }
      } else if (schedule.frequency === 'monthly') {
        // Tanggal 1 setiap bulan atau akhir bulan
        isDayMatch = now.getDate() === 1
      }

      if (!isDayMatch) {
        continue
      }

      // 3. Cek jam eksekusi
      if (currentTimeStr >= schedule.time) {
        const t = await createTaskFromSchedule(schedule)
        createdTasks.push(t)
      }
    }

    return createdTasks
  } catch (err) {
    console.warn('Gagal memeriksa jadwal tugas otomatis:', err)
    return []
  }
}

/**
 * Jalankan jadwal tugas sekarang secara manual (Trigger Instant)
 */
export async function triggerTaskScheduleNow(scheduleId: string): Promise<TaskEntity | null> {
  const schedule = await db.taskSchedules.get(scheduleId)
  if (!schedule) return null
  return await createTaskFromSchedule(schedule, { bypassDateCheck: true })
}

/**
 * Seed Template Otomasi Tugas Khusus RPA Developer & Karyawan
 */
export async function seedRpaDefaultSchedules(): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('sk-has-seeded')) return
  const count = await db.taskSchedules.count()
  if (count > 0) return

  const defaultTemplates: Omit<TaskScheduleEntity, 'id'>[] = [
    {
      title: 'Isi Timesheet Harian RPA Developer - {{today}}',
      description: 'Pengingat wajib harian untuk logging aktivitas pengembangan bot automation, bug fix, dan jam kerja proyek.',
      projectId: 'p1',
      priority: 'tinggi',
      targetStatus: 'todo',
      frequency: 'weekdays', // Senin - Jumat
      time: '16:30',
      daysOfWeek: [1, 2, 3, 4, 5],
      labels: ['timesheet', 'rpa', 'harian'],
      subtasks: [
        'Buka portal internal / SAP / Jira Timesheet',
        'Input log jam kerja robot maintenance & script development',
        'Verifikasi total jam harian (8 jam kerja)',
        'Klik Submit dan pastikan status verified',
      ],
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      title: 'Daily Health Check Bot RPA & Exception Log - {{today}}',
      description: 'Pemeriksaan rutin pagi terhadap orchestrator bot, queue item, dan status mesin unattended VM.',
      projectId: 'p1',
      priority: 'sedang',
      targetStatus: 'todo',
      frequency: 'weekdays',
      time: '08:30',
      daysOfWeek: [1, 2, 3, 4, 5],
      labels: ['monitoring', 'bot-rpa'],
      subtasks: [
        'Cek dashboard Orchestrator / Control Room',
        'Analisis antrean queue transaksi & failed status',
        'Periksa kapasitas CPU/RAM mesin VM Unattended',
      ],
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      title: 'Rekap & Approval Timesheet Mingguan - {{today}}',
      description: 'Kompilasi mingguan seluruh timesheet proyek untuk diajukan ke Project Manager / Lead Engineer.',
      projectId: 'p1',
      priority: 'tinggi',
      targetStatus: 'todo',
      frequency: 'weekly',
      time: '16:00',
      daysOfWeek: [5], // Setiap hari Jumat
      labels: ['timesheet', 'weekly-approval'],
      subtasks: [
        'Pastikan 40 jam kerja per minggu sudah lengkap',
        'Kirim permohonan approval ke Lead RPA Engineer',
        'Simpan rekap backup timesheet',
      ],
      active: true,
      createdAt: new Date().toISOString(),
    },
  ]

  for (const t of defaultTemplates) {
    await db.taskSchedules.add({
      id: crypto.randomUUID(),
      ...t,
    })
  }
}
