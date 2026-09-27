-- Phase 7: profile photos. Staff add a photo in Settings; it shows in the
-- avatar menu and on their profile. Photos live in a public bucket under the
-- person's own folder with an unguessable file name (like Google profile
-- pictures), so pages can show them without signing every URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_member());
-- Listing and removing are only needed to tidy up your own old photos.
create policy "avatars: list own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
