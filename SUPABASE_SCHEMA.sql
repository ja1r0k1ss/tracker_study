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

create table if not exists public.study_logs (
  id            text primary key,  -- uuid generado en el cliente
  subject_id    text references public.subjects (id) on delete set null,
  date          text not null,     -- YYYY-MM-DD
  start_time    text,              -- HH:mm; null si se registró solo la duración
  end_time      text,
  total_minutes int  not null check (total_minutes > 0),
  notes         text
);
-- lesson_id sin FK: reiniciar el temario recrea las lecciones con ids nuevos.
alter table public.study_logs add column if not exists activity  text;
alter table public.study_logs drop constraint if exists study_logs_activity_check;
alter table public.study_logs add constraint study_logs_activity_check check (activity in ('vueltas', 'lectura', 'apuntes', 'universidad', 'clase', 'trabajo', 'proyectos', 'debate', 'desplazamiento', 'descanso', 'dormir'));
alter table public.study_logs add column if not exists lesson_id bigint;

create index if not exists study_logs_date_idx on public.study_logs (date);
create index if not exists lessons_subject_id_idx on public.lessons (subject_id);
create index if not exists subjects_exam_date_idx on public.subjects (exam_date);

-- Realtime: emitir los cambios a los clientes suscritos.
-- Script re-ejecutable: "add table" falla si la tabla ya está en la publicación y aborta todo lo que viene detrás.
do $$
declare t text;
begin
  foreach t in array array['lessons', 'study_logs'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ⚠️ Sin login: cualquiera con la URL y la anon key (van dentro del JS publicado) puede leer y modificar.
-- Aceptable para un tracker personal; si añades Supabase Auth, cambia "using (true)" por una comprobación de auth.uid().
alter table public.subjects enable row level security;
alter table public.lessons  enable row level security;
alter table public.study_logs enable row level security;
drop policy if exists "anon all subjects"   on public.subjects;
drop policy if exists "anon all lessons"    on public.lessons;
drop policy if exists "anon all study_logs" on public.study_logs;
create policy "anon all subjects" on public.subjects for all to anon using (true) with check (true);
create policy "anon all lessons"  on public.lessons  for all to anon using (true) with check (true);
create policy "anon all study_logs" on public.study_logs for all to anon using (true) with check (true);
