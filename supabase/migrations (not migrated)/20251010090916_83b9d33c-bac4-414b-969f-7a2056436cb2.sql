-- Grant admin role to current user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('8b3f791d-5648-4860-89c7-378cc05184f6', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;