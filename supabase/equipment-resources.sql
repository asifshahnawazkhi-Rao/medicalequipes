create table if not exists public.equipment_resources (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  brand text not null default '',
  model text not null default '',
  title text not null,
  resource_type text not null check (resource_type in ('driver','software','operational_manual','service_manual','brochure','image','other')),
  description text not null default '',
  file_url text,
  external_url text,
  mime_type text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_resources_has_source check (nullif(trim(coalesce(file_url,'')), '') is not null or nullif(trim(coalesce(external_url,'')), '') is not null)
);

create index if not exists equipment_resources_search_idx on public.equipment_resources using gin (to_tsvector('simple', coalesce(brand,'') || ' ' || coalesce(model,'') || ' ' || coalesce(title,'') || ' ' || coalesce(description,'')));
alter table public.equipment_resources enable row level security;
drop policy if exists "Public can view equipment resources" on public.equipment_resources;
create policy "Public can view equipment resources" on public.equipment_resources for select using (true);
drop policy if exists "Admins manage equipment resources" on public.equipment_resources;
create policy "Admins manage equipment resources" on public.equipment_resources for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) = 'admin'));

-- Resource files may use the existing public listing-images bucket.
drop policy if exists "Admins upload resource files" on storage.objects;
create policy "Admins upload resource files" on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role::text) = 'admin'));
