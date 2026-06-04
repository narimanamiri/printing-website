
-- Tighten SECURITY DEFINER functions: only used internally by RLS / triggers
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Storage policies: stl-uploads (path: <user_id>/<filename>)
CREATE POLICY "Users can upload own STL"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stl-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own STL"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stl-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all STL"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stl-uploads' AND public.has_role(auth.uid(), 'admin'));

-- payment-receipts (path: <user_id>/<filename>)
CREATE POLICY "Users can upload own receipt"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own receipt"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'));

-- print-queue: admin-only access (service role bypasses RLS for the copy step)
CREATE POLICY "Admins read print queue"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'print-queue' AND public.has_role(auth.uid(), 'admin'));
