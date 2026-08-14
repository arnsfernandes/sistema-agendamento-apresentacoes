-- Create a public bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
CREATE POLICY "Public select access for avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (split_part(name, '.', 1) = auth.uid()::text OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Authenticated users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (split_part(name, '.', 1) = auth.uid()::text OR (storage.foldername(name))[1] = auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (split_part(name, '.', 1) = auth.uid()::text OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Authenticated users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  (split_part(name, '.', 1) = auth.uid()::text OR (storage.foldername(name))[1] = auth.uid()::text)
);
