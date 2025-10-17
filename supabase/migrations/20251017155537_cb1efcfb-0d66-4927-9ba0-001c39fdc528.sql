-- Cleanup script: Keep admin account m2@a.com, delete all properties and related data

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID for logging
  SELECT id INTO admin_user_id 
  FROM profiles 
  WHERE email = 'm2@a.com';

  -- Delete in order respecting foreign keys
  
  -- 1. Delete ticket-related data
  DELETE FROM ticket_comments;
  DELETE FROM ticket_activities;
  DELETE FROM ticket_attachments;
  DELETE FROM tickets;
  
  -- 2. Delete property documents
  DELETE FROM property_documents;
  
  -- 3. Delete recurring schedules
  DELETE FROM recurring_schedules;
  
  -- 4. Delete ticket templates
  DELETE FROM ticket_templates;
  
  -- 5. Delete property tenants
  DELETE FROM property_tenants;
  
  -- 6. Delete invitations
  DELETE FROM invitations;
  
  -- 7. Delete all properties
  DELETE FROM properties;
  
  -- 8. Delete analytics data (optional - keeps analytics clean)
  DELETE FROM analytics_events;
  DELETE FROM analytics_page_views;
  DELETE FROM analytics_navigation_paths;
  DELETE FROM analytics_sessions;
  
  -- 9. Clear storage buckets
  DELETE FROM storage.objects WHERE bucket_id = 'ticket-photos';
  DELETE FROM storage.objects WHERE bucket_id = 'ticket-videos';
  DELETE FROM storage.objects WHERE bucket_id = 'property-documents';
  DELETE FROM storage.objects WHERE bucket_id = 'property-photos';
  -- Preserving brand-logos bucket (custom branding)
  
  RAISE NOTICE 'Cleanup complete. Admin account % preserved. All properties and related data deleted.', admin_user_id;
END $$;