import Dexie, { type EntityTable } from 'dexie'

export interface UserEntity {
  id: string
  email: string
  fullName: string
  role: string
  bio?: string
  passwordHash: string
  passwordSalt: string
  twoFactorEnabled?: boolean
  twoFactorSecret?: string
  recoveryCodes?: string[]
  timezone: string
  locale: string
  createdAt: string
  updatedAt: string
}

export interface NoteEntity {
  id: string
  title: string
  category: 'password' | 'endpoint' | 'note' | 'env'
  content?: string
  username?: string
  password?: string
  url?: string
  tags: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface SessionEntity {
  id: string
  userId: string
  deviceName: string
  location: string
  ip: string
  active: boolean
  lastSeenAt: string
  createdAt: string
}

export interface SecurityConfigEntity {
  id: string
  userId: string
  autoLockMinutes: number // 0 = off, 5, 15, 30, 60
  failedAttempts: number
  lockedUntil?: string
}

export interface TaskEntity {
  id: string
  projectId: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'doing' | 'review' | 'done'
  priority: 'tinggi' | 'sedang' | 'rendah'
  dueAt?: string
  position: string
  labels: string[]
  subDone: number
  subTotal: number
  assignee?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectEntity {
  id: string
  name: string
  color: string
  status: 'active' | 'archived'
  createdAt: string
}

export interface BacklogEntity {
  id: string
  projectId: string
  type: 'epic' | 'story' | 'bug'
  title: string
  status: 'backlog' | 'todo' | 'doing' | 'done'
  sprint: string
  points: number
  createdAt: string
}

export interface ReminderEntity {
  id: string
  taskId?: string
  title: string
  remindAt: string
  repeat: string // 'Sekali' | 'Harian' | 'Mingguan' | 'Bulanan'
  channels: string[]
  active: boolean
  createdAt: string
}

export interface ApiCollectionEntity {
  id: string
  name: string
  parentId?: string
  createdAt: string
}

export interface ApiRequestEntity {
  id: string
  collectionId: string
  name: string
  method: string
  url: string
  headers: { key: string; value: string; on: boolean }[]
  params: { key: string; value: string; on: boolean }[]
  bodyType: 'json' | 'form' | 'raw'
  body: string
  authType: 'bearer' | 'basic' | 'apikey' | 'none'
  authToken?: string
  createdAt: string
  updatedAt: string
}

export interface ApiHistoryEntity {
  id: string
  method: string
  url: string
  status: number
  durationMs: number
  sizeBytes: number
  responsePreview: string
  createdAt: string
}

export interface MomNoteEntity {
  id: string
  title: string
  meetingDate: string
  rawNotes: string
  template: string
  language: string
  result: any
  createdAt: string
}

export interface SnippetEntity {
  id: string
  kind: 'code' | 'prompt' | 'payload'
  title: string
  lang: string
  code: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ExcelFileEntity {
  id: string
  name: string
  sizeBytes: number
  rowCount: number
  colCount: number
  columns: any[]
  sampleRows: any[]
  uploadedAt: string
}

export interface VideoNoteEntity {
  id: string
  youtubeId: string
  url: string
  title: string
  channel: string
  duration: string
  transcript: [string, string][]
  summary: any
  highlights: any[]
  createdAt: string
}

export interface TaskScheduleEntity {
  id: string
  title: string
  description?: string
  projectId: string
  priority: 'tinggi' | 'sedang' | 'rendah'
  targetStatus: 'backlog' | 'todo' | 'doing'
  frequency: 'daily' | 'weekdays' | 'weekly' | 'monthly'
  time: string // e.g. "16:30"
  daysOfWeek?: number[] // 1=Senin ... 5=Jumat, 6=Sabtu, 0=Minggu
  labels: string[]
  subtasks?: string[]
  active: boolean
  lastTriggeredDate?: string // YYYY-MM-DD
  createdAt: string
}

export interface InAppNotification {
  id: string
  title: string
  body: string
  tone: 'info' | 'warning' | 'success' | 'danger'
  unread: boolean
  link?: string
  createdAt: string
}

// Database definition
export class SiKomputerDB extends Dexie {
  users!: EntityTable<UserEntity, 'id'>
  sessions!: EntityTable<SessionEntity, 'id'>
  securityConfig!: EntityTable<SecurityConfigEntity, 'id'>
  tasks!: EntityTable<TaskEntity, 'id'>
  projects!: EntityTable<ProjectEntity, 'id'>
  backlog!: EntityTable<BacklogEntity, 'id'>
  reminders!: EntityTable<ReminderEntity, 'id'>
  apiCollections!: EntityTable<ApiCollectionEntity, 'id'>
  apiRequests!: EntityTable<ApiRequestEntity, 'id'>
  apiHistory!: EntityTable<ApiHistoryEntity, 'id'>
  momNotes!: EntityTable<MomNoteEntity, 'id'>
  snippets!: EntityTable<SnippetEntity, 'id'>
  excelFiles!: EntityTable<ExcelFileEntity, 'id'>
  videoNotes!: EntityTable<VideoNoteEntity, 'id'>
  taskSchedules!: EntityTable<TaskScheduleEntity, 'id'>
  notes!: EntityTable<NoteEntity, 'id'>
  notifications!: EntityTable<InAppNotification, 'id'>

  constructor() {
    super('SiKomputerDB')
    this.version(1).stores({
      users: 'id, email, fullName, role, createdAt',
      sessions: 'id, userId, active, lastSeenAt',
      securityConfig: 'id, userId',
      tasks: 'id, projectId, status, priority, dueAt, position, createdAt',
      projects: 'id, name, status, color',
      backlog: 'id, projectId, type, status, sprint',
      reminders: 'id, taskId, remindAt, active',
      apiCollections: 'id, name, parentId',
      apiRequests: 'id, collectionId, method, name',
      apiHistory: 'id, method, url, status, createdAt',
      momNotes: 'id, title, meetingDate, createdAt',
      snippets: 'id, kind, title, *tags, updatedAt',
      excelFiles: 'id, name, uploadedAt',
      videoNotes: 'id, youtubeId, title, createdAt',
    })

    this.version(2).stores({
      taskSchedules: 'id, projectId, frequency, active, lastTriggeredDate',
    })

    this.version(3).stores({
      notes: 'id, category, isPinned, createdAt, updatedAt',
    })

    this.version(4).stores({
      notifications: 'id, tone, unread, createdAt',
    })
  }
}

export const db = new SiKomputerDB()

