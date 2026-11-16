import { useState } from 'react'
import { BarChart3, House, MessageCircle } from 'lucide-react'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { SubjectView } from './components/SubjectView'
import { Sidebar } from './components/Sidebar'
import { StudyStats } from './components/StudyHours'
import { Assistant } from './components/Assistant'

type View = 'home' | 'stats' | 'chat'

export default function App() {
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')
  const home = () => { setSubjectId(null); setView('home') }
  const go = (v: View) => { setSubjectId(null); setView(v); scrollTo(0, 0) }
  const tab = (on: boolean) => `flex-1 flex flex-col items-center justify-center gap-0.5 text-caption ${on ? 'text-fg font-semibold' : 'text-muted'}`
  return (
    <>
      <Header onHome={home} />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-12 lg:gap-8 space-y-8 lg:space-y-0">
        {/* En móvil el panel solo se ve en el inicio, para no empujar la matriz de lecciones hacia abajo */}
        <aside className={`lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:block ${subjectId || view !== 'home' ? 'hidden' : ''}`}>
          <Sidebar calendar={view !== 'stats'} />
        </aside>
        <main className="lg:col-span-8 pb-36">
          {view === 'stats' ? <StudyStats onBack={home} />
            : view === 'chat' ? <Assistant onBack={home} />
            : subjectId ? <SubjectView subjectId={subjectId} onBack={home} />
            : <Dashboard onOpen={setSubjectId} onStats={() => setView('stats')} />}
        </main>
      </div>
      {/* Barra de pestañas tipo iOS: respeta la barra de inicio del iPhone */}
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-canvas/90 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md h-14 flex">
          <button onClick={() => go('home')} aria-current={view === 'home' ? 'page' : undefined} className={tab(view === 'home')}><House size={22} />Inicio</button>
          <button onClick={() => go('stats')} aria-current={view === 'stats' ? 'page' : undefined} className={tab(view === 'stats')}><BarChart3 size={22} />Estadísticas</button>
          <button onClick={() => go('chat')} aria-current={view === 'chat' ? 'page' : undefined} className={tab(view === 'chat')}><MessageCircle size={22} />Asistente</button>
        </div>
      </nav>
    </>
  )
}
