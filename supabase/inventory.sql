-- Run once in Supabase SQL Editor before using My Inventory.
alter table public.listings
add column if not exists quantity integer not null default 1;

alter table public.listings
add column if not exists stock_location text;

alter table public.listings
drop constraint if exists listings_quantity_nonnegative;

alter table public.listings
add constraint listings_quantity_nonnegative check (quantity >= 0);

-- Existing owner policy already protects updates. Recreate it safely so only
-- the logged-in seller can view/change their private dashboard inventory.
alter table public.listings enable row level security;

drop policy if exists "Owners manage own listings" on public.listings;
create policy "Owners manage own listings"
on public.listings
for all
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

notify pgrst, 'reload schema';
