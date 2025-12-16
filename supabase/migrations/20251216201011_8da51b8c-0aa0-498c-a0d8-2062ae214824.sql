-- Attempt to remediate linter warning: move pg_net out of public by reinstalling it into a dedicated schema.
-- pg_net does not support ALTER EXTENSION ... SET SCHEMA, so we re-create it.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      DROP EXTENSION pg_net;
      CREATE EXTENSION pg_net WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      -- Safety fallback: restore extension if re-create fails
      RAISE NOTICE 'Could not create pg_net in extensions schema: %', SQLERRM;
      CREATE EXTENSION pg_net WITH SCHEMA public;
    END;
  END IF;
END $$;