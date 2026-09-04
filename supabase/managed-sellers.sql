create table if not exists public.managed_sellers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_person text,
  phone text not null,
  city text not null,
  website text,
  source_url text,
  status text not null default 'active' check (status in ('active','inactive','claimed')),
  created_by uuid not null references public.profiles(id),
  claimed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.listings add column if not exists managed_seller_id uuid references public.managed_sellers(id);
create index if not exists listings_managed_seller_id_idx on public.listings(managed_seller_id);
alter table public.managed_sellers enable row level security;

create or replace function public.require_admin_for_managed_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.managed_seller_id is not null and not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  ) then
    raise exception 'Only an admin can publish for a managed seller';
  end if;
  return new;
end;
$$;

drop trigger if exists require_admin_for_managed_listing on public.listings;
create trigger require_admin_for_managed_listing
before insert or update of managed_seller_id on public.listings
for each row execute function public.require_admin_for_managed_listing();

drop policy if exists "Public can view active managed sellers" on public.managed_sellers;
create policy "Public can view active managed sellers" on public.managed_sellers
for select to anon, authenticated using (status in ('active','claimed'));

drop policy if exists "Admins manage managed sellers" on public.managed_sellers;
create policy "Admins manage managed sellers" on public.managed_sellers
for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'));

