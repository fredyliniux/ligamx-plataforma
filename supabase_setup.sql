-- Script de Configuración de Base de Datos para Supabase
-- Copia y pega este script en el editor SQL de tu panel de control de Supabase (https://supabase.com)

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 1. CREACIÓN DE TABLAS

-- Tabla de Configuración Global
create table if not exists public.settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Participantes
create table if not exists public.participants (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    phone text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Selecciones (Tómbola/Mundial)
create table if not exists public.teams (
    id serial primary key,
    name text not null unique,
    confederation text,
    flag_emoji text
);

-- Tabla de Boletos (Tómbola)
create table if not exists public.tickets (
    id uuid default gen_random_uuid() primary key,
    participant_id uuid references public.participants(id) on delete cascade not null,
    payment_status text default 'pending' check (payment_status in ('pending', 'confirmed')),
    payment_receipt_url text,
    assigned_team text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Partidos (Quiniela)
create table if not exists public.matches (
    id serial primary key,
    jornada integer not null,
    local_team text not null,
    visitor_team text not null,
    match_date timestamp with time zone not null,
    score_local integer,
    score_visitor integer,
    result text check (result in ('L', 'E', 'V')),
    status text default 'pending' check (status in ('pending', 'finished')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Inscripciones a Quiniela (por Jornada)
create table if not exists public.quiniela_registrations (
    id uuid default gen_random_uuid() primary key,
    participant_id uuid references public.participants(id) on delete cascade not null,
    jornada integer not null,
    payment_status text default 'pending' check (payment_status in ('pending', 'confirmed')),
    payment_receipt_url text,
    quiniela_image_url text,
    points integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (participant_id, jornada)
);

-- Tabla de Pronósticos (Digitales)
create table if not exists public.quiniela_forecasts (
    id uuid default gen_random_uuid() primary key,
    registration_id uuid references public.quiniela_registrations(id) on delete cascade not null,
    match_id integer references public.matches(id) on delete cascade not null,
    prediction text not null check (prediction in ('L', 'E', 'V')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (registration_id, match_id)
);

-- 2. FUNCIÓN Y TRIGGER PARA CÁLCULO AUTOMÁTICO DE PUNTOS
-- Calcula los aciertos de cada participante en una jornada y los guarda en la tabla quiniela_registrations.
create or replace function public.recalculate_quiniela_points(p_jornada integer)
returns void as $$
declare
    r record;
    v_points integer;
begin
    for r in 
        select id from public.quiniela_registrations where jornada = p_jornada
    loop
        select count(*) into v_points
        from public.quiniela_forecasts f
        join public.matches m on f.match_id = m.id
        where f.registration_id = r.id
          and m.jornada = p_jornada
          and m.status = 'finished'
          and f.prediction = m.result;

        update public.quiniela_registrations
        set points = v_points
        where id = r.id;
    end loop;
end;
$$ language plpgsql security definer;

-- Trigger que ejecuta el recálculo cuando se cambia el resultado de un partido
create or replace function public.on_match_result_update()
returns trigger as $$
begin
    if (TG_OP = 'UPDATE' and (old.result is distinct from new.result or old.status is distinct from new.status or old.score_local is distinct from new.score_local or old.score_visitor is distinct from new.score_visitor)) then
        perform public.recalculate_quiniela_points(new.jornada);
    end if;
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger trigger_match_result_update
after update on public.matches
for each row
execute function public.on_match_result_update();

-- 3. HABILITACIÓN DE ALMACENAMIENTO (STORAGE BUCKETS)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('quinielas', 'quinielas', true)
on conflict (id) do nothing;

-- 4. POLÍTICAS DE ACCESO PÚBLICO (RLS deshabilitado/permitido para facilidad en esta plataforma)
-- Para simplificar la administración entre amigos y conocidos sin registros con login de email,
-- habilitamos lectura y escritura pública en las tablas.
alter table public.settings disable row level security;
alter table public.participants disable row level security;
alter table public.teams disable row level security;
alter table public.tickets disable row level security;
alter table public.matches disable row level security;
alter table public.quiniela_registrations disable row level security;
alter table public.quiniela_forecasts disable row level security;

-- Habilitar permisos de almacenamiento en storage.objects
create policy "Permitir todo en receipts para usuarios anonimos" on storage.objects
    for all using (bucket_id = 'receipts') with check (bucket_id = 'receipts');

create policy "Permitir todo en quinielas para usuarios anonimos" on storage.objects
    for all using (bucket_id = 'quinielas') with check (bucket_id = 'quinielas');

-- 5. SEMILLAS (PRE-SEEDING DATA)

-- Insertar Selecciones del Mundial 2026 (48 Países)
insert into public.teams (name, confederation, flag_emoji) values
('Canadá', 'Concacaf', '🇨🇦'),
('México', 'Concacaf', '🇲🇽'),
('Estados Unidos', 'Concacaf', '🇺🇸'),
('Australia', 'AFC', '🇦🇺'),
('Irak', 'AFC', '🇮🇶'),
('Irán', 'AFC', '🇮🇷'),
('Japón', 'AFC', '🇯🇵'),
('Jordania', 'AFC', '🇯🇴'),
('Corea del Sur', 'AFC', '🇰🇷'),
('Catar', 'AFC', '🇶🇦'),
('Arabia Saudita', 'AFC', '🇸🇦'),
('Uzbekistán', 'AFC', '🇺🇿'),
('Argelia', 'CAF', '🇩🇿'),
('Cabo Verde', 'CAF', '🇨🇻'),
('R.D. Congo', 'CAF', '🇨🇩'),
('Costa de Marfil', 'CAF', '🇨🇮'),
('Egipto', 'CAF', '🇪🇬'),
('Ghana', 'CAF', '🇬🇭'),
('Marruecos', 'CAF', '🇲🇦'),
('Senegal', 'CAF', '🇸🇳'),
('Sudáfrica', 'CAF', '🇿🇦'),
('Túnez', 'CAF', '🇹🇳'),
('Curazao', 'Concacaf', '🇨🇼'),
('Haití', 'Concacaf', '🇭🇹'),
('Panamá', 'Concacaf', '🇵🇦'),
('Argentina', 'CONMEBOL', '🇦🇷'),
('Brasil', 'CONMEBOL', '🇧🇷'),
('Colombia', 'CONMEBOL', '🇨🇴'),
('Ecuador', 'CONMEBOL', '🇪🇨'),
('Paraguay', 'CONMEBOL', '🇵🇾'),
('Uruguay', 'CONMEBOL', '🇺🇾'),
('Nueva Zelanda', 'OFC', '🇳🇿'),
('Austria', 'UEFA', '🇦🇹'),
('Bélgica', 'UEFA', '🇧🇪'),
('Bosnia y Herzegovina', 'UEFA', '🇧🇦'),
('Croacia', 'UEFA', '🇭🇷'),
('Chequia', 'UEFA', '🇨🇿'),
('Inglaterra', 'UEFA', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
('Francia', 'UEFA', '🇫🇷'),
('Alemania', 'UEFA', '🇩🇪'),
('Países Bajos', 'UEFA', '🇳🇱'),
('Noruega', 'UEFA', '🇳🇴'),
('Portugal', 'UEFA', '🇵🇹'),
('Escocia', 'UEFA', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
('España', 'UEFA', '🇪🇸'),
('Suecia', 'UEFA', '🇸🇪'),
('Suiza', 'UEFA', '🇨🇭'),
('Turquía', 'UEFA', '🇹🇷')
on conflict (name) do nothing;

-- Insertar Partidos para la Jornada 1
insert into public.matches (jornada, local_team, visitor_team, match_date, score_local, score_visitor, result, status) values
(1, 'México', 'Sudáfrica', '2026-06-11 15:30:00+00', null, null, null, 'pending'),
(1, 'Corea del Sur', 'Chequia', '2026-06-11 18:00:00+00', null, null, null, 'pending'),
(1, 'Canadá', 'Bosnia y Herzegovina', '2026-06-12 16:00:00+00', null, null, null, 'pending'),
(1, 'Estados Unidos', 'Paraguay', '2026-06-12 19:00:00+00', null, null, null, 'pending'),
(1, 'Catar', 'Suiza', '2026-06-13 14:00:00+00', null, null, null, 'pending'),
(1, 'Brasil', 'Marruecos', '2026-06-13 17:00:00+00', null, null, null, 'pending'),
(1, 'Haití', 'Escocia', '2026-06-13 20:00:00+00', null, null, null, 'pending')
on conflict do nothing;

-- Insertar Configuración Inicial
insert into public.settings (key, value) values
('bank_details_tombola', '{"banco": "BBVA", "cuenta": "046 502 1227", "clabe": "012 180 00465021227 5", "titular": "Fredy Reyes Sánchez", "zelle": "3235575050", "zelle_titular": "Fredy Reyes Sánchez", "zelle_usd": 6}'),
('bank_details_quiniela', '{"banco": "NU MÉXICO", "cuenta": "01011741555", "clabe": "638180010117415556", "titular": "MANUEL ALEJANDRO HERNÁNDEZ COMPEÁN"}'),
('prices', '{"ticket_tombola": 100, "jornada_quiniela": 100}'),
('links', '{"live_stream": "https://zoom.us/j/tu-reunion-id", "rules": ""}'),
('tombola_status', '{"drawn": false, "draw_date": "2026-06-10T22:00:00-06:00", "drawn_by": null}')
on conflict (key) do update set value = excluded.value;

