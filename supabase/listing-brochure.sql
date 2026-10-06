-- Run once in Supabase SQL Editor before uploading listing brochures.
alter table public.listings
add column if not exists brochure_url text;

notify pgrst, 'reload schema';
