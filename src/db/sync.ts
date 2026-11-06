import { db, type Lesson, type StudyLog, type Subject } from './schema'
import { supabase } from '../lib/supabase'
import { fromRow, toRow } from '../lib/rows'

// Lecciones cambiadas sin confirmar en la nube (offline, error de red). Se reenvían antes de descargar.
const PENDING = 'lextracker-pending'
const readPending = (): number[] => { try { return JSON.parse(localStorage.getItem(PENDING) ?? '[]') } catch { return [] } }
const writePending = (ids: number[]) => { try { localStorage.setItem(PENDING, JSON.stringify([...new Set(ids)])) } catch { /* modo privado */ } }
// Igual para bloques: solo se suben los tocados en este dispositivo; subirlos todos pisaba con copias viejas lo editado en otro.
const PENDING_LOGS = 'lextracker-pending-logs'
const readPendingLogs = (): string[] => { try { return JSON.parse(localStorage.getItem(PENDING_LOGS) ?? '[]') } catch { return [] } }
const writePendingLogs = (ids: string[]) => { try { localStorage.setItem(PENDING_LOGS, JSON.stringify([...new Set(ids)])) } catch { /* modo privado */ } }

/** Sube o borra en la nube cada bloque pendiente según exista o no en local. */
async function flushPendingLogs() {
  const ids = readPendingLogs()
  if (!supabase || ids.length === 0) return
  const local = (await db.studyLogs.bulkGet(ids)).filter((l): l is StudyLog => !!l)
  const gone = ids.filter((id) => !local.some((l) => l.id === id))
  if (local.length) { const { error } = await supabase.from('study_logs').upsert(local.map(toRow)); if (error) throw error }
  if (gone.length) { const { error } = await supabase.from('study_logs').delete().in('id', gone); if (error) throw error }
  writePendingLogs(readPendingLogs().filter((id) => !ids.includes(id)))
}

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
  writePendingLogs([...readPendingLogs(), log.id])
  await flushPendingLogs().catch(console.error)
}

export async function deleteLog(id: string) {
  await db.studyLogs.delete(id)
  writePendingLogs([...readPendingLogs(), id])
  await flushPendingLogs().catch(console.error)
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
  writePendingLogs([])
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

  // Un solo pull a la vez: reconexiones, foco y sondeo pueden coincidir.
  let running: Promise<void> | null = null
  const resync = () => { running ??= pull(sb).catch(console.error).finally(() => { running = null }); return running }
  // Al (re)conectar el websocket se descarga todo: Realtime no reenvía lo emitido mientras estaba caído (reposo, pestaña en segundo plano, red).
  const onStatus = (s: string) => { if (s === 'SUBSCRIBED') resync() }

  sb.channel('public:lessons')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, (p) => {
      // shortcut: un cambio remoto pisa uno local aún pendiente de la misma lección; añadir updated_at si molesta
      if (p.eventType === 'DELETE') db.lessons.delete((p.old as { id: number }).id)
      else db.lessons.put(fromRow<Lesson>(p.new))
    })
    .subscribe(onStatus)
  sb.channel('public:study_logs') // canal propio: un fallo aquí no corta el de lessons
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_logs' }, (p) => {
      if (p.eventType === 'DELETE') db.studyLogs.delete((p.old as { id: string }).id)
      else db.studyLogs.put(fromRow<StudyLog>(p.new))
    })
    .subscribe(onStatus)
  sb.channel('public:subjects')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, (p) => {
      if (p.eventType === 'DELETE') db.subjects.delete((p.old as { id: string }).id)
      else db.subjects.put(fromRow<Subject>(p.new))
    })
    .subscribe(onStatus)
  // iOS corta el websocket en segundo plano y en el ordenador la ventana puede seguir visible sin foco: se descarga al volver y cada 30 s.
  addEventListener('online', resync)
  addEventListener('focus', resync)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resync() })
  setInterval(() => { if (document.visibilityState === 'visible') resync() }, 30_000)
}

/** Bloques de estudio: sube lo pendiente de este dispositivo (creado/editado/borrado offline) y luego la nube manda. */
async function syncLogs(sb: NonNullable<typeof supabase>) {
  await flushPendingLogs()
  const logs = await sb.from('study_logs').select('*')
  if (logs.error) throw logs.error
  await db.transaction('rw', db.studyLogs, async () => {
    await db.studyLogs.clear()
    await db.studyLogs.bulkAdd(logs.data.map((r) => fromRow<StudyLog>(r)))
  })
}
