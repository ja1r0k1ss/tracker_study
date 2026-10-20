import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check } from 'lucide-react'
import confetti from 'canvas-confetti'
import { db, type Lesson, type LessonStatus } from '../db/schema'
import { cascade } from '../lib/stats'
import { pushLesson } from '../db/sync'
import { Badge } from './Badge'

const STATES: [keyof LessonStatus, string][] = [
  ['notesDone', 'Apuntes'], ['underlined', 'Subrayado'],
  ['v1', '1L'], ['v2', '2L'], ['v3', '3L'], ['v4', '4L'], ['v5', '5L'],
]
const HITO: [keyof LessonStatus, string][] = [['notesDone', 'Hecho']]

async function toggle(lesson: Lesson, key: keyof LessonStatus, keys: (keyof LessonStatus)[]) {
  const status = cascade(lesson.status, key, !lesson.status[key])
  await db.lessons.update(lesson.id, { status })
  pushLesson(lesson.id)
  if (status[key] && keys.every((k) => status[k])) confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } })
}

export function SubjectView({ subjectId, onBack }: { subjectId: string; onBack: () => void }) {
  const subject = useLiveQuery(() => db.subjects.get(subjectId), [subjectId])
  const lessons = useLiveQuery(() => db.lessons.where('subjectId').equals(subjectId).sortBy('lessonNumber'), [subjectId], [])
  if (!subject) return null

  const states = subject.mode !== 'temario' ? HITO : STATES
  const parts = [...new Set(lessons.map((l) => l.partTitle))].map((p) => [p, lessons.filter((l) => l.partTitle === p)] as const)

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-4 py-2 text-body-sm">
        <ArrowLeft size={16} /> Volver
      </button>
      <div>
        <Badge subject={subject} />
        <h2 className="text-heading mt-1">{subject.name}</h2>
        <p className="text-body-sm text-muted mt-1">
          {subject.course}{subject.manual && ` · Manual: ${subject.manual}`} · {subject.classSchedule.join(', ')}
        </p>
      </div>

      {parts.map(([part, items]) => (
        <details key={part} open className="bg-card rounded-card shadow-card group">
          <summary className="cursor-pointer list-none px-4 py-3 flex justify-between items-center font-heading">
            {part}
            <span className="text-caption text-muted font-sans">{items.length} · <span className="inline-block group-open:rotate-180 transition-transform">▾</span></span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {items.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <p className="text-body-sm font-normal mb-2">{l.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {states.map(([key, label]) => (
                    <label key={key} className="cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={l.status[key]}
                        onChange={() => toggle(l, key, states.map(([k]) => k))}
                      />
                      <span className="min-w-11 h-11 px-2.5 inline-flex items-center justify-center gap-1 rounded-full border border-line text-caption font-normal transition-colors peer-checked:bg-ink peer-checked:text-on-ink peer-checked:border-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                        {l.status[key] && <Check size={12} />}{label}
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
