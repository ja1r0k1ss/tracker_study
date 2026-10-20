import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import type { Subject } from '../db/schema'
import { isoDate, monthGrid } from '../lib/stats'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
// shortcut: semestre fijo 2026/27 (oct–ene), cambiar al empezar el siguiente semestre
const SEMESTER: [number, number][] = [[2026, 9], [2026, 10], [2026, 11], [2027, 0]]

export function CalendarView({ subjects, today }: { subjects: Subject[]; today: Date }) {
  const [selected, setSelected] = useState<string | null>(null)

  const examsOn = (iso: string) => subjects.filter((s) => s.examDate === iso)
  const todayIso = isoDate(today)
  const selectedExams = selected ? examsOn(selected) : []

  // Móvil: carrusel de un mes con scroll-snap; en sm+ el contenedor es un grid y esto no aplica
  const track = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })
  useEffect(() => {
    const i = SEMESTER.findIndex(([y, m]) => y === today.getFullYear() && m === today.getMonth())
    if (i > 0 && track.current) track.current.scrollLeft = i * track.current.clientWidth
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- solo al montar

  return (
    <section className="bg-card rounded-card shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-heading-sm">Calendario del semestre</h2>
        <div className="flex gap-1 sm:hidden">
          <button onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Mes anterior"
            className="p-1 rounded-full hover:bg-canvas disabled:opacity-30"><ChevronLeft size={18} /></button>
          <button onClick={() => goTo(page + 1)} disabled={page === SEMESTER.length - 1} aria-label="Mes siguiente"
            className="p-1 rounded-full hover:bg-canvas disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div
        ref={track}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] sm:grid sm:gap-5 sm:grid-cols-2 sm:overflow-visible lg:grid-cols-1"
      >
        {SEMESTER.map(([y, m]) => (
          <div key={`${y}-${m}`} className="w-full shrink-0 snap-start">
            <h3 className="text-body-sm font-heading capitalize mb-1">
              {new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => <span key={d} className="text-caption text-faint py-1">{d}</span>)}
              {monthGrid(y, m).map((date, i) => {
                if (!date) return <span key={`gap-${i}`} />
                const iso = isoDate(date)
                const exams = examsOn(iso)
                const isToday = iso === todayIso
                const color = exams[0]?.color ?? 'var(--color-ink)'
                return (
                  <button
                    key={iso}
                    onClick={() => setSelected(exams.length ? (selected === iso ? null : iso) : null)}
                    title={exams.map((s) => `${s.examLabel} ${s.name} · ${s.examTime} · ${s.examRoom}`).join('\n') || undefined}
                    aria-label={`${date.getDate()}${exams.length ? `: ${exams.map((s) => `${s.name}, ${s.examRoom}`).join('; ')}` : ''}${isToday ? ' (hoy)' : ''}`}
                    className={`aspect-square rounded-full grid place-items-center text-body-sm tabular-nums
                      ${isToday ? 'ring-2 ring-red-500 font-semibold' : ''}
                      ${exams.length ? 'cursor-pointer text-white font-semibold hover:opacity-80' : 'cursor-default'}
                      ${selected === iso ? 'outline-2 outline-offset-2 outline-fg' : ''}`}
                    style={exams.length ? { background: color } : undefined}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedExams.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-line pt-3" aria-live="polite">
          {selectedExams.map((s) => (
            <li key={s.id} className="flex items-start gap-2 text-body-sm">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: s.color ?? 'var(--color-ink)' }} />
              <div>
                <p className="font-normal">{s.examLabel} · {s.name}</p>
                <p className="text-caption text-muted flex items-center gap-1"><MapPin size={12} />{s.examTime} · {s.examRoom}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
