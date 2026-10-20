// Ejecutar: node src/lib/stats.test.ts
import assert from 'node:assert/strict'
import { daysUntil, isInteractiveWeek, progress } from './stats.ts'

const s = (v1: boolean, v2: boolean) => ({ status: { notesDone: false, underlined: false, v1, v2, v3: false, v4: false, v5: false } })
const p = progress([s(true, true), s(true, false)])
assert.deepEqual(p.perVuelta, [1, 0.5, 0, 0, 0])
assert.equal(p.global, 0.3)
assert.equal(progress([]).global, 0)

const weeks = ['2026-10-05']
assert.equal(isInteractiveWeek(weeks, new Date('2026-10-05T00:00')), true)
assert.equal(isInteractiveWeek(weeks, new Date('2026-10-11T23:59')), true)
assert.equal(isInteractiveWeek(weeks, new Date('2026-10-12T00:00')), false)
assert.equal(isInteractiveWeek(weeks, new Date('2026-10-04T23:59')), false)

assert.equal(daysUntil(new Date('2026-10-22T13:05'), new Date('2026-10-20T12:00')), 2)
assert.equal(daysUntil(new Date('2026-10-21T09:00'), new Date('2026-10-20T23:00')), 1)
assert.equal(daysUntil(new Date('2026-11-02T00:00'), new Date('2026-10-20T00:00')), 13) // cruza cambio de hora
assert.equal(daysUntil(new Date(0), new Date()), 0)
console.log('stats ok')

// cascada
import { cascade, monthGrid } from './stats.ts'
const empty = s(false, false).status
assert.deepEqual(cascade(empty, 'v3', true), { notesDone: true, underlined: true, v1: true, v2: true, v3: true, v4: false, v5: false })
const full = { notesDone: true, underlined: true, v1: true, v2: true, v3: true, v4: true, v5: true }
assert.deepEqual(cascade(full, 'v2', false), { notesDone: true, underlined: true, v1: true, v2: false, v3: false, v4: false, v5: false })
assert.deepEqual(cascade(full, 'notesDone', false), empty)

// calendario: octubre 2026 empieza en jueves → 3 huecos (L, M, X)
const oct = monthGrid(2026, 9)
assert.equal(oct.filter((d) => d === null).length, 3)
assert.equal(oct.length, 3 + 31)

// backup
import { parseBackup } from './backup.ts'
assert.throws(() => parseBackup('no json'), /JSON/)
assert.throws(() => parseBackup('{"app":"otra","version":1}'), /LexTracker/)
assert.throws(() => parseBackup(JSON.stringify({ app: 'LexTracker', version: 1, subjects: [{ id: 'a', name: 'A' }], lessons: [{ id: 1, subjectId: 'zz', status: {} }], studyLogs: [] })), /Lecciones/)
const ok = parseBackup(JSON.stringify({ app: 'LexTracker', version: 1, exportedAt: '', subjects: [{ id: 'a', name: 'A' }], lessons: [{ id: 1, subjectId: 'a', status: {} }], studyLogs: [] }))
assert.equal(ok.lessons.length, 1)
console.log('cascade/calendar/backup ok')

// filas Supabase
import { fromRow, toRow } from './rows.ts'
const lesson = { id: 3, subjectId: 'a', partTitle: 'P', lessonNumber: 1, title: 't', status: { notesDone: true }, notes: '' }
assert.deepEqual(toRow(lesson), { id: 3, subject_id: 'a', part_title: 'P', lesson_number: 1, title: 't', status: { notesDone: true }, notes: '' })
assert.deepEqual(fromRow(toRow(lesson)), lesson)
assert.deepEqual(fromRow({ id: 'x', manual: null, exam_date: '2027-01-14' }), { id: 'x', examDate: '2027-01-14' })
console.log('rows ok')
