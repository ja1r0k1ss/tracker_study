import { db, type Lesson, type Subject } from './schema'
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
  writePending([])
}

/**
 * Arranque: reenvía lo pendiente y adopta el estado de la nube (los ids de lección de Dexie
 * difieren entre dispositivos, así que la nube manda). Si la nube está vacía, la siembra este dispositivo.
 */
export async function startSync() {
  if (!supabase) return
  const sb = supabase
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

  sb.channel('public:lessons')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, (p) => {
      // shortcut: un cambio remoto pisa uno local aún pendiente de la misma lección; añadir updated_at si molesta
      if (p.eventType === 'DELETE') db.lessons.delete((p.old as { id: number }).id)
      else db.lessons.put(fromRow<Lesson>(p.new))
    })
    .subscribe()
  addEventListener('online', () => flushPending().catch(console.error))
}
