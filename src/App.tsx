import { useState } from 'react'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { SubjectView } from './components/SubjectView'
import { Sidebar } from './components/Sidebar'
import { StudyStats } from './components/StudyHours'

export default function App() {
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [stats, setStats] = useState(false)
  const home = () => { setSubjectId(null); setStats(false) }
  return (
    <>
      <Header onHome={home} />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-12 lg:gap-8 space-y-8 lg:space-y-0">
        {/* En móvil el panel solo se ve en el inicio, para no empujar la matriz de lecciones hacia abajo */}
        <aside className={`lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:block ${subjectId || stats ? 'hidden' : ''}`}>
          <Sidebar calendar={!stats} />
        </aside>
        <main className="lg:col-span-8">
          {stats ? <StudyStats onBack={home} />
            : subjectId ? <SubjectView subjectId={subjectId} onBack={home} />
            : <Dashboard onOpen={setSubjectId} onStats={() => setStats(true)} />}
        </main>
      </div>
    </>
  )
}
