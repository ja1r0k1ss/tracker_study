import { useRef, useState } from 'react'
import { Download, RotateCcw, Settings as SettingsIcon, Upload, X } from 'lucide-react'
import { db } from '../db/schema'
import { resetToOfficial } from '../db/seed'
import { pushAll } from '../db/sync'
import { parseBackup, type Backup } from '../lib/backup'
import { isoDate } from '../lib/stats'

async function exportBackup() {
  const [subjects, lessons, studyLogs] = await Promise.all([db.subjects.toArray(), db.lessons.toArray(), db.studyLogs.toArray()])
  const backup: Backup = { app: 'LexTracker', version: 1, exportedAt: new Date().toISOString(), subjects, lessons, studyLogs }
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `lextracker-${isoDate(new Date())}.json` })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000) // Safari cancela la descarga si se revoca en el mismo tick
}

async function restoreBackup(b: Backup) {
  await db.transaction('rw', db.subjects, db.lessons, db.studyLogs, async () => {
    await Promise.all([db.subjects.clear(), db.lessons.clear(), db.studyLogs.clear()])
    await Promise.all([db.subjects.bulkAdd(b.subjects), db.lessons.bulkAdd(b.lessons), db.studyLogs.bulkAdd(b.studyLogs)])
  })
}

const btn = 'w-full inline-flex items-center gap-2 rounded-full px-5 py-3 text-body-sm font-normal'

export function Settings({ onReset }: { onReset: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const run = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); setMsg(ok) } catch (e) { setMsg(`Error: ${(e as Error).message}`) }
  }

  const reset = () => {
    if (!confirm('Se borrará TODO tu progreso y se cargará el temario oficial. Exporta antes una copia si la necesitas. ¿Continuar?')) return
    run(async () => { await resetToOfficial(); await pushAll(); onReset() }, 'Temario oficial cargado.')
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    await run(async () => {
      const backup = parseBackup(await f.text())
      if (!confirm(`Se reemplazará tu progreso actual por la copia del ${new Date(backup.exportedAt).toLocaleString('es-ES')}. ¿Continuar?`)) throw new Error('Importación cancelada.')
      await restoreBackup(backup)
      await pushAll()
      onReset()
    }, 'Copia importada.')
    if (file.current) file.current.value = ''
  }

  return (
    <>
      <button onClick={() => { setMsg(''); dialog.current?.showModal() }} aria-label="Ajustes" className="size-10 grid place-items-center rounded-full border border-line bg-card">
        <SettingsIcon size={18} />
      </button>
      <dialog ref={dialog} className="m-auto w-[min(92vw,420px)] rounded-card bg-card text-fg p-6 shadow-card backdrop:bg-black/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading">Ajustes</h2>
          <button onClick={() => dialog.current?.close()} aria-label="Cerrar" className="size-9 grid place-items-center rounded-full hover:bg-canvas"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          <button onClick={() => run(exportBackup, 'Copia descargada.')} className={`${btn} bg-ink text-on-ink`}>
            <Download size={16} /> Exportar copia de seguridad
          </button>
          <button onClick={() => file.current?.click()} className={`${btn} border border-line`}>
            <Upload size={16} /> Importar copia de seguridad
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button onClick={reset} className={`${btn} border border-line text-red-600`}>
            <RotateCcw size={16} /> Reiniciar con temario oficial
          </button>
        </div>
        {msg && <p className="mt-4 text-body-sm text-muted" role="status">{msg}</p>}
      </dialog>
    </>
  )
}
