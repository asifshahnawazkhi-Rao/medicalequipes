create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  query text not null check (char_length(query) between 2 and 120),
  result_count integer not null default 0 check (result_count >= 0),
  city text,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists search_events_created_at_idx on public.search_events (created_at desc);
create index if not exists search_events_query_lower_idx on public.search_events (lower(query));

alter table public.search_events enable row level security;

drop policy if exists "Visitors can record searches" on public.search_events;
create policy "Visitors can record searches"
on public.search_events for insert
to anon, authenticated
with check (char_length(query) between 2 and 120 and result_count >= 0);

drop policy if exists "Admins can view search insights" on public.search_events;
create policy "Admins can view search insights"
on public.search_events for select
to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
));
