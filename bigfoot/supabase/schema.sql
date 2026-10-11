-- Bigfoot Sightings database setup.
-- Paste this whole file into the Supabase SQL editor and tap Run.
--
-- BEFORE YOU RUN THIS:
-- Replace PUT-YOUR-EMAIL-HERE@example.com with your own email.
-- That line is near the top, just under "who can approve reports".
-- Use the same email you can open on your phone.
--
-- The website uses the public anon / publishable key.
-- Never put a service_role key or a secret key (sb_secret_) in the website.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Who can approve reports.
create table if not exists public.admins (
  email text primary key
);

-- >>> Change this email, then run the file. <<<
insert into public.admins (email)
values (lower('PUT-YOUR-EMAIL-HERE@example.com'))
on conflict (email) do nothing;

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  seen_at timestamptz not null,
  kind text not null,
  description text not null,
  confidence smallint not null,
  photo_url text,
  display_name text,
  status text not null default 'pending',
  -- Honeypot. Real reports leave this empty. The app never shows it.
  honeypot text,
  constraint sightings_lat_range check (lat >= -90 and lat <= 90),
  constraint sightings_lng_range check (lng >= -180 and lng <= 180),
  constraint sightings_kind_check check (kind in ('saw', 'heard', 'tracks', 'smell', 'other')),
  constraint sightings_description_length check (char_length(btrim(description)) between 8 and 2000),
  constraint sightings_confidence_range check (confidence between 1 and 5),
  constraint sightings_status_check check (status in ('pending', 'approved')),
  constraint sightings_name_length check (display_name is null or char_length(display_name) between 1 and 80),
  constraint sightings_photo_url check (
    photo_url is null
    or (photo_url ~ '^https://' and char_length(photo_url) <= 400)
  ),
  constraint sightings_honeypot_empty check (honeypot is null or honeypot = '')
);

create index if not exists sightings_status_seen_idx
  on public.sightings (status, seen_at desc);

create index if not exists sightings_created_idx
  on public.sightings (created_at desc);

-- True only when the signed-in person's email is in admins.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- New reports stay pending, empty honeypots are rejected, and a burst of
-- inserts is slowed down. This runs in the database, not only in the page.
create or replace function private.guard_sighting_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if new.status is distinct from 'pending' then
    raise exception 'New reports must be pending';
  end if;

  if new.honeypot is not null and btrim(new.honeypot) <> '' then
    raise exception 'Could not save this report';
  end if;

  new.status := 'pending';
  new.honeypot := null;
  new.created_at := now();
  new.description := btrim(new.description);

  if new.display_name is not null then
    new.display_name := nullif(btrim(new.display_name), '');
  end if;

  select count(*) into recent_count
  from public.sightings
  where created_at > now() - interval '10 minutes';

  if recent_count >= 40 then
    raise exception 'Too many reports right now. Please wait a few minutes and try again.';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_sighting_insert() from public;
grant execute on function private.guard_sighting_insert() to anon, authenticated;

drop trigger if exists sightings_guard_insert on public.sightings;
create trigger sightings_guard_insert
  before insert on public.sightings
  for each row
  execute procedure private.guard_sighting_insert();

alter table public.admins enable row level security;
alter table public.sightings enable row level security;

revoke all on table public.admins from public, anon, authenticated;
revoke all on table public.sightings from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.sightings to anon;
grant select, insert, update, delete on table public.sightings to authenticated;
grant select on table public.admins to authenticated;

drop policy if exists "Anyone can insert a pending report" on public.sightings;
create policy "Anyone can insert a pending report"
on public.sightings
for insert
to anon, authenticated
with check (
  status = 'pending'
  and (honeypot is null or honeypot = '')
);

drop policy if exists "Anyone can read approved reports" on public.sightings;
create policy "Anyone can read approved reports"
on public.sightings
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Admins can read every report" on public.sightings;
create policy "Admins can read every report"
on public.sightings
for select
to authenticated
using (private.is_admin());

drop policy if exists "Admins can update reports" on public.sightings;
create policy "Admins can update reports"
on public.sightings
for update
to authenticated
using (private.is_admin())
with check (private.is_admin() and status in ('pending', 'approved'));

drop policy if exists "Admins can delete reports" on public.sightings;
create policy "Admins can delete reports"
on public.sightings
for delete
to authenticated
using (private.is_admin());

drop policy if exists "Admins can read their own admin row" on public.admins;
create policy "Admins can read their own admin row"
on public.admins
for select
to authenticated
using (
  private.is_admin()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Photos. Public read. Anonymous upload, limited by size and type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sighting-photos',
  'sighting-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read sighting photos" on storage.objects;
create policy "Public read sighting photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'sighting-photos');

drop policy if exists "Anyone can upload a sighting photo" on storage.objects;
create policy "Anyone can upload a sighting photo"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'sighting-photos'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  and name ~ '^[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$'
);

-- Delete is still checked with is_admin(), so a visitor cannot remove photos.
drop policy if exists "Admins can delete sighting photos" on storage.objects;
create policy "Admins can delete sighting photos"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'sighting-photos'
  and private.is_admin()
);
