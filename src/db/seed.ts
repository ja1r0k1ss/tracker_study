import { db, type Lesson, type Subject } from './schema'

const WEEKS = ['2026-10-05', '2026-10-26', '2026-11-16', '2026-12-07']

const subjects: Subject[] = [
  {
    id: 'dpc1', name: 'Derecho Procesal Civil I', code: 'DPC I', course: '4.º C2', semester: 1,
    examDate: '2027-01-19', examTime: '13:00', examRoom: 'Salón de Actos (SA)', examLabel: 'Examen',
    manual: 'Cortés Domínguez', type: 'obligatoria', mode: 'temario', color: '#3b82f6',
    classSchedule: ['Jue 10:30-12:00', 'Vie 10:30-12:00'], interactiveWeeks: WEEKS,
  },
  {
    id: 'ojp', name: 'Organización Judicial y Proceso', code: 'OJP', course: '3.er C2', semester: 1,
    examDate: '2026-12-18', examTime: '16:00', examRoom: 'Aula A1', examLabel: 'Examen',
    manual: 'Moreno Catena', type: 'obligatoria', mode: 'temario', color: '#10b981',
    classSchedule: ['Jue 16:30-18:00', 'Vie 15:30-16:30'], interactiveWeeks: WEEKS,
  },
  {
    id: 'merc3', name: 'Derecho Mercantil III', code: 'MERC III', course: '4.º C2', semester: 1,
    examDate: '2027-01-14', examTime: '13:00', examRoom: 'Aula A1', examLabel: 'Examen',
    manual: 'Broseta Pont', type: 'obligatoria', mode: 'temario', color: '#8b5cf6',
    classSchedule: ['Lun 09:00-10:30', 'Mar 09:00-10:30', 'Mié 09:00-10:00'], interactiveWeeks: WEEKS,
  },
  {
    id: 'mscn', name: 'Métodos de Solución de Conflictos y Negociación', code: 'MSCN', course: 'Optativa G2', semester: 1,
    examDate: '2026-12-17', examTime: '12:00', examRoom: 'Aula A5', examLabel: 'Presentación',
    type: 'optativa', mode: 'hitos', color: '#f59e0b',
    classSchedule: ['Lun 19:30-21:00', 'Mar 19:30-21:00'], interactiveWeeks: WEEKS,
  },
  {
    id: 'ing1', name: 'Idioma Extranjero Técnico-Jurídico I - Inglés', code: 'ING I', course: 'Optativa', semester: 1,
    examDate: '2026-12-15', examTime: '10:00', examRoom: 'Salón de Actos (SA)', examLabel: 'Examen',
    type: 'optativa', mode: 'adaptado', color: '#ec4899',
    classSchedule: ['Mar 12:00-13:30', 'Mié 11:00-12:30'], interactiveWeeks: WEEKS,
  },
]

const emptyStatus = () => ({ notesDone: false, underlined: false, v1: false, v2: false, v3: false, v4: false, v5: false })

const part = (subjectId: string, partTitle: string, prefix: string, items: [number, string][]): Omit<Lesson, 'id'>[] =>
  items.map(([n, desc]) => ({
    subjectId, partTitle, lessonNumber: n, title: `${prefix} ${n === 0 ? 'Preliminar' : n}: ${desc}`, status: emptyStatus(), notes: '',
  }))

const fmt = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

const milestones = (subjectId: string, final: string): Omit<Lesson, 'id'>[] =>
  [...WEEKS.map((w) => `Interactiva semana ${fmt(w)}`), final].map((title, i) => ({
    subjectId, partTitle: 'Entregas / hitos', lessonNumber: i + 1, title, status: emptyStatus(), notes: '',
  }))

// Programas oficiales: guías docentes USC Grado en Derecho 2026/2027 (usc.gal)
export const lessons: Omit<Lesson, 'id'>[] = [
  ...part('dpc1', 'Parte I', 'Lección', [
    [1, 'Introducción. Principios del proceso y del procedimiento. Tipos de procesos civiles'],
    [2, 'Presupuestos procesales del órgano jurisdiccional, de las partes y del objeto del proceso'],
    [3, 'El objeto del proceso civil'],
  ]),
  ...part('dpc1', 'Parte II', 'Lección', [
    [4, 'Actos previos, preparatorios y aseguratorios del proceso y de la prueba'],
    [5, 'La fase de alegaciones'],
    [6, 'La fase intermedia y la fase de juicio o vista'],
    [7, 'La fase probatoria'],
    [8, 'Los medios concretos de prueba'],
    [9, 'La fase de conclusiones y la finalización de la primera instancia'],
  ]),
  ...part('ojp', 'Temario', 'Lección', [
    [1, 'El Derecho procesal'],
    [2, 'La jurisdicción y el Poder Judicial'],
    [3, 'El Poder Judicial'],
    [4, 'La exigencia constitucional del ejercicio de la jurisdicción: la exclusividad'],
    [5, 'Los límites de la jurisdicción española'],
    [6, 'Los órganos jurisdiccionales: los órganos judiciales y el Tribunal Constitucional'],
    [7, 'El gobierno del Poder Judicial'],
    [8, 'Las garantías constitucionales de los jueces y magistrados'],
    [9, 'El estatuto de jueces y magistrados'],
    [10, 'La oficina judicial, los Letrados de la Administración de Justicia y el personal al servicio de la Admin. de Justicia'],
    [11, 'El Ministerio Fiscal'],
    [12, 'Los abogados y procuradores'],
    [13, 'El derecho a la tutela judicial efectiva'],
    [14, 'El derecho de asistencia jurídica gratuita'],
    [15, 'El proceso'],
    [16, 'Los actos procesales'],
    [17, 'Actos de comunicación y de auxilio judicial'],
  ]),
  ...part('merc3', 'Preliminar', 'Tema', [
    [0, 'La empresa y su actividad económica'],
  ]),
  ...part('merc3', 'Parte I: Los contratos del empresario', 'Tema', [
    [1, 'Los contratos mercantiles: concepto y caracteres esenciales'],
    [2, 'Contratos de cambio y auxiliares: el comercio tradicional. La compraventa mercantil'],
    [3, 'El contrato de comisión y mediación o corretaje'],
    [4, 'Contratos de distribución y afines: el comercio integrado'],
    [5, 'El contrato de agencia'],
    [6, 'Contratos de prestación: los arrendamientos mercantiles y publicitarios'],
    [7, 'Los contratos de financiación y garantía'],
    [8, 'Los contratos de transporte y depósito'],
    [9, 'Contratos de seguro'],
  ]),
  ...part('merc3', 'Parte II: Medios e instrumentos de pago', 'Tema', [
    [10, 'El pago de las operaciones mercantiles y títulos-valor'],
    [11, 'La letra de cambio, el pagaré cambiario y el cheque'],
    [12, 'El libramiento de efectos mercantiles'],
    [13, 'La circulación de los efectos mercantiles'],
    [14, 'La aceptación de los efectos mercantiles'],
    [15, 'El aval de los efectos mercantiles'],
    [16, 'El pago de los efectos mercantiles'],
    [17, 'Acciones y excepciones cambiarias'],
    [18, 'Pagos a través de dinero bancario'],
  ]),
  ...part('merc3', 'Parte Tercera: Derecho concursal', 'Tema', [
    [19, 'El Derecho concursal'],
    [20, 'Fase de apertura del concurso'],
    [21, 'Fase de tramitación del concurso'],
    [22, 'Fase de solución del concurso'],
  ]),
  ...milestones('mscn', 'Presentación final 17/Dic'),
  ...milestones('ing1', 'Examen final 15/Dic'),
]

const insertSeed = async () => {
  await db.subjects.bulkAdd(subjects)
  await db.lessons.bulkAdd(lessons as Lesson[])
}

export async function seedIfEmpty() {
  await db.transaction('rw', db.subjects, db.lessons, async () => {
    if ((await db.subjects.count()) === 0) await insertSeed()
  })
}

/** Borra TODO (incluido el progreso y los registros de estudio) y recarga el temario oficial. */
export async function resetToOfficial() {
  await db.transaction('rw', db.subjects, db.lessons, db.studyLogs, async () => {
    await Promise.all([db.subjects.clear(), db.lessons.clear(), db.studyLogs.clear()])
    await insertSeed()
  })
}
