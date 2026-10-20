-- LexTracker: ejecutar en Supabase → SQL Editor.
-- Las columnas son la versión snake_case de los campos de src/db/schema.ts.

create table if not exists public.subjects (
  id                text primary key,
  name              text not null,
  code              text not null,
  course            text not null,
  semester          int  not null,
  exam_date         text not null,  -- YYYY-MM-DD
  exam_time         text not null,  -- HH:mm (text: el tipo time devolvería HH:mm:ss)
  exam_room         text not null,
  exam_label        text not null check (exam_label in ('Examen', 'Presentación')),
  manual            text,
  type              text not null check (type in ('obligatoria', 'optativa')),
  color             text,
  mode              text not null check (mode in ('temario', 'hitos', 'adaptado')),
  class_schedule    jsonb not null default '[]',
  interactive_weeks jsonb not null default '[]'
);

create table if not exists public.lessons (
  id            bigint primary key,  -- lo asigna Dexie, no Postgres
  subject_id    text not null references public.subjects (id) on delete cascade,
  part_title    text not null,
  lesson_number int  not null,
  title         text not null,
  status        jsonb not null,
  notes         text not null default ''
);

create index if not exists lessons_subject_id_idx on public.lessons (subject_id);
create index if not exists subjects_exam_date_idx on public.subjects (exam_date);

-- Realtime: emitir los cambios de lessons a los clientes suscritos.
alter publication supabase_realtime add table public.lessons;

-- ⚠️ Sin login: cualquiera con la URL y la anon key (van dentro del JS publicado) puede leer y modificar.
-- Aceptable para un tracker personal; si añades Supabase Auth, cambia "using (true)" por una comprobación de auth.uid().
alter table public.subjects enable row level security;
alter table public.lessons  enable row level security;
create policy "anon all subjects" on public.subjects for all to anon using (true) with check (true);
create policy "anon all lessons"  on public.lessons  for all to anon using (true) with check (true);
