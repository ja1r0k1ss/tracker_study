import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { MapPin } from 'lucide-react'
import { db, type Subject } from '../db/schema'
import { daysUntil, examDateOf } from '../lib/stats'
import { CalendarView } from './CalendarView'

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function CountdownCard({ subject, now, next }: { subject: Subject; now: Date; next: boolean }) {
  const date = examDateOf(subject)
  const days = daysUntil(date, now)
  return (
    <div className={`rounded-card px-3 py-2 sm:p-4 shadow-card w-[62%] shrink-0 snap-start sm:w-auto ${next ? 'bg-ink text-on-ink' : 'bg-card'}`}>
      <p className="text-caption opacity-70 flex items-center gap-1.5">
        <span className="size-1.5 sm:size-2 rounded-full" style={{ background: subject.color ?? 'currentColor' }} />
        {subject.examLabel}{next && ' · próximo'}
      </p>
      <div className="flex items-baseline justify-between gap-2 sm:block">
        <h3 className="text-body-sm sm:text-body font-heading sm:mt-0.5 leading-tight truncate sm:whitespace-normal">{subject.name}</h3>
        <p className="sm:mt-3 tabular-nums shrink-0">
          {days === 0 ? <span className="text-body sm:text-heading font-heading">Es hoy</span> : <>
            <span className="hidden sm:inline text-caption opacity-70">{days === 1 ? 'Falta ' : 'Faltan '}</span>
            <span className="text-body sm:text-heading font-heading">{days}</span>
            <span className="text-caption opacity-70 ml-1">{days === 1 ? 'día' : 'días'}</span>
          </>}
        </p>
      </div>
      <p className="text-caption opacity-70 mt-0.5 sm:mt-2 flex items-center gap-1 truncate">
        <MapPin size={12} className="hidden sm:block shrink-0" />
        {subject.examRoom} · {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {subject.examTime}
      </p>
    </div>
  )
}

/** Calendario + cuentas atrás: panel lateral fijo en escritorio, bloque superior en móvil. */
// calendar=false en estadísticas: allí ya está "Constancia hasta exámenes"
export function Sidebar({ calendar = true }: { calendar?: boolean }) {
  const now = useNow()
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [])
  const upcoming = subjects.filter((s) => examDateOf(s) > now).sort((a, b) => +examDateOf(a) - +examDateOf(b))

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {calendar && <CalendarView subjects={subjects} today={now} />}
      {/* En móvil va arriba como banner deslizable */}
      <section className="order-first lg:order-none">
        <h2 className="text-body-sm sm:text-heading mb-1.5 sm:mb-3">Cuenta atrás</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">No quedan exámenes pendientes.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] sm:grid sm:gap-3 sm:grid-cols-2 sm:overflow-visible lg:grid-cols-1">
            {upcoming.map((s, i) => <CountdownCard key={s.id} subject={s} now={now} next={i === 0} />)}
          </div>
        )}
      </section>
    </div>
  )
}
