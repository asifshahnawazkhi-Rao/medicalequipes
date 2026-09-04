alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

drop policy if exists "Authenticated users create own listings" on public.listings;
create policy "Authenticated users create own listings"
on public.listings
for insert
to authenticated
with check (
  seller_id = auth.uid()
  and (
    managed_seller_id is null
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and lower(profiles.role::text) = 'admin'
    )
  )
);

drop policy if exists "Owners manage own listings" on public.listings;
create policy "Owners manage own listings"
on public.listings
for all
to authenticated
using (seller_id = auth.uid())
with check (seller_id = auth.uid());

drop policy if exists "Owners manage own listing image rows" on public.listing_images;
create policy "Owners manage own listing image rows"
on public.listing_images
for all
to authenticated
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
);

drop policy if exists "Owners manage own listing image files" on storage.objects;
create policy "Owners manage own listing image files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.listings
    where listings.id::text = (storage.foldername(name))[2]
      and listings.seller_id = auth.uid()
  )
);

