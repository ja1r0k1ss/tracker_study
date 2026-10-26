import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedIfEmpty } from './db/seed'
import { startSync } from './db/sync'
import { registerSW } from 'virtual:pwa-register'

let theme: string | null = null
try { theme = localStorage.getItem('theme') } catch { /* modo privado */ }
document.documentElement.classList.toggle('dark', theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)

seedIfEmpty().then(startSync).catch(console.error)

// autoUpdate recarga sola al activarse un SW nuevo; iOS reanuda la PWA sin navegar, así que forzamos la comprobación al volver al frente
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update() })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
