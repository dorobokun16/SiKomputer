/**
 * SiKomputer - Web Notification, Audio Chime & In-App Notification Center
 * 100% Client-Side HTML5 Web Notification, Service Worker Notification, & Web Audio API
 */

import { db, type InAppNotification, type ReminderEntity } from '@/db/dexie'

export const NOTIFICATION_EVENT = 'sikomputer:notification'

const DEFAULT_NOTIFICATIONS: Omit<InAppNotification, 'id'>[] = [
  {
    title: 'Selamat Datang di SiKomputer',
    body: 'Workstation lokal & RPA Monitoring siap digunakan 100% offline tanpa internet.',
    tone: 'info',
    unread: true,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Penyimpanan Lokal Aktif',
    body: 'Seluruh data tugas, notes, dan pengaturan tersimpan aman di IndexedDB perangkat Anda.',
    tone: 'success',
    unread: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    title: 'Fitur RPA Monitoring Tersedia',
    body: 'Pindai berkas Excel RPA monitoring dan dapatkan format chat siap salin.',
    tone: 'info',
    unread: false,
    link: '/dev/rpa-monitoring',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
]

/**
 * Minta izin notifikasi desktop/mobile peramban
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/**
 * Periksa apakah izin notifikasi telah diberikan
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Tampilkan notifikasi desktop / sistem operasi (Mendukung Service Worker di mobile PWA)
 */
export async function showDesktopNotification(title: string, body?: string): Promise<boolean> {
  if (!hasNotificationPermission()) return false

  const options: NotificationOptions = {
    body: body || 'Pemberitahuan dari SiKomputer Workstation',
    icon: `${import.meta.env.BASE_URL}pwa-192.png`,
    badge: `${import.meta.env.BASE_URL}logo.png`,
    tag: `sikomputer-${Date.now()}`,
  }

  // 1. Prioritaskan Service Worker jika aktif (Wajib untuk Chrome di Android / PWA Standalone)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options)
        return true
      }
    }
  } catch {
    // Fallback ke Notification API standar
  }

  // 2. Fallback untuk Desktop browser standar
  try {
    if ('Notification' in window) {
      new Notification(title, options)
      return true
    }
  } catch {
    return false
  }

  return false
}

/**
 * Memainkan nada dering pengingat menggunakan Web Audio API murni
 * (Sintesis audio dual-tone tanpa ketergantungan berkas MP3 eksternal)
 */
export function playAudioChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.12)
    gain2.gain.setValueAtTime(0.2, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.6)
  } catch (err) {
    console.warn('Audio chime tidak dapat dimainkan:', err)
  }
}

/**
 * Kirim notifikasi lengkap: Simpan ke In-App Center, Mainkan Suara, & Tampilkan Desktop Notification
 */
export async function pushNotification(payload: {
  title: string
  body: string
  tone?: 'info' | 'warning' | 'success' | 'danger'
  link?: string
  playChime?: boolean
  showDesktop?: boolean
}): Promise<InAppNotification> {
  const item: InAppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: payload.title,
    body: payload.body,
    tone: payload.tone || 'info',
    unread: true,
    link: payload.link,
    createdAt: new Date().toISOString(),
  }

  // 1. Simpan ke IndexedDB
  try {
    await db.notifications.add(item)
  } catch {
    // Ignore error jika DB belum ready
  }

  // 2. Mainkan audio jika diizinkan
  if (payload.playChime !== false) {
    playAudioChime()
  }

  // 3. Tampilkan desktop notification jika diizinkan
  if (payload.showDesktop !== false) {
    void showDesktopNotification(payload.title, payload.body)
  }

  // 4. Siarkan event agar komponen UI (seperti Header) langsung reaktif
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: item }))
  }

  return item
}

/**
 * Ambil daftar notifikasi in-app tersimpan (auto-seed default jika kosong)
 */
export async function getNotifications(): Promise<InAppNotification[]> {
  try {
    let items = await db.notifications.toArray()
    const isSuppressed =
      typeof window !== 'undefined' &&
      (Boolean(localStorage.getItem('sk-has-seeded')) || Boolean(localStorage.getItem('sk-notif-cleared')))
    if (items.length === 0 && !isSuppressed) {
      for (const d of DEFAULT_NOTIFICATIONS) {
        await db.notifications.add({
          id: `notif-init-${Math.random().toString(36).slice(2, 7)}`,
          ...d,
        })
      }
      items = await db.notifications.toArray()
    }
    // Urutkan dari yang terbaru
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

/**
 * Tandai notifikasi spesifik sebagai telah dibaca
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await db.notifications.update(id, { unread: false })
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT))
  } catch {
    //
  }
}

/**
 * Tandai seluruh notifikasi sebagai telah dibaca
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const allItems = await db.notifications.toArray()
    const unreadItems = allItems.filter((n) => n.unread)
    for (const item of unreadItems) {
      await db.notifications.update(item.id, { unread: false })
    }
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT))
  } catch {
    //
  }
}

/**
 * Hapus satu notifikasi
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    await db.notifications.delete(id)
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT))
  } catch {
    //
  }
}

/**
 * Hapus seluruh riwayat notifikasi
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await db.notifications.clear()
    if (typeof window !== 'undefined') {
      localStorage.setItem('sk-notif-cleared', 'true')
    }
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT))
  } catch {
    //
  }
}

/**
 * Periksa reminder aktif yang sudah jatuh tempo di IndexedDB
 */
export async function checkDueReminders(): Promise<ReminderEntity[]> {
  try {
    const nowIso = new Date().toISOString()
    const all = await db.reminders.where('active').equals(1).toArray()
    const due = all.filter((r) => r.remindAt <= nowIso)

    for (const r of due) {
      // Kirim notifikasi terpadu (In-App + Suara + Desktop)
      await pushNotification({
        title: `Pengingat: ${r.title}`,
        body: `Jadwal: ${new Date(r.remindAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • Kanal: ${r.channels.join(', ')}`,
        tone: 'warning',
        link: '/reminders',
        playChime: true,
      })

      // Jika pengulangan 'Sekali', nonaktifkan
      if (r.repeat === 'Sekali') {
        await db.reminders.update(r.id, { active: false })
      } else {
        // Hitung waktu berikutnya
        const nextTime = calculateNextRepeat(new Date(r.remindAt), r.repeat)
        await db.reminders.update(r.id, { remindAt: nextTime.toISOString() })
      }
    }

    return due
  } catch {
    return []
  }
}

/**
 * Tunda pengingat (Snooze)
 */
export async function snoozeReminder(
  id: string,
  durationMinutes: number,
): Promise<void> {
  const nextDate = new Date(Date.now() + durationMinutes * 60 * 1000)
  await db.reminders.update(id, {
    remindAt: nextDate.toISOString(),
    active: true,
  })
}

function calculateNextRepeat(date: Date, repeat: string): Date {
  const next = new Date(date)
  if (repeat === 'Harian') {
    next.setDate(next.getDate() + 1)
  } else if (repeat === 'Mingguan') {
    next.setDate(next.getDate() + 7)
  } else if (repeat === 'Bulanan') {
    next.setMonth(next.getMonth() + 1)
  }
  return next
}
