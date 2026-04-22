-- Create public avatars bucket for profile pictures
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to avatars bucket
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Allow public read access to avatars
create policy "Public read access for avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Allow users to delete their own avatar files
create policy "Authenticated users can delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
