import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ChevronDown, Plus, Trash2, X } from 'lucide-react'
import { db, type Lesson, type StudyActivity, type StudyLog, type Subject } from '../db/schema'
import { deleteLog, saveLog } from '../db/sync'
import { fmtMinutes, isoDate, isStudy, minutesBetween, mondayOf, monthGrid, spreadByHour, TIER, vueltasOf, weightOf } from '../lib/stats'
import { Badge } from './Badge'

const PRESETS = [25, 30, 45, 60, 90, 120, 180]
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const ACTIVITIES: [StudyActivity, string][] = [['vueltas', 'Vueltas al temario'], ['lectura', 'Lectura apuntes'], ['apuntes', 'Preparación apuntes'], ['universidad', 'UPF / USC'], ['proyectos', 'Proyectos personales'], ['descanso', 'Descanso']]
// Solo el estudio efectivo (vueltas, lectura, apuntes) va ligado a asignatura y lección
const withLesson = isStudy
/** Horas con una decimal sin unidad (270 → "4,5"), para que 7 columnas quepan en un iPhone. */
const fmtH = (min: number) => (min ? String(Math.round(min / 6) / 10).replace('.', ',') : '–')
// text-body (16px) en los inputs: con menos, Safari iOS hace zoom al enfocarlos
// leading-[46px] = h-12 menos 2px de borde: la línea ocupa todo el alto interior y el texto queda centrado también en Safari iOS
const input = 'block w-full min-w-0 max-w-full box-border h-12 px-3 py-0 leading-[46px] rounded-input border border-line bg-canvas text-body'
// Safari iOS da a date/time un ancho mínimo propio que desborda la celda; appearance-none lo anula
const dateInput = `${input} appearance-none [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:leading-[46px]`
const nowHHmm = () => new Date().toTimeString().slice(0, 5)

/** Select sin estilo nativo (iOS no lo centra en vertical) con flecha propia. */
const Select = ({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <span className="relative mt-1 block">
    <select {...props} className={`${input} appearance-none pr-10 text-fg ${className}`} />
    <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
  </span>
)

/** Botón "Registrar" + modal para añadir un bloque de estudio. */
export function LogStudy() {
  const dialog = useRef<HTMLDialogElement>(null)
  const subjects = useLiveQuery(() => db.subjects.orderBy('examDate').toArray(), [], [])
  const [byRange, setByRange] = useState(true)
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [hours, setHours] = useState('')
  const [mins, setMins] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [activity, setActivity] = useState<StudyActivity>('vueltas')
  const [lessonId, setLessonId] = useState('')
  const lessons = useLiveQuery(() => db.lessons.where('subjectId').equals(subjectId).sortBy('lessonNumber'), [subjectId], [])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const total = byRange
    ? (start && end ? minutesBetween(start, end) : 0)
    : (Number(hours) || 0) * 60 + (Number(mins) || 0)

  const open = () => {
    setDate(isoDate(new Date())); setStart(''); setEnd(nowHHmm()); setHours(''); setMins(''); setNotes(''); setLessonId(''); setError('')
    dialog.current?.showModal()
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (total <= 0 || total > 1440) return setError(byRange ? 'Indica una hora de inicio y fin distintas.' : 'Indica una duración entre 1 minuto y 24 horas.')
    const log: StudyLog = {
      id: crypto.randomUUID(), date, totalMinutes: total, activity,
      ...(withLesson(activity) && lessonId && { lessonId: Number(lessonId) }),
      ...(byRange && { startTime: start, endTime: end }),
      ...(subjectId && withLesson(activity) && { subjectId }),
      ...(notes.trim() && { notes: notes.trim() }),
    }
    await saveLog(log)
    dialog.current?.close()
  }

  const tab = (on: boolean) => `flex-1 min-w-0 h-11 rounded-full text-body-sm font-normal ${on ? 'bg-ink text-on-ink' : 'text-muted'}`

  return (
    <>
      <button onClick={open} className="inline-flex items-center gap-1 h-11 rounded-full bg-ink text-on-ink px-4 text-body-sm font-normal">
        <Plus size={16} /> Registrar
      </button>
      <dialog ref={dialog} className="w-[calc(100%-2rem)] max-w-md mx-auto my-auto max-h-[92dvh] overflow-x-hidden box-border rounded-card bg-card text-fg p-4 shadow-card backdrop:bg-black/40">
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm">Registrar estudio</h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar" className="size-11 grid place-items-center rounded-full hover:bg-canvas"><X size={18} /></button>
          </div>

          <label className="block min-w-0 text-caption text-muted">Fecha
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${dateInput} mt-1 text-fg`} />
          </label>

          <div className="grid grid-cols-2 gap-2 w-full">
            {ACTIVITIES.map(([a, label]) => (
              <button key={a} type="button" onClick={() => setActivity(a)}
                className={`h-11 min-w-0 px-2 truncate rounded-full border text-body-sm ${activity !== a ? 'border-line' : a === 'proyectos' ? 'bg-project text-white border-project' : 'bg-ink text-on-ink border-ink'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex rounded-full border border-line p-1">
            <button type="button" onClick={() => setByRange(true)} className={tab(byRange)}>Inicio y fin</button>
            <button type="button" onClick={() => setByRange(false)} className={tab(!byRange)}>Duración</button>
          </div>

          {byRange ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <label className="block min-w-0 text-caption text-muted">Inicio
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${dateInput} mt-1 text-fg`} />
              </label>
              <label className="block min-w-0 text-caption text-muted">Fin
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${dateInput} mt-1 text-fg`} />
              </label>
              <button type="button" onClick={() => setStart(nowHHmm())} className="h-11 min-w-0 px-2 truncate rounded-full border border-line text-body-sm">Inicio: ahora</button>
              <button type="button" onClick={() => setEnd(nowHHmm())} className="h-11 min-w-0 px-2 truncate rounded-full border border-line text-body-sm">Fin: ahora</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 w-full">
                {PRESETS.map((m) => (
                  <button key={m} type="button" onClick={() => { setHours(String(Math.floor(m / 60))); setMins(String(m % 60)) }}
                    className={`h-11 min-w-0 rounded-full border text-body-sm tabular-nums ${total === m ? 'bg-ink text-on-ink border-ink' : 'border-line'}`}>
                    {fmtMinutes(m)}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <label className="block min-w-0 text-caption text-muted">Horas
                  <input type="number" inputMode="numeric" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} className={`${input} mt-1 text-fg`} />
                </label>
                <label className="block min-w-0 text-caption text-muted">Minutos
                  <input type="number" inputMode="numeric" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} className={`${input} mt-1 text-fg`} />
                </label>
              </div>
            </div>
          )}

          <label className="block min-w-0 text-caption text-muted">Asignatura
            <Select value={withLesson(activity) ? subjectId : ''} onChange={(e) => { setSubjectId(e.target.value); setLessonId('') }}
              disabled={!withLesson(activity)} className="disabled:opacity-50">
              <option value="">Sin asignatura</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
            </Select>
          </label>

          {withLesson(activity) && (
            <label className="block min-w-0 text-caption text-muted">Lección / tema (opcional)
              <Select value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!subjectId} className="disabled:opacity-50">
                <option value="">{subjectId ? 'Sin lección concreta' : 'Elige antes una asignatura'}</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </Select>
            </label>
          )}

          <label className="block min-w-0 text-caption text-muted">Notas (opcional)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${input} mt-1 text-fg`} />
          </label>

          {error && <p className="text-body-sm text-red-600" role="alert">{error}</p>}
          <button type="submit" className="w-full h-12 rounded-full bg-ink text-on-ink text-body font-normal">
            Guardar{total > 0 && ` · ${fmtMinutes(total)}`}
          </button>
        </form>
      </dialog>
    </>
  )
}

function Tile({ label, minutes }: { label: string; minutes: number }) {
  return (
    <div className="bg-card rounded-card shadow-card p-3">
      <p className="text-caption text-muted">{label}</p>
      <p className="text-heading-sm font-heading tabular-nums">{fmtMinutes(minutes)}</p>
    </div>
  )
}

type DayStats = Record<'vueltas' | 'apuntes' | 'lectura' | 'universidad' | 'proyectos' | 'descanso' | 'study' | 'quality' | 'total', number>
// [etiqueta, clave, clases, título, es subfila de Estudio]
const ROWS: [string, keyof DayStats, string, string, boolean?][] = [
  ['Estudio', 'study', 'text-fg font-semibold', 'Estudio efectivo (vueltas + lectura + apuntes)'],
  ['Vueltas', 'vueltas', 'text-muted', 'Vueltas al temario', true], ['Lectura', 'lectura', 'text-muted', 'Lectura apuntes', true],
  ['Apuntes', 'apuntes', 'text-muted', 'Preparación apuntes', true], ['UPF/USC', 'universidad', 'text-muted', 'Gestiones de la universidad (UPF / USC)'], ['Proyectos', 'proyectos', 'text-project', 'Proyectos personales'],
  ['Descanso', 'descanso', 'text-muted', 'Descanso'], ['Total global', 'total', 'text-fg font-semibold', 'Total global (todo el tiempo registrado)'],
]
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
// Intensidad por horas de estudio ponderadas por tier: <1h, <2h, <4h, ≥4h
const shade = (min: number) => (min >= 240 ? 1 : min >= 120 ? 0.75 : min >= 60 ? 0.5 : 0.3)

/** Calendario de constancia desde el mes actual hasta el del último examen; al tocar un día se ve su desglose en una línea. */
function ExamHeatmap({ today, dayOf, exams }: { today: string; dayOf: (d: string) => DayStats; exams: Map<string, Subject[]> }) {
  const [picked, setPicked] = useState(today)
  const last = [...exams.keys()].filter((d) => d >= today).sort().at(-1) ?? today
  const [y0, m0] = today.split('-').map(Number), [y1, m1] = last.split('-').map(Number)
  const months = Array.from({ length: (y1 - y0) * 12 + m1 - m0 + 1 }, (_, i) => new Date(y0, m0 - 1 + i, 1))
  const days = months.map((d) => monthGrid(d.getFullYear(), d.getMonth()))
  const doneDays = days.flat().filter((d) => d && dayOf(isoDate(d)).study > 0).length
  const p = dayOf(picked)
  const detail = ROWS.filter(([, k]) => k !== 'study' && k !== 'total' && k !== 'quality' && p[k]).map(([label, k]) => `${label} ${fmtMinutes(p[k])}`)
  const pickedExams = exams.get(picked) ?? []

  return (
    <section className="bg-card rounded-card shadow-card p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-body font-normal">Constancia hasta exámenes</h3>
        <span className="text-caption text-muted tabular-nums">{doneDays} días con estudio</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
        {days.map((cells, i) => (
          <div key={i} className="min-w-0">
            <p className="text-caption text-muted leading-tight mb-0.5">{MONTHS[months[i].getMonth()]}{months[i].getFullYear() !== y0 && ` ${String(months[i].getFullYear()).slice(2)}`}</p>
            <div className="grid grid-cols-7 gap-px">
              {cells.map((d, j) => {
                if (!d) return <span key={`x${j}`} />
                const iso = isoDate(d), { study: min, quality } = dayOf(iso), exam = exams.get(iso)?.[0]
                return (
                  <button key={iso} type="button" onClick={() => setPicked(iso)} title={`${iso} · ${fmtMinutes(min)}`} aria-label={`${iso}: ${fmtMinutes(min)}${exam ? ` · ${exam.examLabel} ${exam.code}` : ''}`}
                    className={`relative aspect-square rounded-[2px] ${min ? '' : 'bg-line'} ${iso === picked ? 'ring-1 ring-fg' : iso === today ? 'ring-1 ring-accent' : ''}`}
                    // outline y no ring: ring ya marca hoy/seleccionado y ambos usan box-shadow
                    style={exam ? { outline: `2px solid ${exam.color ?? 'var(--color-accent)'}`, outlineOffset: -2 } : undefined}>
                    {min > 0 && <span className="absolute inset-0 rounded-[2px] bg-done" style={{ opacity: shade(quality) }} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 pt-2 border-t border-line text-caption text-muted truncate">
        <span className="text-fg">{new Date(`${picked}T00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        {pickedExams.map((s) => <span key={s.id} className="text-fg font-semibold"> · {s.examLabel} {s.code} {s.examTime}</span>)}
        {' · '}<span className="text-fg font-semibold tabular-nums">{fmtMinutes(p.study)} estudio</span>
        {detail.length > 0 && ` · ${detail.join(' · ')}`}
      </p>
    </section>
  )
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const pct = (study: number, rest: number) => (study + rest ? Math.round((study / (study + rest)) * 100) : 0)

/** Espectrograma día×hora del estudio ponderado por tier + fila de foco (estudio / (estudio + descanso)) por hora. */
function HourMap({ logs }: { logs: StudyLog[] }) {
  const [picked, setPicked] = useState<[number, number] | null>(null)
  const grid = () => DAYS.map(() => Array<number>(24).fill(0))
  const study = grid(), rest = grid(), quality = grid()
  const timed = logs.filter((l) => l.startTime && l.endTime && (isStudy(l.activity) || l.activity === 'descanso'))
  timed.forEach((l) => {
    const wd = (new Date(`${l.date}T00:00`).getDay() + 6) % 7
    spreadByHour(l.startTime!, l.endTime!).forEach((m, i) => {
      if (!m) return
      const d = (wd + Math.floor(i / 24)) % 7, h = i % 24
      ;(isStudy(l.activity) ? study : rest)[d][h] += m
      quality[d][h] += m * weightOf(l.activity)
    })
  })
  const colSum = (g: number[][], h: number) => g.reduce((a, r) => a + r[h], 0)
  const hourStudy = HOURS.map((h) => colSum(study, h)), hourRest = HOURS.map((h) => colSum(rest, h))
  const max = Math.max(1, ...quality.flat())
  const peak = hourStudy.indexOf(Math.max(...hourStudy))
  // Mejor foco solo entre horas con ≥1h registrada, para que un bloque suelto no gane con un 100%
  const focusHours = HOURS.filter((h) => hourStudy[h] + hourRest[h] >= 60)
  const best = focusHours.sort((a, b) => pct(hourStudy[b], hourRest[b]) - pct(hourStudy[a], hourRest[a]))[0]
  const untimed = logs.filter((l) => isStudy(l.activity) && !l.startTime).length
  const cell = (d: number, h: number) => picked?.[0] === d && picked[1] === h ? 'ring-1 ring-fg' : ''

  return (
    <section className="bg-card rounded-card shadow-card p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-body font-normal">Cuándo estudio</h3>
        <span className="text-caption text-muted">por hora</span>
      </div>
      {!hourStudy.some(Boolean) ? (
        <p className="text-body-sm text-muted">Registra bloques con inicio y fin para ver tus horas.</p>
      ) : (
        <>
          <div className="grid grid-cols-[1rem_repeat(24,minmax(0,1fr))] gap-px text-caption text-muted">
            <span />
            {HOURS.map((h) => <span key={h} className="leading-tight whitespace-nowrap">{h % 6 ? '' : h}</span>)}
            {DAYS.map((label, d) => [
              <span key={label} className="leading-none self-center">{label}</span>,
              ...HOURS.map((h) => (
                <button key={`${d}-${h}`} type="button" onClick={() => setPicked([d, h])} aria-label={`${label} ${h}h: ${fmtMinutes(study[d][h])}`}
                  className={`relative aspect-square rounded-[2px] bg-line ${cell(d, h)}`}>
                  {study[d][h] > 0 && <span className="absolute inset-0 rounded-[2px] bg-accent" style={{ opacity: 0.2 + 0.8 * (quality[d][h] / max) }} />}
                </button>
              )),
            ])}
            <span className="leading-none self-center mt-1" title="Foco: estudio / (estudio + descanso)">F</span>
            {HOURS.map((h) => (
              <button key={`f${h}`} type="button" onClick={() => setPicked([-1, h])} aria-label={`Foco ${h}h: ${pct(hourStudy[h], hourRest[h])}%`}
                className={`relative mt-1 aspect-square rounded-[2px] bg-line ${cell(-1, h)}`}>
                {hourStudy[h] + hourRest[h] > 0 && <span className="absolute inset-0 rounded-[2px] bg-done" style={{ opacity: Math.max(0.15, pct(hourStudy[h], hourRest[h]) / 100) }} />}
              </button>
            ))}
          </div>
          <p className="mt-3 pt-2 border-t border-line text-caption text-muted truncate">
            {picked ? (
              <>
                <span className="text-fg">{picked[0] < 0 ? 'Todos los días' : DAYS[picked[0]]} · {picked[1]}–{picked[1] + 1}h</span>
                {' · '}<span className="text-fg font-semibold tabular-nums">{fmtMinutes(picked[0] < 0 ? hourStudy[picked[1]] : study[picked[0]][picked[1]])} estudio</span>
                {' · '}foco {picked[0] < 0 ? pct(hourStudy[picked[1]], hourRest[picked[1]]) : pct(study[picked[0]][picked[1]], rest[picked[0]][picked[1]])}%
              </>
            ) : (
              <>
                Hora punta <span className="text-fg font-semibold">{peak}–{peak + 1}h</span>
                {best !== undefined && <> · Mejor foco <span className="text-fg font-semibold">{best}–{best + 1}h ({pct(hourStudy[best], hourRest[best])}%)</span></>}
              </>
            )}
          </p>
          {untimed > 0 && <p className="text-caption text-faint">{untimed} registros solo con duración no aparecen aquí.</p>}
        </>
      )}
    </section>
  )
}

// Tiers de estudio en el acento (más opaco = tier más alto); el resto con color propio
const CAT_COLOR: Record<StudyActivity, [string, number]> = {
  vueltas: ['var(--color-accent)', 1], lectura: ['var(--color-accent)', 0.6], apuntes: ['var(--color-accent)', 0.3],
  universidad: ['var(--color-uni)', 1], proyectos: ['var(--color-project)', 1], descanso: ['var(--color-faint)', 1],
}
const STUDY_CATS = ['vueltas', 'lectura', 'apuntes'] as const
const PERIODS: [string, number][] = [['7 días', 7], ['30 días', 30], ['Todo', 0]]
const sumOf = (ls: StudyLog[]) => ls.reduce((a, l) => a + l.totalMinutes, 0)

/** Barra apilada por categoría. */
function Stack({ parts }: { parts: [StudyActivity, number][] }) {
  const total = parts.reduce((a, [, m]) => a + m, 0) || 1
  return (
    <div className="flex h-2 rounded-full bg-line overflow-hidden">
      {parts.map(([a, m]) => m > 0 && <span key={a} style={{ width: `${(m / total) * 100}%`, background: CAT_COLOR[a][0], opacity: CAT_COLOR[a][1] }} />)}
    </div>
  )
}

/** Análisis por categoría, asignatura y lección en un periodo. */
function Analysis({ logs, subjects, lessons }: { logs: StudyLog[]; subjects: Subject[]; lessons: Lesson[] }) {
  const [period, setPeriod] = useState(30)
  const [showAll, setShowAll] = useState(false)
  const now = new Date()
  const since = period ? isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - period + 1)) : ''
  const own = logs.filter((l) => l.date >= since)
  const study = own.filter((l) => isStudy(l.activity))
  const total = sumOf(own)

  const cats = ACTIVITIES.map(([a, label]) => ({ a, label, minutes: sumOf(own.filter((l) => l.activity === a)) })).filter((c) => c.minutes)
  const legacy = sumOf(own.filter((l) => !l.activity)) // registros anteriores al campo activity

  const bySubject = [...new Set(study.map((l) => l.subjectId))]
    .map((id) => {
      const ls = study.filter((l) => l.subjectId === id)
      return { subject: subjects.find((s) => s.id === id), minutes: sumOf(ls), parts: STUDY_CATS.map((a) => [a, sumOf(ls.filter((l) => l.activity === a))] as [StudyActivity, number]) }
    })
    .sort((a, b) => b.minutes - a.minutes)

  const byLesson = [...new Set(study.map((l) => l.lessonId).filter((x) => x !== undefined))]
    .map((id) => {
      const ls = study.filter((l) => l.lessonId === id), lesson = lessons.find((x) => x.id === id)
      return {
        lesson, subject: subjects.find((s) => s.id === lesson?.subjectId), minutes: sumOf(ls), sessions: ls.length,
        vueltas: lesson ? vueltasOf(lesson.status) : 0, parts: STUDY_CATS.map((a) => [a, sumOf(ls.filter((l) => l.activity === a))] as [StudyActivity, number]),
      }
    })
    .filter((x) => x.lesson) // lecciones borradas al reiniciar el temario
    .sort((a, b) => b.minutes - a.minutes)
  // "Lo que más cuesta": tiempo invertido por vuelta completada (sin vueltas cuenta como 1, para no dividir por 0)
  const hardest = [...byLesson].sort((a, b) => b.minutes / Math.max(1, b.vueltas) - a.minutes / Math.max(1, a.vueltas))[0]
  const noLesson = sumOf(study.filter((l) => l.lessonId === undefined))
  const tab = (on: boolean) => `flex-1 min-w-0 h-9 rounded-full text-body-sm ${on ? 'bg-ink text-on-ink' : 'text-muted'}`

  return (
    <section className="bg-card rounded-card shadow-card p-3 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-normal">Análisis</h3>
        <div className="flex w-52 rounded-full border border-line p-0.5">
          {PERIODS.map(([label, d]) => <button key={d} type="button" onClick={() => setPeriod(d)} className={tab(period === d)}>{label}</button>)}
        </div>
      </div>
      {total === 0 ? <p className="text-body-sm text-muted">Sin registros en este periodo.</p> : <>
        <div>
          <p className="text-caption text-muted mb-1">Por categoría · {fmtMinutes(total)} registradas</p>
          <Stack parts={cats.map((c) => [c.a, c.minutes])} />
          <ul className="mt-2 space-y-1">
            {cats.map(({ a, label, minutes }) => (
              <li key={a} className="flex items-center gap-2 text-body-sm">
                <span className="size-2.5 rounded-full shrink-0" style={{ background: CAT_COLOR[a][0], opacity: CAT_COLOR[a][1] }} />
                <span className="flex-1 min-w-0 truncate">{label}{a in TIER && <span className="text-caption text-faint"> · T{STUDY_CATS.indexOf(a as typeof STUDY_CATS[number]) + 1}</span>}</span>
                <span className="tabular-nums">{fmtMinutes(minutes)}</span>
                <span className="w-9 text-right text-caption text-muted tabular-nums">{Math.round((minutes / total) * 100)}%</span>
              </li>
            ))}
            {legacy > 0 && <li className="flex gap-2 text-caption text-muted"><span className="flex-1">Estudio sin categoría (antiguo)</span><span className="tabular-nums">{fmtMinutes(legacy)}</span></li>}
          </ul>
        </div>

        {bySubject.length > 0 && (
          <div>
            <p className="text-caption text-muted mb-1">Por asignatura · estudio efectivo</p>
            <ul className="space-y-2">
              {bySubject.map(({ subject, minutes, parts }) => (
                <li key={subject?.id ?? 'none'}>
                  <p className="flex justify-between gap-2 text-body-sm"><span className="truncate">{subject?.name ?? 'Sin asignatura'}</span><span className="tabular-nums shrink-0">{fmtMinutes(minutes)}</span></p>
                  <div className="mt-1" style={{ width: `${(minutes / bySubject[0].minutes) * 100}%` }}><Stack parts={parts} /></div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-caption text-muted mb-1">Por lección</p>
          {hardest && byLesson.length > 1 && (
            <p className="text-caption text-muted mb-2 truncate">Te cuesta más: <span className="text-fg font-semibold">{hardest.lesson!.title}</span> · {fmtMinutes(hardest.minutes / Math.max(1, hardest.vueltas))}/vuelta</p>
          )}
          {byLesson.length === 0 && <p className="text-body-sm text-muted">Elige la lección al registrar para ver este desglose.</p>}
          <ul className="space-y-2">
            {(showAll ? byLesson : byLesson.slice(0, 8)).map(({ lesson, subject, minutes, sessions, vueltas, parts }) => (
              <li key={lesson!.id}>
                <p className="flex items-center gap-2 text-body-sm">
                  {subject && <Badge subject={subject} />}
                  <span className="flex-1 min-w-0 truncate">{lesson!.title}</span>
                  <span className="tabular-nums shrink-0">{fmtMinutes(minutes)}</span>
                </p>
                <div className="mt-1" style={{ width: `${(minutes / byLesson[0].minutes) * 100}%` }}><Stack parts={parts} /></div>
                <p className="text-caption text-muted mt-0.5 truncate tabular-nums">
                  {sessions} {sessions === 1 ? 'sesión' : 'sesiones'} · media {fmtMinutes(minutes / sessions)} · {vueltas}/5 vueltas
                  {parts.filter(([, m]) => m).map(([a, m]) => ` · ${ROWS.find(([, k]) => k === a)![0]} ${fmtMinutes(m)}`).join('')}
                </p>
              </li>
            ))}
          </ul>
          {byLesson.length > 8 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 h-11 w-full rounded-full border border-line text-body-sm">
              {showAll ? 'Ver menos' : `Ver las ${byLesson.length} lecciones`}
            </button>
          )}
          {noLesson > 0 && <p className="mt-2 text-caption text-faint">{fmtMinutes(noLesson)} de estudio sin lección asignada.</p>}
        </div>
      </>}
    </section>
  )
}

export function StudyStats({ onBack }: { onBack: () => void }) {
  const allLogs = useLiveQuery(() => db.studyLogs.toArray(), [], [])
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [])
  const lessons = useLiveQuery(() => db.lessons.toArray(), [], [])
  const logs = allLogs.filter((l) => isStudy(l.activity)) // descansos, UPF/USC y proyectos se registran pero no suman horas de estudio
  const sum = sumOf

  const now = new Date()
  const today = isoDate(now)
  const week = Array.from({ length: 7 }, (_, i) => { const d = mondayOf(now); d.setDate(d.getDate() + i); return isoDate(d) })
  const month = today.slice(0, 7)
  const byDate = new Map<string, StudyLog[]>()
  allLogs.forEach((l) => byDate.set(l.date, [...(byDate.get(l.date) ?? []), l]))
  const dayOf = (d: string): DayStats => {
    const own = byDate.get(d) ?? []
    const by = (a: StudyActivity) => sum(own.filter((l) => l.activity === a))
    return { vueltas: by('vueltas'), apuntes: by('apuntes'), lectura: by('lectura'), universidad: by('universidad'), proyectos: by('proyectos'), descanso: by('descanso'), study: sum(own.filter((l) => isStudy(l.activity))), quality: own.reduce((a, l) => a + l.totalMinutes * weightOf(l.activity), 0), total: sum(own) }
  }
  const perDay = week.map(dayOf)
  const exams = new Map<string, Subject[]>()
  subjects.forEach((s) => s.examDate && exams.set(s.examDate, [...(exams.get(s.examDate) ?? []), s]))
  const doneDays = perDay.filter((d) => d.study > 0).length
  const weekStudy = perDay.reduce((a, d) => a + d.study, 0)

  const recent = [...allLogs].sort((a, b) => `${b.date}${b.startTime ?? ''}`.localeCompare(`${a.date}${a.startTime ?? ''}`)).slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 h-11 rounded-full border border-line bg-card px-4 text-body-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        <LogStudy />
      </div>
      <h2 className="text-heading">Horas estudiadas</h2>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Hoy" minutes={sum(logs.filter((l) => l.date === today))} />
        <Tile label="Semana" minutes={weekStudy} />
        <Tile label="Mes" minutes={sum(logs.filter((l) => l.date.startsWith(month)))} />
      </div>

      <section className="bg-card rounded-card shadow-card p-3">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-body font-normal">Esta semana</h3>
          <span className="text-caption text-muted">horas</span>
        </div>
        <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] gap-y-1.5 text-caption tabular-nums text-center">
          <span />
          {week.map((d, i) => (
            <span key={d} className={`flex flex-col items-center leading-tight ${d === today ? 'text-accent font-semibold' : 'text-muted'}`}>
              {DAYS[i]}<span>{Number(d.slice(8))}</span>
              <span className={`mt-0.5 size-2.5 rounded-full ${perDay[i].study ? 'bg-done' : 'bg-line'}`} aria-label={perDay[i].study ? 'Cumplido' : 'Sin estudio'} />
            </span>
          ))}
          {ROWS.map(([label, key, cls, full, sub]) => [
            <span key={label} title={full} className={`text-left truncate ${cls} ${sub ? 'pl-4' : ''} ${key === 'total' ? 'border-t border-line pt-1.5' : ''}`}>{sub ? `↳ ${label}` : label}</span>,
            ...perDay.map((d, i) => <span key={`${label}${i}`} className={`${d[key] ? cls : 'text-faint'} ${key === 'total' ? 'border-t border-line pt-1.5' : ''}`}>{fmtH(d[key])}</span>),
          ])}
        </div>
        <p className="mt-3 pt-2 border-t border-line text-body-sm">
          Días cumplidos esta semana: <span className="font-semibold tabular-nums">{doneDays} / 7</span>
          {weekStudy > 0 && <span className="text-muted" title="Vueltas 100% · Lectura 75% · Apuntes 50%"> · Calidad <span className="text-fg font-semibold tabular-nums">{Math.round((perDay.reduce((a, d) => a + d.quality, 0) / weekStudy) * 100)}%</span></span>}
        </p>
      </section>

      <ExamHeatmap today={today} dayOf={dayOf} exams={exams} />

      <HourMap logs={allLogs} />

      <Analysis logs={allLogs} subjects={subjects} lessons={lessons} />

      {recent.length > 0 && (
        <section className="bg-card rounded-card shadow-card p-4">
          <h3 className="text-body font-normal mb-1">Últimos registros</h3>
          <ul className="divide-y divide-line">
            {recent.map((l) => {
              const s = subjects.find((x) => x.id === l.subjectId)
              return (
                <li key={l.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm">
                      {new Date(`${l.date}T00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {l.startTime && <span className="text-muted"> · {l.startTime}–{l.endTime}</span>}
                    </p>
                    <p className="text-caption text-muted truncate">
                      {s && <Badge subject={s} />} {[ACTIVITIES.find(([a]) => a === l.activity)?.[1], lessons.find((x) => x.id === l.lessonId)?.title, l.notes].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-body-sm tabular-nums">{fmtMinutes(l.totalMinutes)}</span>
                  <button onClick={() => confirm('¿Borrar este registro?') && deleteLog(l.id)} aria-label="Borrar registro" className="size-11 grid place-items-center rounded-full text-faint hover:bg-canvas">
                    <Trash2 size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
