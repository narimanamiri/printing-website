
-- Lock down user_roles: only admins may modify; explicit deny for self-modification
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage: scoped UPDATE/DELETE for owners on their own folder
CREATE POLICY "Users can update own STL" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'stl-uploads' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'stl-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own STL" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stl-uploads' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own receipt" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-receipts' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'payment-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own receipt" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);
