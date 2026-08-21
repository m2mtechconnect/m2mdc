INSERT INTO public.user_roles (user_id, role)
SELECT 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = 'f3c0f534-4df8-4cb1-901a-b8d6abe08742'::uuid
);