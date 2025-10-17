-- Delete all test users except admin m2@a.com

DO $$
DECLARE
  admin_email text := 'm2@a.com';
  deleted_count integer;
BEGIN
  -- Delete user preferences for non-admin users
  DELETE FROM user_preferences 
  WHERE user_id IN (
    SELECT id FROM profiles WHERE email != admin_email
  );
  
  -- Delete user roles for non-admin users
  DELETE FROM user_roles 
  WHERE user_id IN (
    SELECT id FROM profiles WHERE email != admin_email
  );
  
  -- Delete profiles (cascades to auth.users via ON DELETE CASCADE)
  WITH deleted AS (
    DELETE FROM profiles 
    WHERE email != admin_email
    RETURNING id, email
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RAISE NOTICE 'Deleted % test users. Admin account % preserved.', deleted_count, admin_email;
END $$;