import Dexie, { type EntityTable } from 'dexie'

export type SubjectMode = 'temario' | 'hitos' | 'adaptado'

export interface Subject {
  id: string
  name: string
  code: string
  course: string
  semester: number
  examDate: string // YYYY-MM-DD
  examTime: string // HH:mm
  examRoom: string
  examLabel: 'Examen' | 'Presentación'
  manual?: string
  type: 'obligatoria' | 'optativa'
  color?: string // color de la etiqueta en calendario
  mode: SubjectMode
  classSchedule: string[]
  interactiveWeeks: string[] // lunes de cada semana, YYYY-MM-DD
}

export interface LessonStatus {
  notesDone: boolean
  underlined: boolean
  v1: boolean
  v2: boolean
  v3: boolean
  v4: boolean
  v5: boolean
}

export interface Lesson {
  id: number
  subjectId: string
  partTitle: string
  lessonNumber: number
  title: string
  status: LessonStatus
  notes: string
}

/** Bloque de estudio. En Supabase: study_logs (subject_id, start_time, end_time, total_minutes). */
export type StudyActivity = 'vueltas' | 'lectura' | 'apuntes' | 'universidad' | 'clase' | 'proyectos' | 'descanso'

export interface StudyLog {
  id: string // uuid: los ids autoincrementales de Dexie chocarían entre dispositivos
  subjectId?: string
  activity?: StudyActivity // ausente en registros anteriores a este campo
  lessonId?: number // solo en 'vueltas', 'lectura' y 'apuntes'
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm; vacío si se registró solo la duración
  endTime?: string // HH:mm
  totalMinutes: number
  notes?: string
}

export const db = new Dexie('LexTracker') as Dexie & {
  subjects: EntityTable<Subject, 'id'>
  lessons: EntityTable<Lesson, 'id'>
  studyLogs: EntityTable<StudyLog, 'id'>
}

db.version(1).stores({
  subjects: 'id, examDate',
  lessons: '++id, subjectId',
  studyLogs: '++id, lessonId, date',
})

// v2: temario y colores nuevos. Vacía las tablas (los ids de lección cambian) y seedIfEmpty recarga el temario oficial.
db.version(2).stores({}).upgrade((tx) =>
  Promise.all([tx.table('subjects').clear(), tx.table('lessons').clear(), tx.table('studyLogs').clear()]))

// v3-v4: studyLogs pasa de ++id a uuid; Dexie no cambia la clave primaria en sitio, así que se borra y recrea (estaba sin uso).
db.version(3).stores({ studyLogs: null })
db.version(4).stores({ studyLogs: 'id, date' })
