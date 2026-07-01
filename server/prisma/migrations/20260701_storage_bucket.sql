-- Step 40: Supabase Storage — photos bucket + RLS policies
-- Run once in the Supabase SQL editor (or via supabase db push)

-- Create the photos bucket (public read, auth write)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Anyone can read photos (public CDN URLs)
create policy "photos_public_read"
  on storage.objects for select
  using ( bucket_id = 'photos' );

-- Authenticated users can upload into their own folder
create policy "photos_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
  );

-- Users can only delete their own photos
create policy "photos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
