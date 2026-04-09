create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  date        date not null,
  start_time  time not null,
  end_time    time not null,
  type        text not null check (type in ('school','exam','study','sport','free','other')),
  source      text not null default 'manual' check (source in ('webuntis','ai','manual')),
  color       text,
  created_at  timestamptz not null default now()
);

create index if not exists events_date_idx        on public.events (date);
create index if not exists events_source_date_idx on public.events (source, date);

alter table public.events enable row level security;
