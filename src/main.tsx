import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedIfEmpty } from './db/seed'
import { startSync } from './db/sync'

let theme: string | null = null
try { theme = localStorage.getItem('theme') } catch { /* modo privado */ }
document.documentElement.classList.toggle('dark', theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)

seedIfEmpty().then(startSync).catch(console.error)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
