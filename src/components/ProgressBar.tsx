export function ProgressBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between text-body-sm mb-1">
        <span>{label}</span>
        <span className="text-muted tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
