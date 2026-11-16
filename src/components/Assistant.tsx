import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, Trash2 } from 'lucide-react'
import { db } from '../db/schema'
import { daysUntil, examDateOf, isoDate, progress, vueltasOf } from '../lib/stats'

type Msg = { role: 'user' | 'assistant'; content: string }
const KEY = 'lextracker-chat'
const load = (): Msg[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const SUGGESTIONS = ['¿Cómo voy esta semana?', '¿Qué asignatura llevo más atrasada?', '¿Qué debería priorizar hoy?']

/** Todos los datos de la app en texto compacto (CSV) para el contexto del modelo. */
async function buildContext() {
  const [subjects, lessons, logs] = await Promise.all([db.subjects.orderBy('examDate').toArray(), db.lessons.toArray(), db.studyLogs.orderBy('date').toArray()])
  const name = new Map(subjects.map((s) => [s.id, s.name]))
  const subj = subjects.map((s) => {
    const ls = lessons.filter((l) => l.subjectId === s.id)
    return `${s.id};${s.name};${s.examLabel} ${s.examDate} ${s.examTime} (faltan ${daysUntil(examDateOf(s))} días);modo ${s.mode};progreso vueltas ${Math.round(progress(ls).global * 100)}%`
  })
  const less = lessons.map((l) => `${l.subjectId};L${l.lessonNumber};${l.title};${l.status.notesDone ? 'N' : '-'}${l.status.underlined ? 'S' : '-'};v${vueltasOf(l.status)}`)
  const title = new Map(lessons.map((l) => [l.id, `L${l.lessonNumber}`]))
  const blocks = logs.map((l) => [l.date, l.startTime && `${l.startTime}-${l.endTime}`, l.totalMinutes, l.activity ?? 'estudio', l.subjectId && name.get(l.subjectId), l.lessonId && title.get(l.lessonId), l.notes].map((x) => x ?? '').join(';'))
  return `Hoy: ${isoDate(new Date())} (${new Date().toLocaleDateString('es-ES', { weekday: 'long' })})

ASIGNATURAS (id;nombre;examen;modo;progreso)
${subj.join('\n')}

LECCIONES (asignatura;lección;título;apuntes/subrayado;vueltas)
${less.join('\n')}

BLOQUES (fecha;horario;minutos;actividad;asignatura;lección;notas)
${blocks.join('\n')}`
}

export function Assistant({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(load)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(msgs)) } catch { /* modo privado */ }
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs])

  const send = async (q: string) => {
    q = q.trim()
    if (!q || busy) return
    const history: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs([...history, { role: 'assistant', content: '' }])
    setText('')
    setBusy(true)
    const write = (s: string) => setMsgs((m) => [...m.slice(0, -1), { role: 'assistant', content: s }])
    let out = ''
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ context: await buildContext(), messages: history }) })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      for (;;) { const { done, value } = await reader.read(); if (done) break; out += value; write(out) }
      if (!out) write('(Sin respuesta)')
    } catch {
      write(out + (navigator.onLine ? '\n\n⚠️ No se pudo contactar con el asistente.' : '\n\n⚠️ Sin conexión.'))
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1 h-11 rounded-full border border-line bg-card px-4 text-body-sm">
          <ArrowLeft size={16} /> Volver
        </button>
        {msgs.length > 0 && (
          <button onClick={() => setMsgs([])} disabled={busy} className="inline-flex items-center gap-1 h-11 rounded-full border border-line bg-card px-4 text-body-sm text-muted">
            <Trash2 size={16} /> Nueva charla
          </button>
        )}
      </div>
      <h2 className="text-heading">Asistente</h2>

      {msgs.length === 0 && (
        <div className="space-y-2">
          <p className="text-body-sm text-muted">Pregúntame por tu avance: conozco tus asignaturas, lecciones, vueltas y todos tus bloques registrados.</p>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="block w-full text-left rounded-card bg-card shadow-card px-3 py-2.5 text-body-sm">{s}</button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] w-fit rounded-card px-3 py-2 text-body-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'ml-auto bg-ink text-on-ink' : 'bg-card shadow-card'}`}>
            {m.content || <span className="text-muted animate-pulse">Pensando…</span>}
          </div>
        ))}
        <div ref={end} />
      </div>

      {/* Fijo encima de la barra de pestañas (h-14 + zona segura del iPhone) */}
      <form onSubmit={(e) => { e.preventDefault(); send(text) }}
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 bg-canvas/90 backdrop-blur border-t border-line">
        <div className="mx-auto max-w-2xl px-4 py-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Pregunta"
            className="flex-1 min-w-0 h-11 px-3 rounded-input border border-line bg-canvas text-body" />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="size-11 shrink-0 grid place-items-center rounded-full bg-ink text-on-ink disabled:opacity-40">
            <ArrowUp size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
