DROP POLICY "Users can view their own contact logs" ON public.contact_expert_logs;
CREATE POLICY "Users can view their own contact logs"
ON public.contact_expert_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);