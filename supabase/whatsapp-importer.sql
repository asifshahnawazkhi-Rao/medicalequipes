create table if not exists public.whatsapp_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  file_size bigint not null default 0,
  storage_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded','extracting','analyzing','review','completed','failed')),
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_import_jobs enable row level security;
create or replace function public.is_medicalequipes_admin() returns boolean language sql security definer set search_path=public stable as $$ select exists(select 1 from public.profiles where id=auth.uid() and lower(role::text)='admin'); $$;
drop policy if exists "Admins manage WhatsApp imports" on public.whatsapp_import_jobs;
create policy "Admins manage WhatsApp imports" on public.whatsapp_import_jobs for all to authenticated using (public.is_medicalequipes_admin()) with check (public.is_medicalequipes_admin());
insert into storage.buckets (id,name,public) values ('whatsapp-imports','whatsapp-imports',false) on conflict (id) do nothing;
drop policy if exists "Admins upload WhatsApp ZIPs" on storage.objects;
create policy "Admins upload WhatsApp ZIPs" on storage.objects for all to authenticated using (bucket_id='whatsapp-imports' and public.is_medicalequipes_admin()) with check (bucket_id='whatsapp-imports' and public.is_medicalequipes_admin());
