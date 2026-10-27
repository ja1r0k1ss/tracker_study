import type { Lesson, LessonStatus, StudyActivity, Subject } from '../db/schema'

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

/** Marcar un paso completa todos los anteriores; desmarcarlo limpia todos los posteriores. */
export function cascade(status: LessonStatus, key: keyof LessonStatus, checked: boolean): LessonStatus {
  const i = STATUS_ORDER.indexOf(key)
  const next = { ...status }
  STATUS_ORDER.forEach((k, j) => {
    if (checked && j <= i) next[k] = true
    if (!checked && j >= i) next[k] = false
  })
  return next
}

/** Nº de vueltas hechas en una lección (son consecutivas por la cascada). */
export const vueltasOf = (status: LessonStatus) => VUELTAS.filter((k) => status[k]).length

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Celdas del mes empezando en lunes; null = hueco antes del día 1. */
export function monthGrid(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

/** Minutos entre dos HH:mm; si el fin es anterior al inicio se asume que cruza medianoche. */
export function minutesBetween(start: string, end: string) {
  return (toMin(end) - toMin(start) + 1440) % 1440
}

/** Minutos de un bloque HH:mm–HH:mm por hora: índices 0-23 = día del registro, 24-47 = día siguiente (cruce de medianoche). */
export function spreadByHour(start: string, end: string) {
  const out = Array<number>(48).fill(0)
  const e = toMin(start) + minutesBetween(start, end)
  for (let t = toMin(start); t < e;) {
    const next = Math.min(e, (Math.floor(t / 60) + 1) * 60)
    out[Math.floor(t / 60)] += next - t
    t = next
  }
  return out
}

/** Tiers por carga cognitiva real: peso de cada minuto en la "carga cognitiva" (lectura > vueltas >> apuntes, que se hacen con IA). */
export const TIER: Partial<Record<StudyActivity, number>> = { lectura: 1, vueltas: 0.85, apuntes: 0.15 }

/** Estudio efectivo: solo las actividades con tier (registros antiguos sin activity cuentan como estudio). */
export const isStudy = (a?: StudyActivity) => a === undefined || a in TIER

/** Minutos ponderados por tier; registros antiguos sin activity cuentan al 100%. */
export const weightOf = (a?: StudyActivity) => (a ? TIER[a] ?? 0 : 1)

/** 270 → "4h 30m"; 45 → "45m"; 120 → "2h". */
export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

/** Lunes (00:00) de la semana de d. */
export function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}
