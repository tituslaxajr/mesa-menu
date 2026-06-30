-- ============================================================================
-- Mesa — Storage for café images (logos, covers, menu-item photos)
-- One public-read bucket. Objects are foldered by café id: <cafe_id>/<kind>/<file>.
-- Write/update/delete is allowed only to a manager of that café (path's first
-- segment must be a café they can manage); everyone can read (public menus).
-- This replaces storing data-URL images in table columns.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('cafe-public', 'cafe-public', true)
on conflict (id) do nothing;

-- Public read of anything in the bucket.
create policy "cafe-public read"
  on storage.objects for select
  using (bucket_id = 'cafe-public');

-- Manager-only writes, scoped to their café's folder (first path segment = cafe_id).
create policy "cafe-public insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );

create policy "cafe-public update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );

create policy "cafe-public delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cafe-public'
    and public.can_manage_cafe((storage.foldername(name))[1]::uuid)
  );
