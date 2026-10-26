import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, Check, ChevronDown, ChevronRight, Clock, Highlighter, PenLine } from 'lucide-react'
import { db } from '../db/schema'
import { examDateOf, fmtMinutes, isoDate, isStudy, progress, VUELTAS, vueltasOf } from '../lib/stats'
import { ProgressBar } from './ProgressBar'
import { Badge } from './Badge'
import { LogStudy } from './StudyHours'

const MiniBar = ({ value }: { value: number }) => (
  <div className="h-1 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(value * 100)}%` }} /></div>
)

function Chip({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-canvas px-2 py-1.5 sm:px-3 sm:py-2 min-w-0">
      <p className="flex justify-between gap-1 text-caption"><span className="text-muted truncate">{label}</span><span className="tabular-nums font-normal">{value}</span></p>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function Dashboard({ onOpen, onStats }: { onOpen: (id: string) => void; onStats: () => void }) {
  const todayLogs = useLiveQuery(() => db.studyLogs.where('date').equals(isoDate(new Date())).toArray(), [], [])
  const todayMinutes = todayLogs.filter((l) => isStudy(l.activity)).reduce((a, l) => a + l.totalMinutes, 0)
  const subjects = useLiveQuery(() => db.subjects.orderBy('examDate').toArray(), [], [])
  const lessons = useLiveQuery(() => db.lessons.toArray(), [], [])

  // Solo el temario de examen cuenta vueltas; Inglés y Métodos son evaluación continua
  const temario = subjects.filter((s) => s.mode === 'temario')
  const continua = subjects.filter((s) => s.mode !== 'temario')
  const ownOf = (id: string) => lessons.filter((l) => l.subjectId === id)
  const temarioIds = new Set(temario.map((s) => s.id))
  const global = progress(lessons.filter((l) => temarioIds.has(l.subjectId)))

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-card shadow-card p-3 flex items-center gap-2">
        <button onClick={onStats} className="flex-1 min-w-0 flex items-center gap-2 h-11 text-left">
          <Clock size={18} className="text-muted shrink-0" />
          <span className="text-body">Hoy: <span className="font-normal tabular-nums">{fmtMinutes(todayMinutes)}</span></span>
          <BarChart3 size={16} className="ml-auto text-faint shrink-0" aria-label="Ver estadísticas" />
        </button>
        <LogStudy />
      </section>

      <section className="bg-card rounded-card shadow-card p-6">
        <ProgressBar label="Avance global del temario (5 vueltas)" value={global.global} />
      </section>

      <section>
        <h2 className="text-heading mb-3">Vueltas por asignatura</h2>
        <div className="space-y-3">
          {temario.map((s) => {
            const own = ownOf(s.id).sort((a, b) => a.lessonNumber - b.lessonNumber)
            const p = progress(own)
            const notes = own.filter((l) => l.status.notesDone).length
            const underlined = own.filter((l) => l.status.underlined).length
            return (
              <div key={s.id} className="bg-card rounded-card shadow-card p-3 sm:p-4 border-l-4 space-y-2 sm:space-y-3" style={{ borderLeftColor: s.color ?? 'var(--color-faint)' }}>
                <button onClick={() => onOpen(s.id)} className="w-full text-left flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-caption text-muted truncate"><Badge subject={s} /> {s.course}{s.manual && ` · ${s.manual}`}</p>
                    <p className="font-normal truncate">{s.name}</p>
                  </div>
                  <span className="text-heading-sm sm:text-heading font-heading tabular-nums">{Math.round(p.global * 100)}%</span>
                  <ChevronRight size={18} className="text-faint" />
                </button>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <Chip label="Vueltas" value={`${(p.global * VUELTAS.length).toFixed(1).replace('.', ',')}L`}>
                    <div className="flex gap-0.5" title={p.perVuelta.map((v, i) => `${i + 1}L ${Math.round(v * 100)}%`).join(' · ')}>
                      {p.perVuelta.map((v, i) => <div key={VUELTAS[i]} className="flex-1"><MiniBar value={v} /></div>)}
                    </div>
                  </Chip>
                  <Chip label="Apuntes" value={`${notes}/${own.length}`}><MiniBar value={notes / (own.length || 1)} /></Chip>
                  <Chip label="Subrayado" value={`${underlined}/${own.length}`}><MiniBar value={underlined / (own.length || 1)} /></Chip>
                </div>
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center gap-1 text-caption text-muted py-1">
                    <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />Lecciones ({own.length})
                  </summary>
                  <ul className="mt-1 divide-y divide-line border-t border-line">
                    {own.map((l) => {
                      const n = vueltasOf(l.status)
                      return (
                        <li key={l.id} className="flex items-center gap-2 py-1 text-caption">
                          <span className="w-5 shrink-0 text-faint tabular-nums">{l.lessonNumber}</span>
                          <span className="flex-1 min-w-0 truncate">{l.title.replace(/^\S+ [^:]+: /, '')}</span>
                          <PenLine size={13} aria-label={l.status.notesDone ? 'Apuntes hechos' : 'Sin apuntes'} className={l.status.notesDone ? 'text-fg' : 'text-faint opacity-40'} />
                          <Highlighter size={13} aria-label={l.status.underlined ? 'Subrayada' : 'Sin subrayar'} className={l.status.underlined ? 'text-fg' : 'text-faint opacity-40'} />
                          <span className={`w-6 text-center rounded tabular-nums ${n ? 'bg-ink text-on-ink' : 'text-faint'}`}>{n}L</span>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              </div>
            )
          })}
        </div>
      </section>

      {continua.length > 0 && (
        <section>
          <h2 className="text-heading mb-3">Trabajos y Evaluación Continua</h2>
          <div className="space-y-3">
            {continua.map((s) => {
              const own = ownOf(s.id).sort((a, b) => a.lessonNumber - b.lessonNumber)
              const done = own.filter((l) => l.status.notesDone).length
              return (
                <button key={s.id} onClick={() => onOpen(s.id)} className="w-full text-left bg-card rounded-card shadow-card hover:shadow-card-hover p-4 border-l-4" style={{ borderLeftColor: s.color ?? 'var(--color-faint)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-muted"><Badge subject={s} /> {s.examLabel}: {examDateOf(s).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {s.examTime} · {s.examRoom}</p>
                      <p className="font-normal truncate">{s.name}</p>
                    </div>
                    <span className="text-body-sm text-muted tabular-nums">{done}/{own.length}</span>
                    <ChevronRight size={18} className="text-faint" />
                  </div>
                  <ul className="mt-3 space-y-1 text-body-sm">
                    {own.map((l) => (
                      <li key={l.id} className={`flex items-center gap-2 ${l.status.notesDone ? 'text-muted line-through' : ''}`}>
                        <span className={`size-4 shrink-0 rounded-full border inline-flex items-center justify-center ${l.status.notesDone ? 'bg-ink border-ink text-on-ink' : 'border-line'}`}>
                          {l.status.notesDone && <Check size={10} />}
                        </span>
                        {l.title}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
