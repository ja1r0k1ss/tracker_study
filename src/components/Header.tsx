import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Moon, Sun } from 'lucide-react'
import { db } from '../db/schema'
import { isInteractiveWeek } from '../lib/stats'
import { Settings } from './Settings'

export function Header({ onHome }: { onHome: () => void }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const weeks = useLiveQuery(() => db.subjects.toArray().then((s) => s.flatMap((x) => x.interactiveWeeks)), [], [])
  const interactive = isInteractiveWeek(weeks)

  const toggleTheme = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* modo privado */ }
    setDark(next)
  }

  return (
    <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-2">
        <button onClick={onHome} className="text-heading-sm font-heading font-semibold">LexTracker</button>
        <span className={`ml-auto rounded-full px-3 whitespace-nowrap py-1 text-caption font-normal ${interactive ? 'bg-accent-bg text-accent' : 'bg-card text-muted'}`}>
          {interactive ? <><span className="hidden sm:inline">Semana </span>Interactiva 🔄</> : 'Ordinaria 📖'}
        </span>
        <button
          onClick={toggleTheme}
          aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
          className="size-10 grid place-items-center rounded-full bg-ink text-on-ink"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Settings onReset={onHome} />
      </div>
    </header>
  )
}
