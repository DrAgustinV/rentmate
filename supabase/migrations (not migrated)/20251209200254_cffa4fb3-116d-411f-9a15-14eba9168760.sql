-- Fix: Update invitations foreign key to SET NULL on user deletion
ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_invited_user_id_fkey;

ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_invited_user_id_fkey 
FOREIGN KEY (invited_user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;