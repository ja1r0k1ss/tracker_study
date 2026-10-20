import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight } from 'lucide-react'
import { db } from '../db/schema'
import { examDateOf, progress, VUELTAS } from '../lib/stats'
import { ProgressBar } from './ProgressBar'
import { Badge } from './Badge'

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [])
  const lessons = useLiveQuery(() => db.lessons.toArray(), [], [])

  // Solo el temario de examen cuenta vueltas; Inglés y Métodos son evaluación continua
  const temario = subjects.filter((s) => s.mode === 'temario')
  const continua = subjects.filter((s) => s.mode !== 'temario')
  const ownOf = (id: string) => lessons.filter((l) => l.subjectId === id)
  const temarioIds = new Set(temario.map((s) => s.id))
  const global = progress(lessons.filter((l) => temarioIds.has(l.subjectId)))

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-card shadow-card p-6">
        <ProgressBar label="Avance global del temario (5 vueltas)" value={global.global} />
      </section>

      <section>
        <h2 className="text-heading mb-3">Vueltas por asignatura</h2>
        <div className="space-y-3">
          {temario.map((s) => {
            const p = progress(ownOf(s.id))
            return (
              <div key={s.id} className="bg-card rounded-card shadow-card p-4 border-l-4 space-y-3" style={{ borderLeftColor: s.color ?? 'var(--color-faint)' }}>
                <button onClick={() => onOpen(s.id)} className="w-full text-left flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-caption text-muted"><Badge subject={s} /> {s.course}{s.manual && ` · ${s.manual}`}</p>
                    <p className="font-normal truncate">{s.name}</p>
                  </div>
                  <span className="text-heading font-heading tabular-nums">{Math.round(p.global * 100)}%</span>
                  <ChevronRight size={18} className="text-faint" />
                </button>
                <div className="space-y-2 pt-2 border-t border-line">
                  {p.perVuelta.map((v, i) => <ProgressBar key={VUELTAS[i]} label={`${i + 1}L`} value={v} />)}
                </div>
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
