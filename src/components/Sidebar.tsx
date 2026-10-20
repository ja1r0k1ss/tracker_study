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
    <div className={`rounded-card p-4 shadow-card ${next ? 'bg-ink text-on-ink' : 'bg-card'}`}>
      <p className="text-caption opacity-70 flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: subject.color ?? 'currentColor' }} />
        {subject.examLabel}{next && ' · próximo'}
      </p>
      <h3 className="text-body font-heading mt-0.5 leading-tight">{subject.name}</h3>
      <p className="mt-3 tabular-nums">
        {days === 0 ? <span className="text-heading font-heading">Es hoy</span> : <>
          <span className="text-caption opacity-70">{days === 1 ? 'Falta ' : 'Faltan '}</span>
          <span className="text-heading font-heading">{days}</span>
          <span className="text-caption opacity-70 ml-1">{days === 1 ? 'día' : 'días'}</span>
        </>}
      </p>
      <p className="text-caption opacity-70 mt-2 flex items-center gap-1">
        <MapPin size={12} />
        {subject.examRoom} · {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} {subject.examTime}
      </p>
    </div>
  )
}

/** Calendario + cuentas atrás: panel lateral fijo en escritorio, bloque superior en móvil. */
export function Sidebar() {
  const now = useNow()
  const subjects = useLiveQuery(() => db.subjects.toArray(), [], [])
  const upcoming = subjects.filter((s) => examDateOf(s) > now).sort((a, b) => +examDateOf(a) - +examDateOf(b))

  return (
    <div className="space-y-6">
      <CalendarView subjects={subjects} today={now} />
      <section>
        <h2 className="text-heading mb-3">Cuenta atrás</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">No quedan exámenes pendientes.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {upcoming.map((s, i) => <CountdownCard key={s.id} subject={s} now={now} next={i === 0} />)}
          </div>
        )}
      </section>
    </div>
  )
}
