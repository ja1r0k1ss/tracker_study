import type { Lesson, LessonStatus, Subject } from '../db/schema'

export const VUELTAS = ['v1', 'v2', 'v3', 'v4', 'v5'] as const

/** Fracción (0-1) de lecciones con cada vuelta hecha, y media global sobre las 5 vueltas. */
export function progress(lessons: Pick<Lesson, 'status'>[]) {
  const n = lessons.length || 1
  const perVuelta = VUELTAS.map((k) => lessons.filter((l) => l.status[k]).length / n)
  return { perVuelta, global: perVuelta.reduce((a, b) => a + b, 0) / VUELTAS.length }
}

export function isInteractiveWeek(weekStarts: string[], now = new Date()) {
  return weekStarts.some((w) => {
    const start = new Date(`${w}T00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return now >= start && now < end
  })
}

export const examDateOf = (s: Pick<Subject, 'examDate' | 'examTime'>) => new Date(`${s.examDate}T${s.examTime}`)

/** Días naturales que faltan (medianoche a medianoche; round absorbe el cambio de hora). */
export function daysUntil(target: Date, now = new Date()) {
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.round((midnight(target) - midnight(now)) / 864e5))
}

export const STATUS_ORDER = ['notesDone', 'underlined', ...VUELTAS] as const satisfies readonly (keyof LessonStatus)[]

/** Marcar un estado completa todos los anteriores; desmarcarlo limpia todos los posteriores. */
export function cascade(status: LessonStatus, key: keyof LessonStatus, checked: boolean): LessonStatus {
  const i = STATUS_ORDER.indexOf(key)
  const next = { ...status }
  STATUS_ORDER.forEach((k, j) => {
    if (checked && j <= i) next[k] = true
    if (!checked && j >= i) next[k] = false
  })
  return next
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Celdas del mes empezando en lunes; null = hueco antes del día 1. */
export function monthGrid(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
}
