import type { Subject } from '../db/schema'

export const Badge = ({ subject }: { subject: Subject }) => (
  <span className="inline-block rounded-full px-2 py-0.5 text-caption font-semibold text-white" style={{ background: subject.color ?? 'var(--color-faint)' }}>
    {subject.code}
  </span>
)
