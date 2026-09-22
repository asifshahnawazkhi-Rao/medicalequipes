create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  post_type text not null check (post_type in ('technology', 'event', 'marketing', 'news', 'general')),
  title text not null,
  caption text not null,
  image_url text not null,
  website_url text,
  publish_facebook boolean not null default true,
  publish_instagram boolean not null default true,
  facebook_status text not null default 'not_selected',
  instagram_status text not null default 'not_selected',
  facebook_post_id text,
  instagram_post_id text,
  facebook_error text,
  instagram_error text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.social_posts enable row level security;

drop policy if exists "Admins can view social posts" on public.social_posts;
create policy "Admins can view social posts" on public.social_posts
for select to authenticated using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);

drop policy if exists "Admins can create social posts" on public.social_posts;
create policy "Admins can create social posts" on public.social_posts
for insert to authenticated with check (
  created_by = auth.uid() and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);

drop policy if exists "Admins can update social posts" on public.social_posts;
create policy "Admins can update social posts" on public.social_posts
for update to authenticated using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
) with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and lower(profiles.role::text) = 'admin'
  )
);

-- The existing public listing-images bucket is reused for social post artwork.
-- Its current authenticated-upload policy should allow paths beginning with the user's id.
