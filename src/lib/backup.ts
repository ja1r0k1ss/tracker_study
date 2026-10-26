import type { Lesson, StudyLog, Subject } from '../db/schema'

export interface Backup {
  app: 'LexTracker'
  version: 1
  exportedAt: string
  subjects: Subject[]
  lessons: Lesson[]
  studyLogs: StudyLog[]
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** Valida un JSON importado antes de tocar la base de datos. Lanza Error con mensaje legible. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('El archivo no es un JSON válido.') }
  if (!isObj(data) || data.app !== 'LexTracker' || data.version !== 1) throw new Error('No es una copia de seguridad de LexTracker.')
  const { subjects, lessons, studyLogs } = data
  if (!Array.isArray(subjects) || !Array.isArray(lessons) || !Array.isArray(studyLogs)) throw new Error('Faltan tablas en la copia.')
  if (!subjects.every((s) => isObj(s) && typeof s.id === 'string' && typeof s.name === 'string')) throw new Error('Asignaturas corruptas.')
  const ids = new Set(subjects.map((s) => s.id))
  if (!lessons.every((l) => isObj(l) && typeof l.id === 'number' && ids.has(l.subjectId as string) && isObj(l.status)))
    throw new Error('Lecciones corruptas.')
  if (!studyLogs.every((l) => isObj(l) && typeof l.id === 'string' && typeof l.date === 'string' && typeof l.totalMinutes === 'number')) throw new Error('Registros de estudio corruptos.')
  return data as unknown as Backup
}
