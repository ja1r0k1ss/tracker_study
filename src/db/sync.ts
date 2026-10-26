import { db, type Lesson, type StudyLog, type Subject } from './schema'
import { supabase } from '../lib/supabase'
import { fromRow, toRow } from '../lib/rows'

// Lecciones cambiadas sin confirmar en la nube (offline, error de red). Se reenvían antes de descargar.
const PENDING = 'lextracker-pending'
const readPending = (): number[] => { try { return JSON.parse(localStorage.getItem(PENDING) ?? '[]') } catch { return [] } }
const writePending = (ids: number[]) => { try { localStorage.setItem(PENDING, JSON.stringify([...new Set(ids)])) } catch { /* modo privado */ } }

async function flushPending() {
  const ids = readPending()
  if (!supabase || ids.length === 0) return
  const lessons = (await db.lessons.bulkGet(ids)).filter((l): l is Lesson => !!l)
  const { error } = await supabase.from('lessons').upsert(lessons.map(toRow))
  if (error) throw error
  writePending(readPending().filter((id) => !ids.includes(id)))
}

/** Llamar tras guardar una lección en Dexie. */
export async function pushLesson(id: number) {
  if (!supabase) return
  writePending([...readPending(), id])
  await flushPending().catch(console.error)
}

/** Guarda un bloque de estudio en local y en la nube. */
export async function saveLog(log: StudyLog) {
  await db.studyLogs.put(log)
  if (supabase) await supabase.from('study_logs').upsert(toRow(log)).then(({ error }) => error && console.error(error))
}

// shortcut: un borrado offline no llega a la nube y el bloque reaparece en el próximo arranque; añadir cola de borrados si molesta
export async function deleteLog(id: string) {
  await db.studyLogs.delete(id)
  if (supabase) await supabase.from('study_logs').delete().eq('id', id).then(({ error }) => error && console.error(error))
}

/** Sube todo el estado local y borra en la nube lo que ya no existe (tras reiniciar o importar). */
export async function pushAll() {
  if (!supabase) return
  const [subjects, lessons] = await Promise.all([db.subjects.toArray(), db.lessons.toArray()])
  const r1 = await supabase.from('subjects').upsert(subjects.map(toRow))
  if (r1.error) throw r1.error
  const r2 = await supabase.from('lessons').upsert(lessons.map(toRow))
  if (r2.error) throw r2.error
  const r3 = await supabase.from('lessons').delete().not('id', 'in', `(${lessons.map((l) => l.id).join(',') || 0})`)
  if (r3.error) throw r3.error
  const r4 = await supabase.from('subjects').delete().not('id', 'in', `(${subjects.map((s) => `"${s.id}"`).join(',') || '""'})`)
  if (r4.error) throw r4.error
  const logs = await db.studyLogs.toArray()
  const r5 = await supabase.from('study_logs').upsert(logs.map(toRow))
  if (r5.error) throw r5.error
  const r6 = await supabase.from('study_logs').delete().not('id', 'in', `(${logs.map((l) => `"${l.id}"`).join(',') || '""'})`)
  if (r6.error) throw r6.error
  writePending([])
}

/**
 * Reenvía lo pendiente y adopta el estado de la nube (los ids de lección de Dexie
 * difieren entre dispositivos, así que la nube manda). Si la nube está vacía, la siembra este dispositivo.
 */
async function pull(sb: NonNullable<typeof supabase>) {
  await flushPending()
  const [s, l] = await Promise.all([sb.from('subjects').select('*'), sb.from('lessons').select('*')])
  if (s.error) throw s.error
  if (l.error) throw l.error
  if (l.data.length === 0) {
    await pushAll()
  } else {
    await db.transaction('rw', db.subjects, db.lessons, async () => {
      await Promise.all([db.subjects.clear(), db.lessons.clear()])
      await db.subjects.bulkAdd(s.data.map((r) => fromRow<Subject>(r)))
      await db.lessons.bulkAdd(l.data.map((r) => fromRow<Lesson>(r)))
    })
  }
  // Aparte: si falta la tabla study_logs en Supabase, el resto de la sincronización sigue funcionando.
  await syncLogs(sb).catch(console.error)
}

export async function startSync() {
  if (!supabase) return
  const sb = supabase
  await pull(sb)

  sb.channel('public:lessons')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, (p) => {
      // shortcut: un cambio remoto pisa uno local aún pendiente de la misma lección; añadir updated_at si molesta
      if (p.eventType === 'DELETE') db.lessons.delete((p.old as { id: number }).id)
      else db.lessons.put(fromRow<Lesson>(p.new))
    })
    .subscribe()
  sb.channel('public:study_logs') // canal propio: un fallo aquí no corta el de lessons
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_logs' }, (p) => {
      if (p.eventType === 'DELETE') db.studyLogs.delete((p.old as { id: string }).id)
      else db.studyLogs.put(fromRow<StudyLog>(p.new))
    })
    .subscribe()
  // iOS corta el websocket con la app en segundo plano y Realtime no reenvía lo perdido: al volver, se descarga de nuevo.
  const resync = () => pull(sb).catch(console.error)
  addEventListener('online', resync)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resync() })
}

/** Bloques de estudio: unión (sube lo creado offline) y luego la nube manda. */
async function syncLogs(sb: NonNullable<typeof supabase>) {
  const up = await sb.from('study_logs').upsert((await db.studyLogs.toArray()).map(toRow))
  if (up.error) throw up.error
  const logs = await sb.from('study_logs').select('*')
  if (logs.error) throw logs.error
  await db.transaction('rw', db.studyLogs, async () => {
    await db.studyLogs.clear()
    await db.studyLogs.bulkAdd(logs.data.map((r) => fromRow<StudyLog>(r)))
  })
}
