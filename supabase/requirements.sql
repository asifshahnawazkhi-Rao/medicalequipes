create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  required_item text not null,
  equipment_model text not null,
  acceptable_condition text not null check (acceptable_condition in ('New', 'Used', 'Refurbished', 'Any')),
  details text not null,
  poster_name text not null,
  poster_city text,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists requirements_public_idx
  on public.requirements(status, expires_at desc, created_at desc);
create index if not exists requirements_user_idx
  on public.requirements(user_id, created_at desc);

alter table public.requirements enable row level security;

drop policy if exists "Public can view open requirements" on public.requirements;
create policy "Public can view open requirements" on public.requirements
for select to anon, authenticated
using (
  (status = 'open' and expires_at > now())
  or user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);

drop policy if exists "Users create own requirements" on public.requirements;
create policy "Users create own requirements" on public.requirements
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own requirements" on public.requirements;
create policy "Users update own requirements" on public.requirements
for update to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);

drop policy if exists "Users delete own requirements" on public.requirements;
create policy "Users delete own requirements" on public.requirements
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);
