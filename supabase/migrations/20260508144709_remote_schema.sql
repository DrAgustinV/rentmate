


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."condition_rating" AS ENUM (
    'excellent',
    'good',
    'fair',
    'poor',
    'damaged'
);


ALTER TYPE "public"."condition_rating" OWNER TO "postgres";


CREATE TYPE "public"."delete_reason" AS ENUM (
    'sold',
    'no_longer_managing',
    'merged_with_other_property',
    'other'
);


ALTER TYPE "public"."delete_reason" OWNER TO "postgres";


CREATE TYPE "public"."inspection_status" AS ENUM (
    'draft',
    'in_progress',
    'pending_signatures',
    'completed'
);


ALTER TYPE "public"."inspection_status" OWNER TO "postgres";


CREATE TYPE "public"."inspection_type" AS ENUM (
    'move_in',
    'move_out'
);


ALTER TYPE "public"."inspection_type" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'expired',
    'declined',
    'property_inactive',
    'already_tenant',
    'cancelled'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."plan_status" AS ENUM (
    'active',
    'inactive',
    'archived'
);


ALTER TYPE "public"."plan_status" OWNER TO "postgres";


CREATE TYPE "public"."property_status" AS ENUM (
    'active',
    'inactive',
    'ending_tenancy'
);


ALTER TYPE "public"."property_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'expired'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_type" AS ENUM (
    'stripe',
    'admin_grant',
    'free'
);


ALTER TYPE "public"."subscription_type" OWNER TO "postgres";


CREATE TYPE "public"."ticket_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'cancelled'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_type" AS ENUM (
    'issue',
    'request',
    'incident',
    'maintenance',
    'repair',
    'inspection',
    'cleaning',
    'other'
);


ALTER TYPE "public"."ticket_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_active_property"("p_address" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE address = p_address
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."can_create_active_property"("p_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_end_tenancy"("p_property_id" "uuid", "p_address" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE address = p_address
    AND id != p_property_id
    AND status = 'ending_tenancy'
  );
END;
$$;


ALTER FUNCTION "public"."can_end_tenancy"("p_property_id" "uuid", "p_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_photo"("_ticket_id" "uuid", "_file_size_bytes" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_count integer;
  max_photos integer;
  max_size_mb integer;
  ticket_status_val ticket_status;
BEGIN
  SELECT status INTO ticket_status_val FROM public.tickets WHERE id = _ticket_id;
  IF ticket_status_val IN ('resolved', 'cancelled') THEN
    RETURN false;
  END IF;
  
  SELECT (setting_value->>'value')::integer INTO max_photos 
  FROM public.system_settings WHERE setting_key = 'ticket_max_photos';
  
  SELECT (setting_value->>'value')::integer INTO max_size_mb 
  FROM public.system_settings WHERE setting_key = 'ticket_photo_max_size_mb';
  
  SELECT COUNT(*) INTO current_count 
  FROM public.ticket_attachments 
  WHERE ticket_id = _ticket_id AND file_type = 'photo';
  
  IF current_count >= max_photos THEN
    RETURN false;
  END IF;
  
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."can_upload_photo"("_ticket_id" "uuid", "_file_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_property_document"("_property_id" "uuid", "_file_size_bytes" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_count INTEGER;
  max_docs INTEGER;
  max_size_mb INTEGER;
  property_status_val property_status;
BEGIN
  SELECT status INTO property_status_val FROM public.properties WHERE id = _property_id;
  IF property_status_val != 'active' THEN
    RETURN false;
  END IF;
  
  SELECT (setting_value->>'value')::INTEGER INTO max_docs 
  FROM public.system_settings WHERE setting_key = 'property_doc_max_count';
  
  SELECT (setting_value->>'value')::INTEGER INTO max_size_mb 
  FROM public.system_settings WHERE setting_key = 'property_doc_max_size_mb';
  
  SELECT COUNT(*) INTO current_count 
  FROM public.property_documents 
  WHERE property_id = _property_id AND is_latest_version = true;
  
  IF current_count >= max_docs THEN
    RETURN false;
  END IF;
  
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."can_upload_property_document"("_property_id" "uuid", "_file_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_video"("_ticket_id" "uuid", "_file_size_bytes" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_count integer;
  max_videos integer;
  max_size_mb integer;
  ticket_status_val ticket_status;
BEGIN
  SELECT status INTO ticket_status_val FROM public.tickets WHERE id = _ticket_id;
  IF ticket_status_val IN ('resolved', 'cancelled') THEN
    RETURN false;
  END IF;
  
  SELECT (setting_value->>'value')::integer INTO max_videos 
  FROM public.system_settings WHERE setting_key = 'ticket_max_videos';
  
  SELECT (setting_value->>'value')::integer INTO max_size_mb 
  FROM public.system_settings WHERE setting_key = 'ticket_video_max_size_mb';
  
  SELECT COUNT(*) INTO current_count 
  FROM public.ticket_attachments 
  WHERE ticket_id = _ticket_id AND file_type = 'video';
  
  IF current_count >= max_videos THEN
    RETURN false;
  END IF;
  
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."can_upload_video"("_ticket_id" "uuid", "_file_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_use_feature"("p_user_id" "uuid", "p_feature" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT (sp.feature_limits->(p_feature || '_enabled'))::BOOLEAN INTO v_enabled
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing');
  
  RETURN COALESCE(v_enabled, false);
END;
$$;


ALTER FUNCTION "public"."can_use_feature"("p_user_id" "uuid", "p_feature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_full_profile"("_viewer_id" "uuid", "_profile_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    _viewer_id = _profile_id
    OR public.has_role(_viewer_id, 'admin'::app_role)
$$;


ALTER FUNCTION "public"."can_view_full_profile"("_viewer_id" "uuid", "_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_has_account"("check_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(check_email)
  );
$$;


ALTER FUNCTION "public"."check_email_has_account"("check_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_rent_payments"("p_agreement_id" "uuid", "p_months_ahead" integer DEFAULT 12) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_agreement RECORD;
  v_payment_date DATE;
  v_months_generated INTEGER := 0;
  v_start_date DATE;
BEGIN
  SELECT * INTO v_agreement
  FROM public.rent_agreements
  WHERE id = p_agreement_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active rent agreement not found';
  END IF;
  
  v_start_date := GREATEST(v_agreement.start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  
  FOR i IN 0..(p_months_ahead - 1) LOOP
    v_payment_date := (v_start_date + (i || ' months')::INTERVAL)::DATE;
    v_payment_date := DATE_TRUNC('month', v_payment_date)::DATE + (v_agreement.payment_day - 1 || ' days')::INTERVAL;
    
    IF NOT EXISTS (
      SELECT 1 FROM public.rent_payments
      WHERE rent_agreement_id = p_agreement_id
      AND DATE_TRUNC('month', payment_due_date) = DATE_TRUNC('month', v_payment_date)
    ) THEN
      INSERT INTO public.rent_payments (
        rent_agreement_id,
        property_id,
        tenant_id,
        manager_id,
        amount_cents,
        currency,
        payment_due_date,
        status
      ) VALUES (
        p_agreement_id,
        v_agreement.property_id,
        v_agreement.tenant_id,
        v_agreement.manager_id,
        v_agreement.rent_amount_cents,
        v_agreement.currency,
        v_payment_date,
        'pending'
      );
      
      v_months_generated := v_months_generated + 1;
    END IF;
  END LOOP;
  
  RETURN v_months_generated;
END;
$$;


ALTER FUNCTION "public"."generate_rent_payments"("p_agreement_id" "uuid", "p_months_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_ticket_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Uses a sequence for concurrency-safe, gap-tolerant ticket numbers.
  -- Previously used COUNT(*)+1 which caused duplicate key errors under concurrent inserts.
  NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email
  FROM public.profiles
  WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_properties_status_indicators"("p_property_ids" "uuid"[]) RETURNS TABLE("property_id" "uuid", "rent_overdue" boolean, "rent_has_data" boolean, "utility_overdue" boolean, "utility_has_data" boolean, "tickets_open" boolean, "tickets_has_data" boolean, "maintenance_overdue" boolean, "maintenance_has_data" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    p.id as property_id,
    EXISTS(
      SELECT 1 FROM public.rent_payments rp 
      WHERE rp.property_id = p.id 
      AND rp.status = 'overdue'
    ) as rent_overdue,
    EXISTS(
      SELECT 1 FROM public.rent_payments rp 
      WHERE rp.property_id = p.id
    ) as rent_has_data,
    EXISTS(
      SELECT 1 FROM public.utility_payments up 
      WHERE up.property_id = p.id 
      AND up.status = 'overdue'
    ) as utility_overdue,
    EXISTS(
      SELECT 1 FROM public.utility_payments up 
      WHERE up.property_id = p.id
    ) as utility_has_data,
    EXISTS(
      SELECT 1 FROM public.tickets t 
      WHERE t.property_id = p.id 
      AND t.status IN ('open', 'in_progress')
    ) as tickets_open,
    EXISTS(
      SELECT 1 FROM public.tickets t 
      WHERE t.property_id = p.id
    ) as tickets_has_data,
    EXISTS(
      SELECT 1 FROM public.recurring_schedules rs 
      WHERE rs.property_id = p.id 
      AND rs.is_active = true 
      AND rs.next_run_date < CURRENT_DATE
    ) as maintenance_overdue,
    EXISTS(
      SELECT 1 FROM public.recurring_schedules rs 
      WHERE rs.property_id = p.id 
      AND rs.is_active = true
    ) as maintenance_has_data
  FROM unnest(p_property_ids) AS pid
  JOIN public.properties p ON p.id = pid
  WHERE public.is_property_manager(auth.uid(), p.id);
$$;


ALTER FUNCTION "public"."get_properties_status_indicators"("p_property_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") RETURNS TABLE("status" "text", "tenant_name" "text", "tenant_email" "text", "pending_invites" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH active_tenants AS (
    SELECT 
      pt.tenant_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as full_name,
      p.email
    FROM public.property_tenants pt
    JOIN public.profiles p ON p.id = pt.tenant_id
    WHERE pt.property_id = p_property_id
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
    LIMIT 1
  ),
  pending_invites AS (
    SELECT COUNT(*)::INTEGER as count
    FROM public.invitations
    WHERE property_id = p_property_id
    AND invitations.status = 'pending'
  )
  SELECT 
    CASE
      WHEN EXISTS (SELECT 1 FROM active_tenants) THEN 'occupied'::TEXT
      WHEN (SELECT count FROM pending_invites) > 0 THEN 'invited'::TEXT
      ELSE 'free'::TEXT
    END as status,
    (SELECT full_name FROM active_tenants) as tenant_name,
    (SELECT email FROM active_tenants) as tenant_email,
    COALESCE((SELECT count FROM pending_invites), 0) as pending_invites;
END;
$$;


ALTER FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan', sp.slug,
    'plan_name', sp.name,
    'status', us.status,
    'subscription_type', us.subscription_type,
    'is_trial', us.status = 'trialing',
    'trial_end', us.trial_end,
    'current_period_end', us.current_period_end,
    'grace_period_ends_at', us.grace_period_ends_at,
    'features', sp.feature_limits,
    'usage', COALESCE(
      (
        SELECT jsonb_build_object(
          'signatures_used', COALESCE(su.signatures_used, 0),
          'signatures_limit', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER,
          'overage', COALESCE(su.overage_signatures_used, 0),
          'remaining', GREATEST(0, (sp.feature_limits->>'digital_signatures_per_year')::INTEGER - COALESCE(su.signatures_used, 0))
        )
        FROM public.subscription_usage su
        WHERE su.user_id = p_user_id AND su.year = EXTRACT(YEAR FROM now())::INTEGER
      ),
      jsonb_build_object(
        'signatures_used', 0,
        'signatures_limit', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER,
        'overage', 0,
        'remaining', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER
      )
    )
  ) INTO v_result
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, subscription_type, status)
    VALUES (NEW.id, free_plan_id, 'free', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_gov_id_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.subscription_usage (user_id, year, government_id_verifications_used, reset_at)
  VALUES (p_user_id, p_year, p_amount, (p_year + 1 || '-01-01')::TIMESTAMPTZ)
  ON CONFLICT (user_id, year) 
  DO UPDATE SET 
    government_id_verifications_used = public.subscription_usage.government_id_verifications_used + p_amount,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."increment_gov_id_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_overage_gov_id"("p_user_id" "uuid", "p_year" integer, "p_amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.subscription_usage
  SET 
    overage_government_id_used = overage_government_id_used + p_amount,
    last_gov_id_overage_billed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id AND year = p_year;
END;
$$;


ALTER FUNCTION "public"."increment_overage_gov_id"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_overage_signatures"("p_user_id" "uuid", "p_year" integer, "p_amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.subscription_usage
  SET 
    overage_signatures_used = overage_signatures_used + p_amount,
    last_overage_billed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id AND year = p_year;
END;
$$;


ALTER FUNCTION "public"."increment_overage_signatures"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_signatures_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.subscription_usage (user_id, year, signatures_used, reset_at)
  VALUES (p_user_id, p_year, p_amount, (p_year + 1 || '-01-01')::TIMESTAMPTZ)
  ON CONFLICT (user_id, year) 
  DO UPDATE SET 
    signatures_used = public.subscription_usage.signatures_used + p_amount,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."increment_signatures_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_property_manager"("_user_id" "uuid", "_property_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = _property_id
      AND manager_id = _user_id
  )
$$;


ALTER FUNCTION "public"."is_property_manager"("_user_id" "uuid", "_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_property_tenant"("_user_id" "uuid", "_property_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_tenants
    WHERE property_id = _property_id
      AND tenant_id = _user_id
      AND tenancy_status IN ('active', 'ending_tenancy')
  )
$$;


ALTER FUNCTION "public"."is_property_tenant"("_user_id" "uuid", "_property_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_generate_rent_payments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.is_active THEN
    PERFORM public.generate_rent_payments(NEW.id, 12);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_generate_rent_payments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contract_signatures_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contract_signatures_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "event_category" "text",
    "event_metadata" "jsonb",
    "page_path" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_navigation_paths" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid",
    "from_path" "text",
    "to_path" "text" NOT NULL,
    "breadcrumb_trail" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analytics_navigation_paths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "page_path" "text" NOT NULL,
    "page_title" "text",
    "referrer" "text",
    "user_agent" "text",
    "ip_address" "text",
    "country" "text",
    "region" "text",
    "city" "text",
    "device_type" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analytics_page_views_device_type_check" CHECK (("device_type" = ANY (ARRAY['mobile'::"text", 'tablet'::"text", 'desktop'::"text"])))
);


ALTER TABLE "public"."analytics_page_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."analytics_page_views" IS 'Page view analytics. Access: Public can INSERT with validation, Only admins can SELECT, System can UPDATE for geolocation.';



CREATE TABLE IF NOT EXISTS "public"."analytics_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "page_views_count" integer DEFAULT 0,
    "events_count" integer DEFAULT 0,
    "is_authenticated" boolean DEFAULT false,
    "user_role" "text",
    "subscription_tier" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_name" "text" DEFAULT 'RentMate'::"text" NOT NULL,
    "logo_url" "text",
    "primary_color" "text" DEFAULT '221 83% 53%'::"text" NOT NULL,
    "accent_color" "text" DEFAULT '199 89% 48%'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "custom_domain" "text",
    "header_background_color" "text" DEFAULT '173 77% 40%'::"text" NOT NULL,
    "header_background_opacity" integer DEFAULT 100 NOT NULL,
    "carousel_items" "jsonb" DEFAULT '[{"title": {"en": "Automated Rent Collection", "es": "Cobro Automático de Alquiler"}, "image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop", "description": {"en": "Collect rent automatically via SEPA Direct Debit", "es": "Cobra el alquiler automáticamente mediante SEPA Direct Debit"}}, {"title": {"en": "Digital Contracts", "es": "Contratos Digitales"}, "image_url": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop", "description": {"en": "Sign contracts digitally with legal validity", "es": "Firma contratos digitalmente con validez legal"}}, {"title": {"en": "Smart Maintenance", "es": "Mantenimiento Inteligente"}, "image_url": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop", "description": {"en": "Track and schedule property maintenance tasks", "es": "Gestiona y programa tareas de mantenimiento"}}, {"title": {"en": "Verified Tenants", "es": "Inquilinos Verificados"}, "image_url": "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop", "description": {"en": "KYC verification for trusted tenancies", "es": "Verificación KYC para arrendamientos de confianza"}}]'::"jsonb"
);


ALTER TABLE "public"."brand_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenancy_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "workflow_id" "text",
    "workflow_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "manager_signed_at" timestamp with time zone,
    "manager_signature_method" "text",
    "manager_signature_ip" "text",
    "tenant_signed_at" timestamp with time zone,
    "tenant_signature_method" "text",
    "tenant_signature_ip" "text",
    "signed_document_url" "text",
    "initiated_by" "uuid" NOT NULL,
    "initiated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "signing_method_provider" "text" DEFAULT 'mock'::"text",
    "contract_document_hash" "text",
    "contract_pdf_url" "text",
    "docuseal_template_id" "text",
    "docuseal_submission_id" "text",
    "docuseal_audit_log_url" "text",
    "manager_signature_data" "jsonb",
    "tenant_signature_data" "jsonb",
    "kyc_enforced" boolean DEFAULT false,
    "docuseal_submission_slug" "text",
    "docuseal_manager_document_url" "text",
    "docuseal_tenant_document_url" "text",
    "manager_embed_slug" "text",
    "tenant_embed_slug" "text",
    "qualified_signature_provider" "text",
    "qualified_signature_session_id" "text",
    "qualified_signature_callback_url" "text",
    "qualified_signature_metadata" "jsonb",
    "source_document_id" "uuid",
    "signature_method" "text" DEFAULT 'SAS'::"text",
    "last_reminder_sent_at" timestamp with time zone,
    "reminder_count" integer DEFAULT 0,
    "tenant_signer_id" "text",
    CONSTRAINT "contract_signatures_manager_signature_method_check" CHECK ((("manager_signature_method" IS NULL) OR ("manager_signature_method" = ANY (ARRAY['SAS'::"text", 'AES'::"text", 'QES'::"text"])))),
    CONSTRAINT "contract_signatures_signature_method_check" CHECK (("signature_method" = ANY (ARRAY['SAS'::"text", 'AES'::"text", 'QES'::"text"]))),
    CONSTRAINT "contract_signatures_signing_method_provider_check" CHECK (("signing_method_provider" = ANY (ARRAY['mock'::"text", 'dock'::"text", 'docuseal'::"text", 'openapi'::"text", 'yousign'::"text"]))),
    CONSTRAINT "contract_signatures_tenant_signature_method_check" CHECK ((("tenant_signature_method" IS NULL) OR ("tenant_signature_method" = ANY (ARRAY['SAS'::"text", 'AES'::"text", 'QES'::"text"])))),
    CONSTRAINT "contract_signatures_workflow_status_check" CHECK (("workflow_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."contract_signatures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_job_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_name" "text" NOT NULL,
    "last_run_at" timestamp with time zone,
    "last_run_status" "text",
    "last_error" "text",
    "run_count" integer DEFAULT 0 NOT NULL,
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_run_status" CHECK (("last_run_status" = ANY (ARRAY['success'::"text", 'failure'::"text", 'partial'::"text", NULL::"text"])))
);


ALTER TABLE "public"."cron_job_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_retention_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "policy_type" "text" NOT NULL,
    "affected_records" integer DEFAULT 0 NOT NULL,
    "anonymized_records" integer DEFAULT 0 NOT NULL,
    "deleted_records" integer DEFAULT 0 NOT NULL,
    "execution_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_retention_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enterprise_contact_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "company_name" "text",
    "phone" "text",
    "message" "text" NOT NULL,
    "properties_count" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "contacted_by" "uuid",
    "contacted_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."enterprise_contact_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grace_period_reminders_sent" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_subscription_id" "uuid" NOT NULL,
    "reminder_day" integer NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."grace_period_reminders_sent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "import_type" "text" NOT NULL,
    "file_name" "text",
    "file_size_bytes" bigint,
    "records_processed" integer DEFAULT 0,
    "records_succeeded" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "error_log" "jsonb",
    "processing_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "import_logs_import_type_check" CHECK (("import_type" = ANY (ARRAY['properties'::"text", 'properties_and_tenants'::"text", 'tenants_only'::"text"])))
);


ALTER TABLE "public"."import_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspection_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inspection_id" "uuid" NOT NULL,
    "room_name" "text" NOT NULL,
    "room_order" integer DEFAULT 0 NOT NULL,
    "condition" "public"."condition_rating",
    "notes" "text",
    "photos" "text"[] DEFAULT '{}'::"text"[],
    "videos" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inspection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "email" "text" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status" NOT NULL,
    "invited_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "tenancy_requirements_id" "uuid",
    "decline_reason" "text",
    "declined_at" timestamp with time zone
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."invitations" IS 'Property tenant invitations. Access: Public can view only by exact token (pending/unexpired), Managers can manage their properties invitations, Users can view their own invitations.';



CREATE OR REPLACE VIEW "public"."invitations_safe" WITH ("security_invoker"='true') AS
 SELECT "id",
    "property_id",
    "email",
    "status",
    "expires_at",
    "created_at",
    "invited_user_id"
   FROM "public"."invitations";


ALTER VIEW "public"."invitations_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."language_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "language_code" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "display_order" integer,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."language_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_stripe_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "stripe_account_id" "text" NOT NULL,
    "stripe_account_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "onboarding_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_status" CHECK (("stripe_account_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."manager_stripe_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rent_payment_id" "uuid" NOT NULL,
    "stripe_dispute_id" "text" NOT NULL,
    "dispute_status" "text" DEFAULT 'needs_response'::"text" NOT NULL,
    "dispute_reason" "text" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "evidence_due_by" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_currency_disputes" CHECK (("currency" = ANY (ARRAY['eur'::"text", 'usd'::"text", 'gbp'::"text"]))),
    CONSTRAINT "valid_dispute_status" CHECK (("dispute_status" = ANY (ARRAY['warning_needs_response'::"text", 'warning_under_review'::"text", 'warning_closed'::"text", 'needs_response'::"text", 'under_review'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."payment_disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rent_payment_id" "uuid" NOT NULL,
    "reminder_type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_to" "text" NOT NULL,
    "email_subject" "text" NOT NULL,
    "email_status" "text" DEFAULT 'sent'::"text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_reminders_email_status_check" CHECK (("email_status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'bounced'::"text"]))),
    CONSTRAINT "payment_reminders_reminder_type_check" CHECK (("reminder_type" = ANY (ARRAY['upcoming'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."payment_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."privacy_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_details" "text",
    "response_details" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "privacy_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['access'::"text", 'rectification'::"text", 'erasure'::"text", 'restriction'::"text", 'objection'::"text", 'portability'::"text"]))),
    CONSTRAINT "privacy_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."privacy_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manager_iban" "text",
    "sepa_creditor_identifier" "text",
    "legal_name" "text",
    "kyc_credential_id" "text",
    "kyc_qr_code_url" "text",
    "kyc_status" "text" DEFAULT 'not_started'::"text",
    "kyc_verified_at" timestamp with time zone,
    "kyc_expires_at" timestamp with time zone,
    "id_document_type" "text",
    "id_document_country" "text",
    "aml_status" "text" DEFAULT 'not_checked'::"text",
    "kyc_wallet_did" "text",
    "default_rent_settings" "jsonb" DEFAULT '{"require_kyc": false, "custom_bills": [], "require_water_bill": false, "default_deposit_amount": 0, "require_electricity_bill": false, "require_payment_confirmation": true}'::"jsonb",
    "deletion_requested_at" timestamp with time zone,
    "deletion_scheduled_for" timestamp with time zone,
    "kyc_provider" "text" DEFAULT 'kilt'::"text",
    "kyc_data" "jsonb",
    "email_verified" boolean DEFAULT false,
    "email_verification_token" "text",
    "email_verification_sent_at" timestamp with time zone,
    "email_verification_expires_at" timestamp with time zone,
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles with PII. Access: Users can view/edit own profile, Managers can view their tenants, Admins can view all.';



CREATE OR REPLACE VIEW "public"."profiles_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "email",
    "first_name",
    "last_name",
    "avatar_url",
    "phone",
    "email_verified",
    "created_at",
    "updated_at"
   FROM "public"."profiles";


ALTER VIEW "public"."profiles_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "address" "text",
    "description" "text",
    "images" "text"[] DEFAULT '{}'::"text"[],
    "status" "public"."property_status" DEFAULT 'active'::"public"."property_status" NOT NULL,
    "deleted_at" timestamp with time zone,
    "delete_reason" "public"."delete_reason",
    "manager_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "city" "text",
    "state_province" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'Germany'::"text",
    CONSTRAINT "properties_title_check" CHECK ((("length"("title") >= 1) AND ("length"("title") <= 100)))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


COMMENT ON TABLE "public"."properties" IS 'Property listings. Access: Managers can CRUD their own, Tenants can view assigned properties, Admins can view all.';



CREATE TABLE IF NOT EXISTS "public"."property_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size_bytes" bigint NOT NULL,
    "mime_type" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_document_id" "uuid",
    "description" "text",
    "is_latest_version" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "document_title" "text" DEFAULT 'Untitled Document'::"text" NOT NULL,
    "document_category" "text",
    "tenancy_id" "uuid"
);


ALTER TABLE "public"."property_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenancy_status" "text" DEFAULT 'active'::"text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "end_reason" "text",
    "notes" "text",
    "planned_ending_date" "date",
    "videos" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "property_tenants_tenancy_status_check" CHECK (("tenancy_status" = ANY (ARRAY['active'::"text", 'ending_tenancy'::"text", 'historic'::"text"])))
);


ALTER TABLE "public"."property_tenants" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_tenants" IS 'Tenancy relationships. Access: Managers can CRUD for their properties, Tenants can view their own tenancies.';



CREATE TABLE IF NOT EXISTS "public"."qualified_signature_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_signature_id" "uuid",
    "session_id" "text" NOT NULL,
    "provider_code" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "certificate_info" "jsonb",
    "signature_data" "text",
    "error_message" "text",
    "user_agent" "text",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qualified_signature_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qualified_signature_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_code" "text" NOT NULL,
    "provider_name" "text" NOT NULL,
    "country_codes" "text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "protocol_scheme" "text" NOT NULL,
    "installation_url" "text",
    "config" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."qualified_signature_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "frequency" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "next_run_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_schedules_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."recurring_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rent_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenancy_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "rent_amount_cents" bigint NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "payment_day" integer NOT NULL,
    "tenant_iban" "text",
    "mandate_id" "text",
    "mandate_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mandate_pdf_url" "text",
    "mandate_signed_at" timestamp with time zone,
    "security_deposit_cents" bigint,
    "deposit_return_days" integer DEFAULT 30,
    "utilities_tenant_responsible" "text",
    "utilities_manager_responsible" "text",
    "auto_reminders_enabled" boolean DEFAULT true,
    CONSTRAINT "valid_currency" CHECK (("currency" = ANY (ARRAY['eur'::"text", 'usd'::"text", 'gbp'::"text"]))),
    CONSTRAINT "valid_mandate_status" CHECK (("mandate_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'inactive'::"text", 'failed'::"text"]))),
    CONSTRAINT "valid_payment_day" CHECK ((("payment_day" >= 1) AND ("payment_day" <= 28)))
);


ALTER TABLE "public"."rent_agreements" OWNER TO "postgres";


COMMENT ON TABLE "public"."rent_agreements" IS 'Rent payment agreements containing IBAN. Access: Managers can CRUD for their properties, Tenants can view/update their own agreements, Admins can view all.';



CREATE TABLE IF NOT EXISTS "public"."rent_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rent_agreement_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "amount_cents" bigint NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "payment_date" "date",
    "stripe_payment_intent_id" "text",
    "stripe_charge_id" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "failure_reason" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_due_date" "date",
    "payment_received_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text" DEFAULT 'sepa_direct_debit'::"text",
    "notes" "text",
    "proof_of_payment_url" "text",
    "tenant_confirmed" boolean DEFAULT false,
    "tenant_confirmed_at" timestamp with time zone,
    "manager_reviewed" boolean DEFAULT false,
    "manager_reviewed_at" timestamp with time zone,
    "manager_reviewed_by" "uuid",
    "proof_review_status" "text" DEFAULT 'pending'::"text",
    "proof_review_notes" "text",
    CONSTRAINT "rent_payments_proof_review_status_check" CHECK (("proof_review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "valid_currency_payments" CHECK (("currency" = ANY (ARRAY['eur'::"text", 'usd'::"text", 'gbp'::"text"]))),
    CONSTRAINT "valid_payment_status" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'disputed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."rent_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."rent_payments" IS 'Rent payment records. Access: Managers can view/update for their properties, Tenants can view their own payments, System (admin) can insert/update.';



CREATE TABLE IF NOT EXISTS "public"."repair_shops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "company_name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "specializations" "text"[] DEFAULT '{}'::"text"[],
    "license_number" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."repair_shops" OWNER TO "postgres";


COMMENT ON TABLE "public"."repair_shops" IS 'Repair shop/contractor directory. Access: Managers can CRUD their own entries, Admins can view all.';



CREATE TABLE IF NOT EXISTS "public"."signature_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_signature_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "signature_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['initiated'::"text", 'manager_signed'::"text", 'tenant_signed'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text", 'expired'::"text", 'reminder_sent'::"text"])))
);


ALTER TABLE "public"."signature_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."standard_maintenance_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "public"."ticket_type" NOT NULL,
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority" NOT NULL,
    "suggested_frequency" "text" NOT NULL,
    "category" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."standard_maintenance_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" NOT NULL,
    "processed" boolean DEFAULT false NOT NULL,
    "processed_at" timestamp with time zone,
    "processing_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "from_plan_id" "uuid",
    "to_plan_id" "uuid" NOT NULL,
    "change_reason" "text" NOT NULL,
    "changed_by" "uuid",
    "metadata" "jsonb",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" "public"."plan_status" DEFAULT 'active'::"public"."plan_status" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_available_for_signup" boolean DEFAULT true NOT NULL,
    "price_monthly_cents" integer DEFAULT 0 NOT NULL,
    "price_annual_cents" integer DEFAULT 0 NOT NULL,
    "stripe_product_id" "text",
    "stripe_price_id_monthly" "text",
    "stripe_price_id_annual" "text",
    "trial_days" integer DEFAULT 0 NOT NULL,
    "grace_period_days" integer DEFAULT 14 NOT NULL,
    "overage_price_per_signature_cents" integer DEFAULT 200 NOT NULL,
    "feature_limits" "jsonb" DEFAULT '{"api_access_enabled": false, "stripe_connect_enabled": false, "white_labeling_enabled": false, "recurring_tasks_enabled": false, "kyc_verification_enabled": false, "revolut_payments_enabled": false, "sepa_direct_debit_enabled": false, "advanced_analytics_enabled": false, "automated_payments_enabled": false, "document_templates_enabled": false, "brand_customization_enabled": false, "digital_signatures_per_year": 0, "maintenance_templates_enabled": false, "repair_shop_directory_enabled": false}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "features_display" "jsonb" DEFAULT '{}'::"jsonb",
    "limitations_display" "jsonb" DEFAULT '{}'::"jsonb",
    "overage_price_per_government_id_cents" integer DEFAULT 100
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "reset_at" timestamp with time zone NOT NULL,
    "signatures_used" integer DEFAULT 0 NOT NULL,
    "overage_signatures_used" integer DEFAULT 0 NOT NULL,
    "last_overage_billed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "government_id_verifications_used" integer DEFAULT 0 NOT NULL,
    "overage_government_id_used" integer DEFAULT 0 NOT NULL,
    "last_gov_id_overage_billed_at" timestamp with time zone
);


ALTER TABLE "public"."subscription_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenancy_inspections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenancy_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "inspection_type" "public"."inspection_type" NOT NULL,
    "status" "public"."inspection_status" DEFAULT 'draft'::"public"."inspection_status" NOT NULL,
    "template_document_id" "uuid",
    "inspection_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "overall_condition" "text",
    "manager_signed_at" timestamp with time zone,
    "manager_signature_data" "jsonb",
    "manager_id" "uuid",
    "tenant_signed_at" timestamp with time zone,
    "tenant_signature_data" "jsonb",
    "tenant_id" "uuid",
    "pdf_url" "text",
    "pdf_generated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."tenancy_inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenancy_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "invitation_id" "uuid",
    "tenancy_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "tenant_email" "text" NOT NULL,
    "require_email_verification" boolean DEFAULT true,
    "require_kyc_verification" boolean DEFAULT false,
    "require_phone_verification" boolean DEFAULT false,
    "contract_method" "text",
    "selected_template_id" "uuid",
    "rent_amount_cents" bigint,
    "currency" "text" DEFAULT 'EUR'::"text",
    "security_deposit_cents" bigint,
    "payment_day" integer,
    "start_date" "date",
    "end_date" "date",
    "utilities_config" "jsonb" DEFAULT '{}'::"jsonb",
    "questionnaire_enabled" boolean DEFAULT false,
    "questionnaire_config" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tenancy_requirements_contract_method_check" CHECK (("contract_method" = ANY (ARRAY['digital'::"text", 'manual'::"text", 'none'::"text"]))),
    CONSTRAINT "tenancy_requirements_payment_day_check" CHECK ((("payment_day" >= 1) AND ("payment_day" <= 28))),
    CONSTRAINT "tenancy_requirements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tenancy_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ticket_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size_bytes" bigint NOT NULL,
    "original_filename" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_attachments_file_type_check" CHECK (("file_type" = ANY (ARRAY['photo'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."ticket_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_internal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_comments_comment_check" CHECK ((("char_length"("comment") <= 2000) AND ("char_length"("comment") > 0)))
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ticket_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "public"."ticket_type" NOT NULL,
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_standard_template_id" "uuid"
);


ALTER TABLE "public"."ticket_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" "text" DEFAULT ''::"text" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "type" "public"."ticket_type" NOT NULL,
    "status" "public"."ticket_status" DEFAULT 'open'::"public"."ticket_status" NOT NULL,
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "resolution_notes" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_template_id" "uuid",
    "scheduled_date" "date",
    CONSTRAINT "tickets_description_check" CHECK ((("char_length"("description") <= 2000) AND ("char_length"("description") > 0))),
    CONSTRAINT "tickets_title_check" CHECK ((("char_length"("title") <= 200) AND ("char_length"("title") > 0)))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."tickets" IS 'Maintenance/support tickets. Access: Creators, property managers, and tenants of the property can view/update. Managers and admins can update status.';



CREATE TABLE IF NOT EXISTS "public"."user_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "granted" boolean DEFAULT false NOT NULL,
    "granted_at" timestamp with time zone,
    "withdrawn_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_consents_consent_type_check" CHECK (("consent_type" = ANY (ARRAY['analytics'::"text", 'marketing'::"text", 'third_party_sharing'::"text"])))
);


ALTER TABLE "public"."user_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme_mode" "text" DEFAULT 'system'::"text",
    "font_size" "text" DEFAULT 'md'::"text",
    "date_format" "text" DEFAULT 'PPP'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'en'::"text",
    "week_start_day" "text" DEFAULT 'monday'::"text",
    "cookie_consent_analytics" boolean DEFAULT false,
    "cookie_consent_given_at" timestamp with time zone,
    CONSTRAINT "user_preferences_date_format_check" CHECK (("date_format" = ANY (ARRAY['PPP'::"text", 'MM/dd/yyyy'::"text", 'dd/MM/yyyy'::"text", 'yyyy-MM-dd'::"text"]))),
    CONSTRAINT "user_preferences_font_size_check" CHECK (("font_size" = ANY (ARRAY['sm'::"text", 'md'::"text", 'lg'::"text"]))),
    CONSTRAINT "user_preferences_language_format_check" CHECK (("language" ~ '^[a-z]{2}(-[A-Z]{2})?$'::"text")),
    CONSTRAINT "user_preferences_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"]))),
    CONSTRAINT "week_start_day_check" CHECK (("week_start_day" = ANY (ARRAY['sunday'::"text", 'monday'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "subscription_type" "public"."subscription_type" DEFAULT 'free'::"public"."subscription_type" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "canceled_at" timestamp with time zone,
    "grace_period_ends_at" timestamp with time zone,
    "admin_granted_by" "uuid",
    "admin_granted_at" timestamp with time zone,
    "admin_granted_reason" "text",
    "admin_granted_duration_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."utility_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "utility_type" "text" NOT NULL,
    "custom_utility_name" "text",
    "amount_cents" bigint NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "billing_period_start" "date" NOT NULL,
    "billing_period_end" "date" NOT NULL,
    "payment_due_date" "date" NOT NULL,
    "payment_date" "date",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "proof_of_payment_url" "text",
    "proof_review_status" "text" DEFAULT 'pending'::"text",
    "proof_review_notes" "text",
    "manager_reviewed_by" "uuid",
    "manager_reviewed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "utility_payments_proof_review_status_check" CHECK (("proof_review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "utility_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"]))),
    CONSTRAINT "utility_payments_utility_type_check" CHECK (("utility_type" = ANY (ARRAY['electricity'::"text", 'gas'::"text", 'water'::"text", 'internet'::"text", 'heating'::"text", 'trash'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."utility_payments" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_navigation_paths"
    ADD CONSTRAINT "analytics_navigation_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_page_views"
    ADD CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_signatures"
    ADD CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_job_health"
    ADD CONSTRAINT "cron_job_health_job_name_key" UNIQUE ("job_name");



ALTER TABLE ONLY "public"."cron_job_health"
    ADD CONSTRAINT "cron_job_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_retention_audit"
    ADD CONSTRAINT "data_retention_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enterprise_contact_requests"
    ADD CONSTRAINT "enterprise_contact_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grace_period_reminders_sent"
    ADD CONSTRAINT "grace_period_reminders_sent_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_logs"
    ADD CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_email_property_id_key" UNIQUE ("email", "property_id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."language_settings"
    ADD CONSTRAINT "language_settings_language_code_key" UNIQUE ("language_code");



ALTER TABLE ONLY "public"."language_settings"
    ADD CONSTRAINT "language_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_stripe_accounts"
    ADD CONSTRAINT "manager_stripe_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_stripe_accounts"
    ADD CONSTRAINT "manager_stripe_accounts_stripe_account_id_key" UNIQUE ("stripe_account_id");



ALTER TABLE ONLY "public"."payment_disputes"
    ADD CONSTRAINT "payment_disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_disputes"
    ADD CONSTRAINT "payment_disputes_stripe_dispute_id_key" UNIQUE ("stripe_dispute_id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."privacy_requests"
    ADD CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_tenants"
    ADD CONSTRAINT "property_tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qualified_signature_logs"
    ADD CONSTRAINT "qualified_signature_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qualified_signature_providers"
    ADD CONSTRAINT "qualified_signature_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qualified_signature_providers"
    ADD CONSTRAINT "qualified_signature_providers_provider_code_key" UNIQUE ("provider_code");



ALTER TABLE ONLY "public"."recurring_schedules"
    ADD CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_agreements"
    ADD CONSTRAINT "rent_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_shops"
    ADD CONSTRAINT "repair_shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."standard_maintenance_templates"
    ADD CONSTRAINT "standard_maintenance_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_templates"
    ADD CONSTRAINT "ticket_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "unique_active_subscription_per_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."grace_period_reminders_sent"
    ADD CONSTRAINT "unique_reminder_per_subscription_day" UNIQUE ("user_subscription_id", "reminder_day");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "unique_usage_per_user_year" UNIQUE ("user_id", "year");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_user_id_consent_type_key" UNIQUE ("user_id", "consent_type");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utility_payments"
    ADD CONSTRAINT "utility_payments_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_analytics_events_event_name" ON "public"."analytics_events" USING "btree" ("event_name");



CREATE INDEX "idx_analytics_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_events_timestamp" ON "public"."analytics_events" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_navigation_paths_from_path" ON "public"."analytics_navigation_paths" USING "btree" ("from_path");



CREATE INDEX "idx_analytics_navigation_paths_session_id" ON "public"."analytics_navigation_paths" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_navigation_paths_timestamp" ON "public"."analytics_navigation_paths" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_analytics_navigation_paths_to_path" ON "public"."analytics_navigation_paths" USING "btree" ("to_path");



CREATE INDEX "idx_analytics_page_views_country" ON "public"."analytics_page_views" USING "btree" ("country");



CREATE INDEX "idx_analytics_page_views_page_path" ON "public"."analytics_page_views" USING "btree" ("page_path");



CREATE INDEX "idx_analytics_page_views_session_id" ON "public"."analytics_page_views" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_page_views_timestamp" ON "public"."analytics_page_views" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_analytics_page_views_user_id" ON "public"."analytics_page_views" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_sessions_session_id" ON "public"."analytics_sessions" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_sessions_started_at" ON "public"."analytics_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_analytics_sessions_user_id" ON "public"."analytics_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_contract_signatures_initiated_by" ON "public"."contract_signatures" USING "btree" ("initiated_by");



CREATE INDEX "idx_contract_signatures_property" ON "public"."contract_signatures" USING "btree" ("property_id");



CREATE INDEX "idx_contract_signatures_qualified_session" ON "public"."contract_signatures" USING "btree" ("qualified_signature_session_id") WHERE ("qualified_signature_session_id" IS NOT NULL);



CREATE INDEX "idx_contract_signatures_tenancy" ON "public"."contract_signatures" USING "btree" ("tenancy_id");



CREATE INDEX "idx_contract_signatures_workflow_status" ON "public"."contract_signatures" USING "btree" ("workflow_status");



CREATE INDEX "idx_cron_job_health_job_name" ON "public"."cron_job_health" USING "btree" ("job_name");



CREATE INDEX "idx_cron_job_health_last_run_at" ON "public"."cron_job_health" USING "btree" ("last_run_at");



CREATE INDEX "idx_enterprise_requests_created_at" ON "public"."enterprise_contact_requests" USING "btree" ("created_at");



CREATE INDEX "idx_enterprise_requests_status" ON "public"."enterprise_contact_requests" USING "btree" ("status");



CREATE INDEX "idx_enterprise_requests_user_id" ON "public"."enterprise_contact_requests" USING "btree" ("user_id");



CREATE INDEX "idx_grace_reminders_subscription" ON "public"."grace_period_reminders_sent" USING "btree" ("user_subscription_id");



CREATE INDEX "idx_import_logs_created_at" ON "public"."import_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_import_logs_manager_id" ON "public"."import_logs" USING "btree" ("manager_id");



CREATE INDEX "idx_inspection_items_inspection_id" ON "public"."inspection_items" USING "btree" ("inspection_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_manager_stripe_accounts_manager_id" ON "public"."manager_stripe_accounts" USING "btree" ("manager_id");



CREATE UNIQUE INDEX "idx_one_active_tenant_per_property" ON "public"."property_tenants" USING "btree" ("property_id") WHERE ("tenancy_status" = 'active'::"text");



CREATE UNIQUE INDEX "idx_one_ending_tenancy_per_address" ON "public"."properties" USING "btree" ("address") WHERE ("status" = 'ending_tenancy'::"public"."property_status");



CREATE UNIQUE INDEX "idx_one_ending_tenant_per_property" ON "public"."property_tenants" USING "btree" ("property_id") WHERE ("tenancy_status" = 'ending_tenancy'::"text");



CREATE INDEX "idx_payment_disputes_dispute_status" ON "public"."payment_disputes" USING "btree" ("dispute_status");



CREATE INDEX "idx_payment_disputes_rent_payment_id" ON "public"."payment_disputes" USING "btree" ("rent_payment_id");



CREATE INDEX "idx_payment_disputes_stripe_dispute_id" ON "public"."payment_disputes" USING "btree" ("stripe_dispute_id");



CREATE INDEX "idx_payment_reminders_payment_id" ON "public"."payment_reminders" USING "btree" ("rent_payment_id");



CREATE INDEX "idx_payment_reminders_rent_payment_type_sent" ON "public"."payment_reminders" USING "btree" ("rent_payment_id", "reminder_type", "sent_at");



CREATE INDEX "idx_payment_reminders_sent_at" ON "public"."payment_reminders" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_payment_reminders_type" ON "public"."payment_reminders" USING "btree" ("reminder_type");



CREATE INDEX "idx_profiles_dock_credential_id" ON "public"."profiles" USING "btree" ("kyc_credential_id") WHERE ("kyc_credential_id" IS NOT NULL);



CREATE INDEX "idx_profiles_email_verification_token" ON "public"."profiles" USING "btree" ("email_verification_token") WHERE ("email_verification_token" IS NOT NULL);



CREATE INDEX "idx_profiles_kyc_status" ON "public"."profiles" USING "btree" ("kyc_status");



CREATE INDEX "idx_profiles_kyc_verified" ON "public"."profiles" USING "btree" ("kyc_verified_at") WHERE ("kyc_verified_at" IS NOT NULL);



CREATE INDEX "idx_profiles_kyc_wallet_did" ON "public"."profiles" USING "btree" ("kyc_wallet_did") WHERE ("kyc_wallet_did" IS NOT NULL);



CREATE INDEX "idx_properties_manager_id" ON "public"."properties" USING "btree" ("manager_id");



CREATE INDEX "idx_properties_status" ON "public"."properties" USING "btree" ("status");



CREATE INDEX "idx_property_docs_category" ON "public"."property_documents" USING "btree" ("property_id", "document_category");



CREATE INDEX "idx_property_docs_tenancy" ON "public"."property_documents" USING "btree" ("tenancy_id") WHERE ("tenancy_id" IS NOT NULL);



CREATE INDEX "idx_property_documents_id_tenancy" ON "public"."property_documents" USING "btree" ("id", "tenancy_id");



CREATE INDEX "idx_property_documents_latest" ON "public"."property_documents" USING "btree" ("property_id", "is_latest_version");



CREATE INDEX "idx_property_documents_parent" ON "public"."property_documents" USING "btree" ("parent_document_id");



CREATE INDEX "idx_property_documents_property" ON "public"."property_documents" USING "btree" ("property_id");



CREATE INDEX "idx_property_documents_title" ON "public"."property_documents" USING "btree" ("property_id", "document_title");



CREATE INDEX "idx_property_documents_uploaded_by" ON "public"."property_documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_property_tenants_property_id" ON "public"."property_tenants" USING "btree" ("property_id");



CREATE INDEX "idx_property_tenants_tenant_id" ON "public"."property_tenants" USING "btree" ("tenant_id");



CREATE INDEX "idx_qualified_logs_contract_signature" ON "public"."qualified_signature_logs" USING "btree" ("contract_signature_id");



CREATE INDEX "idx_qualified_logs_session" ON "public"."qualified_signature_logs" USING "btree" ("session_id");



CREATE INDEX "idx_qualified_providers_countries" ON "public"."qualified_signature_providers" USING "gin" ("country_codes");



CREATE INDEX "idx_recurring_schedules_next_run" ON "public"."recurring_schedules" USING "btree" ("next_run_date") WHERE ("is_active" = true);



CREATE INDEX "idx_recurring_schedules_property" ON "public"."recurring_schedules" USING "btree" ("property_id");



CREATE INDEX "idx_recurring_schedules_template" ON "public"."recurring_schedules" USING "btree" ("template_id");



CREATE INDEX "idx_rent_agreements_manager_id" ON "public"."rent_agreements" USING "btree" ("manager_id");



CREATE INDEX "idx_rent_agreements_manager_tenant" ON "public"."rent_agreements" USING "btree" ("manager_id", "tenant_id");



CREATE INDEX "idx_rent_agreements_mandate_status" ON "public"."rent_agreements" USING "btree" ("mandate_status");



CREATE INDEX "idx_rent_agreements_property_id" ON "public"."rent_agreements" USING "btree" ("property_id");



CREATE INDEX "idx_rent_agreements_tenancy_id" ON "public"."rent_agreements" USING "btree" ("tenancy_id");



CREATE INDEX "idx_rent_agreements_tenant_id" ON "public"."rent_agreements" USING "btree" ("tenant_id");



CREATE INDEX "idx_rent_payments_manager_id" ON "public"."rent_payments" USING "btree" ("manager_id");



CREATE INDEX "idx_rent_payments_manager_tenant" ON "public"."rent_payments" USING "btree" ("manager_id", "tenant_id");



CREATE INDEX "idx_rent_payments_payment_date" ON "public"."rent_payments" USING "btree" ("payment_date");



CREATE INDEX "idx_rent_payments_payment_status" ON "public"."rent_payments" USING "btree" ("payment_status");



CREATE INDEX "idx_rent_payments_proof_review" ON "public"."rent_payments" USING "btree" ("proof_review_status", "manager_reviewed");



CREATE INDEX "idx_rent_payments_property_id" ON "public"."rent_payments" USING "btree" ("property_id");



CREATE INDEX "idx_rent_payments_rent_agreement_id" ON "public"."rent_payments" USING "btree" ("rent_agreement_id");



CREATE INDEX "idx_rent_payments_status_due_date" ON "public"."rent_payments" USING "btree" ("status", "payment_due_date");



CREATE INDEX "idx_rent_payments_stripe_payment_intent_id" ON "public"."rent_payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_rent_payments_tenant_id" ON "public"."rent_payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_repair_shops_active" ON "public"."repair_shops" USING "btree" ("manager_id", "is_active");



CREATE INDEX "idx_repair_shops_manager" ON "public"."repair_shops" USING "btree" ("manager_id");



CREATE INDEX "idx_repair_shops_manager_active" ON "public"."repair_shops" USING "btree" ("manager_id", "is_active");



CREATE INDEX "idx_signature_events_contract_signature" ON "public"."signature_events" USING "btree" ("contract_signature_id");



CREATE INDEX "idx_signature_events_created_at" ON "public"."signature_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_stripe_webhook_events_created_at" ON "public"."stripe_webhook_events" USING "btree" ("created_at");



CREATE INDEX "idx_stripe_webhook_events_event_type" ON "public"."stripe_webhook_events" USING "btree" ("event_type");



CREATE INDEX "idx_stripe_webhook_events_processed" ON "public"."stripe_webhook_events" USING "btree" ("processed");



CREATE INDEX "idx_stripe_webhook_events_stripe_event_id" ON "public"."stripe_webhook_events" USING "btree" ("stripe_event_id");



CREATE INDEX "idx_subscription_history_changed_at" ON "public"."subscription_history" USING "btree" ("changed_at");



CREATE INDEX "idx_subscription_history_user_id" ON "public"."subscription_history" USING "btree" ("user_id");



CREATE INDEX "idx_subscription_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");



CREATE INDEX "idx_subscription_plans_status" ON "public"."subscription_plans" USING "btree" ("status");



CREATE INDEX "idx_subscription_usage_user_year" ON "public"."subscription_usage" USING "btree" ("user_id", "year");



CREATE INDEX "idx_subscription_usage_year" ON "public"."subscription_usage" USING "btree" ("year");



CREATE INDEX "idx_tenancies_started_at" ON "public"."property_tenants" USING "btree" ("property_id", "started_at" DESC);



CREATE INDEX "idx_tenancy_inspections_property_id" ON "public"."tenancy_inspections" USING "btree" ("property_id");



CREATE INDEX "idx_tenancy_inspections_status" ON "public"."tenancy_inspections" USING "btree" ("status");



CREATE INDEX "idx_tenancy_inspections_tenancy_id" ON "public"."tenancy_inspections" USING "btree" ("tenancy_id");



CREATE INDEX "idx_tenancy_requirements_invitation" ON "public"."tenancy_requirements" USING "btree" ("invitation_id");



CREATE INDEX "idx_tenancy_requirements_property" ON "public"."tenancy_requirements" USING "btree" ("property_id");



CREATE INDEX "idx_tenancy_requirements_status" ON "public"."tenancy_requirements" USING "btree" ("status");



CREATE INDEX "idx_tenancy_requirements_tenancy" ON "public"."tenancy_requirements" USING "btree" ("tenancy_id");



CREATE INDEX "idx_ticket_activities_ticket" ON "public"."ticket_activities" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_attachments_ticket" ON "public"."ticket_attachments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_attachments_type" ON "public"."ticket_attachments" USING "btree" ("ticket_id", "file_type");



CREATE INDEX "idx_ticket_comments_ticket" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_templates_created_by" ON "public"."ticket_templates" USING "btree" ("created_by");



CREATE INDEX "idx_ticket_templates_property" ON "public"."ticket_templates" USING "btree" ("property_id");



CREATE INDEX "idx_tickets_created_by_assigned_to" ON "public"."tickets" USING "btree" ("created_by", "assigned_to");



CREATE INDEX "idx_tickets_source_template" ON "public"."tickets" USING "btree" ("source_template_id");



CREATE INDEX "idx_user_consents_consent_type" ON "public"."user_consents" USING "btree" ("consent_type");



CREATE INDEX "idx_user_consents_user_id" ON "public"."user_consents" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_user_subscriptions_grace_period" ON "public"."user_subscriptions" USING "btree" ("grace_period_ends_at") WHERE ("grace_period_ends_at" IS NOT NULL);



CREATE INDEX "idx_user_subscriptions_status" ON "public"."user_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_user_subscriptions_stripe_customer" ON "public"."user_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_utility_payments_manager_tenant" ON "public"."utility_payments" USING "btree" ("manager_id", "tenant_id");



CREATE INDEX "idx_utility_payments_payment_date" ON "public"."utility_payments" USING "btree" ("payment_date");



CREATE OR REPLACE TRIGGER "after_rent_agreement_activated" AFTER INSERT OR UPDATE OF "is_active", "tenant_iban" ON "public"."rent_agreements" FOR EACH ROW WHEN ((("new"."is_active" = true) AND ("new"."tenant_iban" IS NOT NULL))) EXECUTE FUNCTION "public"."trigger_generate_rent_payments"();



CREATE OR REPLACE TRIGGER "set_ticket_number" BEFORE INSERT ON "public"."tickets" FOR EACH ROW WHEN (("new"."ticket_number" = ''::"text")) EXECUTE FUNCTION "public"."generate_ticket_number"();



CREATE OR REPLACE TRIGGER "update_brand_settings_updated_at" BEFORE UPDATE ON "public"."brand_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contract_signatures_updated_at" BEFORE UPDATE ON "public"."contract_signatures" FOR EACH ROW EXECUTE FUNCTION "public"."update_contract_signatures_updated_at"();



CREATE OR REPLACE TRIGGER "update_cron_job_health_updated_at" BEFORE UPDATE ON "public"."cron_job_health" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_enterprise_contact_requests_updated_at" BEFORE UPDATE ON "public"."enterprise_contact_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inspection_items_updated_at" BEFORE UPDATE ON "public"."inspection_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_manager_stripe_accounts_updated_at" BEFORE UPDATE ON "public"."manager_stripe_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_disputes_updated_at" BEFORE UPDATE ON "public"."payment_disputes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_privacy_requests_updated_at" BEFORE UPDATE ON "public"."privacy_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_documents_updated_at" BEFORE UPDATE ON "public"."property_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_schedules_updated_at" BEFORE UPDATE ON "public"."recurring_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rent_agreements_updated_at" BEFORE UPDATE ON "public"."rent_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rent_payments_updated_at" BEFORE UPDATE ON "public"."rent_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_repair_shops_updated_at" BEFORE UPDATE ON "public"."repair_shops" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_standard_maintenance_templates_updated_at" BEFORE UPDATE ON "public"."standard_maintenance_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscription_usage_updated_at" BEFORE UPDATE ON "public"."subscription_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenancy_inspections_updated_at" BEFORE UPDATE ON "public"."tenancy_inspections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenancy_requirements_updated_at" BEFORE UPDATE ON "public"."tenancy_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_comments_updated_at" BEFORE UPDATE ON "public"."ticket_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_templates_updated_at" BEFORE UPDATE ON "public"."ticket_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tickets_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_consents_updated_at" BEFORE UPDATE ON "public"."user_consents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_utility_payments_updated_at" BEFORE UPDATE ON "public"."utility_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_navigation_paths"
    ADD CONSTRAINT "analytics_navigation_paths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_page_views"
    ADD CONSTRAINT "analytics_page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."analytics_sessions"
    ADD CONSTRAINT "analytics_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_signatures"
    ADD CONSTRAINT "contract_signatures_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_signatures"
    ADD CONSTRAINT "contract_signatures_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_signatures"
    ADD CONSTRAINT "contract_signatures_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "public"."property_documents"("id");



ALTER TABLE ONLY "public"."contract_signatures"
    ADD CONSTRAINT "contract_signatures_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "public"."property_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enterprise_contact_requests"
    ADD CONSTRAINT "enterprise_contact_requests_contacted_by_fkey" FOREIGN KEY ("contacted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."enterprise_contact_requests"
    ADD CONSTRAINT "enterprise_contact_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."grace_period_reminders_sent"
    ADD CONSTRAINT "grace_period_reminders_sent_user_subscription_id_fkey" FOREIGN KEY ("user_subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."import_logs"
    ADD CONSTRAINT "import_logs_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "public"."tenancy_inspections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_tenancy_requirements_id_fkey" FOREIGN KEY ("tenancy_requirements_id") REFERENCES "public"."tenancy_requirements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."language_settings"
    ADD CONSTRAINT "language_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."manager_stripe_accounts"
    ADD CONSTRAINT "manager_stripe_accounts_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_disputes"
    ADD CONSTRAINT "payment_disputes_rent_payment_id_fkey" FOREIGN KEY ("rent_payment_id") REFERENCES "public"."rent_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_rent_payment_id_fkey" FOREIGN KEY ("rent_payment_id") REFERENCES "public"."rent_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."privacy_requests"
    ADD CONSTRAINT "privacy_requests_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."privacy_requests"
    ADD CONSTRAINT "privacy_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "public"."property_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "public"."property_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_documents"
    ADD CONSTRAINT "property_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_tenants"
    ADD CONSTRAINT "property_tenants_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_tenants"
    ADD CONSTRAINT "property_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qualified_signature_logs"
    ADD CONSTRAINT "qualified_signature_logs_contract_signature_id_fkey" FOREIGN KEY ("contract_signature_id") REFERENCES "public"."contract_signatures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_schedules"
    ADD CONSTRAINT "recurring_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_schedules"
    ADD CONSTRAINT "recurring_schedules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_schedules"
    ADD CONSTRAINT "recurring_schedules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."ticket_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_agreements"
    ADD CONSTRAINT "rent_agreements_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_agreements"
    ADD CONSTRAINT "rent_agreements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_agreements"
    ADD CONSTRAINT "rent_agreements_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "public"."property_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_agreements"
    ADD CONSTRAINT "rent_agreements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_manager_reviewed_by_fkey" FOREIGN KEY ("manager_reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_rent_agreement_id_fkey" FOREIGN KEY ("rent_agreement_id") REFERENCES "public"."rent_agreements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_shops"
    ADD CONSTRAINT "repair_shops_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."signature_events"
    ADD CONSTRAINT "signature_events_contract_signature_id_fkey" FOREIGN KEY ("contract_signature_id") REFERENCES "public"."contract_signatures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_from_plan_id_fkey" FOREIGN KEY ("from_plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."subscription_history"
    ADD CONSTRAINT "subscription_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_template_document_id_fkey" FOREIGN KEY ("template_document_id") REFERENCES "public"."property_documents"("id");



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "public"."property_tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenancy_inspections"
    ADD CONSTRAINT "tenancy_inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_selected_template_id_fkey" FOREIGN KEY ("selected_template_id") REFERENCES "public"."property_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenancy_requirements"
    ADD CONSTRAINT "tenancy_requirements_tenancy_id_fkey" FOREIGN KEY ("tenancy_id") REFERENCES "public"."property_tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_activities"
    ADD CONSTRAINT "ticket_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_templates"
    ADD CONSTRAINT "ticket_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_templates"
    ADD CONSTRAINT "ticket_templates_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_templates"
    ADD CONSTRAINT "ticket_templates_source_standard_template_id_fkey" FOREIGN KEY ("source_standard_template_id") REFERENCES "public"."standard_maintenance_templates"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "public"."ticket_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_admin_granted_by_fkey" FOREIGN KEY ("admin_granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utility_payments"
    ADD CONSTRAINT "utility_payments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utility_payments"
    ADD CONSTRAINT "utility_payments_manager_reviewed_by_fkey" FOREIGN KEY ("manager_reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."utility_payments"
    ADD CONSTRAINT "utility_payments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utility_payments"
    ADD CONSTRAINT "utility_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete any property" ON "public"."properties" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all enterprise requests" ON "public"."enterprise_contact_requests" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all privacy requests" ON "public"."privacy_requests" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage subscription plans" ON "public"."subscription_plans" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage subscriptions" ON "public"."user_subscriptions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update any property" ON "public"."properties" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all Stripe accounts" ON "public"."manager_stripe_accounts" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all consents" ON "public"."user_consents" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all disputes" ON "public"."payment_disputes" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all imports" ON "public"."import_logs" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all payment reminders" ON "public"."payment_reminders" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all payments" ON "public"."rent_payments" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all properties" ON "public"."properties" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all property documents" ON "public"."property_documents" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all repair shops" ON "public"."repair_shops" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all roles" ON "public"."user_roles" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all subscription history" ON "public"."subscription_history" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all subscriptions" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all tickets" ON "public"."tickets" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all usage" ON "public"."subscription_usage" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all utility payments" ON "public"."utility_payments" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view cron job health" ON "public"."cron_job_health" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view webhook events" ON "public"."stripe_webhook_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "All authenticated users can view system settings" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All users can view standard templates" ON "public"."standard_maintenance_templates" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Anyone can insert sessions" ON "public"."analytics_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can update their session" ON "public"."analytics_sessions" FOR UPDATE USING (true) WITH CHECK ((("session_id" = "current_setting"('app.session_id'::"text", true)) OR ("session_id" IS NOT NULL)));



CREATE POLICY "Anyone can view active providers" ON "public"."qualified_signature_providers" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view brand settings" ON "public"."brand_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view language settings" ON "public"."language_settings" FOR SELECT USING (true);



CREATE POLICY "Brand settings are publicly readable" ON "public"."brand_settings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Invited users can create own tenancy" ON "public"."property_tenants" FOR INSERT WITH CHECK ((("tenant_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM ("public"."invitations"
     JOIN "public"."profiles" ON (("profiles"."id" = "auth"."uid"())))
  WHERE (("invitations"."property_id" = "property_tenants"."property_id") AND ("invitations"."email" = "profiles"."email") AND ("invitations"."status" = 'pending'::"public"."invitation_status") AND ("invitations"."expires_at" > "now"()))))));



CREATE POLICY "Invited users can view properties they are invited to" ON "public"."properties" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."invitations" "i"
  WHERE (("i"."property_id" = "properties"."id") AND ("lower"("i"."email") = "lower"("public"."get_auth_user_email"())) AND ("i"."status" = 'pending'::"public"."invitation_status") AND ("i"."expires_at" > "now"())))));



CREATE POLICY "Managers can create import logs" ON "public"."import_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can create inspection items" ON "public"."inspection_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tenancy_inspections" "ti"
  WHERE (("ti"."id" = "inspection_items"."inspection_id") AND "public"."is_property_manager"("auth"."uid"(), "ti"."property_id")))));



CREATE POLICY "Managers can create inspections for their properties" ON "public"."tenancy_inspections" FOR INSERT WITH CHECK (("public"."is_property_manager"("auth"."uid"(), "property_id") AND ("auth"."uid"() = "created_by")));



CREATE POLICY "Managers can create invitations for their active properties" ON "public"."invitations" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "invitations"."property_id") AND ("properties"."manager_id" = "auth"."uid"()) AND ("properties"."status" = 'active'::"public"."property_status")))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can create own Stripe accounts" ON "public"."manager_stripe_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can create rent agreements for their properties" ON "public"."rent_agreements" FOR INSERT WITH CHECK ((("auth"."uid"() = "manager_id") AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can create repair shops" ON "public"."repair_shops" FOR INSERT WITH CHECK (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can create requirements for their properties" ON "public"."tenancy_requirements" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can create schedules for their properties" ON "public"."recurring_schedules" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can create templates for their properties" ON "public"."ticket_templates" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can create tenancies" ON "public"."property_tenants" FOR INSERT WITH CHECK (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can delete draft inspections" ON "public"."tenancy_inspections" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") AND ("status" = 'draft'::"public"."inspection_status")));



CREATE POLICY "Managers can delete draft or sent requirements" ON "public"."tenancy_requirements" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") AND ("status" = ANY (ARRAY['draft'::"text", 'sent'::"text"]))));



CREATE POLICY "Managers can delete inspection items" ON "public"."inspection_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."tenancy_inspections" "ti"
  WHERE (("ti"."id" = "inspection_items"."inspection_id") AND "public"."is_property_manager"("auth"."uid"(), "ti"."property_id") AND ("ti"."status" = ANY (ARRAY['draft'::"public"."inspection_status", 'in_progress'::"public"."inspection_status"]))))));



CREATE POLICY "Managers can delete own repair shops" ON "public"."repair_shops" FOR DELETE USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can delete schedules for their properties" ON "public"."recurring_schedules" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can delete signatures they initiated" ON "public"."contract_signatures" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "initiated_by") AND ("workflow_status" = ANY (ARRAY['in_progress'::"text", 'pending'::"text"]))));



CREATE POLICY "Managers can delete templates for their properties" ON "public"."ticket_templates" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can delete tenancies" ON "public"."property_tenants" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can delete their properties" ON "public"."properties" FOR DELETE USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can initiate signatures for their properties" ON "public"."contract_signatures" FOR INSERT WITH CHECK ((("auth"."uid"() = "initiated_by") AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can manage rent payments" ON "public"."rent_payments" USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can manage utility payments for their properties" ON "public"."utility_payments" USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can update inspection items" ON "public"."inspection_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."tenancy_inspections" "ti"
  WHERE (("ti"."id" = "inspection_items"."inspection_id") AND "public"."is_property_manager"("auth"."uid"(), "ti"."property_id")))));



CREATE POLICY "Managers can update inspections for their properties" ON "public"."tenancy_inspections" FOR UPDATE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can update own Stripe accounts" ON "public"."manager_stripe_accounts" FOR UPDATE USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can update own imports" ON "public"."import_logs" FOR UPDATE USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can update own repair shops" ON "public"."repair_shops" FOR UPDATE USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can update rent agreements for their properties" ON "public"."rent_agreements" FOR UPDATE USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can update requirements for their properties" ON "public"."tenancy_requirements" FOR UPDATE USING ("public"."is_property_manager"("auth"."uid"(), "property_id")) WITH CHECK ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can update schedules for their properties" ON "public"."recurring_schedules" FOR UPDATE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can update templates for their properties" ON "public"."ticket_templates" FOR UPDATE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can update tenancies" ON "public"."property_tenants" FOR UPDATE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can update their active properties" ON "public"."properties" FOR UPDATE USING ((("auth"."uid"() = "manager_id") AND ("status" = 'active'::"public"."property_status")));



CREATE POLICY "Managers can update tickets for their properties" ON "public"."tickets" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "tickets"."property_id") AND ("properties"."manager_id" = "auth"."uid"())))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view disputes for their payments" ON "public"."payment_disputes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rent_payments" "rp"
  WHERE (("rp"."id" = "payment_disputes"."rent_payment_id") AND "public"."is_property_manager"("auth"."uid"(), "rp"."property_id")))));



CREATE POLICY "Managers can view global templates" ON "public"."property_documents" FOR SELECT USING ((("document_category" = 'property'::"text") AND ("property_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE ("properties"."manager_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view inspections for their properties" ON "public"."tenancy_inspections" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view own Stripe accounts" ON "public"."manager_stripe_accounts" FOR SELECT USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can view own imports" ON "public"."import_logs" FOR SELECT USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can view own repair shops" ON "public"."repair_shops" FOR SELECT USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can view payment reminders for their properties" ON "public"."payment_reminders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rent_payments" "rp"
  WHERE (("rp"."id" = "payment_reminders"."rent_payment_id") AND "public"."is_property_manager"("auth"."uid"(), "rp"."property_id")))));



CREATE POLICY "Managers can view payments for their properties" ON "public"."rent_payments" FOR SELECT USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can view property templates directly" ON "public"."property_documents" FOR SELECT USING ((("document_category" = 'property'::"text") AND ("property_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."manager_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view property tenancies" ON "public"."property_tenants" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view rent agreements for their properties" ON "public"."rent_agreements" FOR SELECT USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can view requirements for their properties" ON "public"."tenancy_requirements" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view schedules for their properties" ON "public"."recurring_schedules" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view signatures for their properties" ON "public"."contract_signatures" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view templates for their properties" ON "public"."ticket_templates" FOR SELECT USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Managers can view tenancy documents for their properties" ON "public"."property_documents" FOR SELECT USING ((("document_category" = 'tenancy'::"text") AND ("property_id" IS NOT NULL) AND "public"."is_property_manager"("auth"."uid"(), "property_id")));



CREATE POLICY "Managers can view their own properties" ON "public"."properties" FOR SELECT USING (("auth"."uid"() = "manager_id"));



CREATE POLICY "Managers can view their rent payments" ON "public"."rent_payments" FOR SELECT USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Managers can view their tenants profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."property_tenants" "pt"
     JOIN "public"."properties" "p" ON (("p"."id" = "pt"."property_id")))
  WHERE (("pt"."tenant_id" = "profiles"."id") AND ("p"."manager_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view tickets for their properties" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "tickets"."property_id") AND ("properties"."manager_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view uploaders of their property documents" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "pd"."uploaded_by"
   FROM ("public"."property_documents" "pd"
     JOIN "public"."properties" "p" ON (("p"."id" = "pd"."property_id")))
  WHERE ("p"."manager_id" = "auth"."uid"()))));



CREATE POLICY "Managers can view utility payments for their properties" ON "public"."utility_payments" FOR SELECT USING ("public"."is_property_manager"("auth"."uid"(), "property_id"));



CREATE POLICY "Only admins can insert brand settings" ON "public"."brand_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can insert system settings" ON "public"."system_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can manage standard templates" ON "public"."standard_maintenance_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can update brand settings" ON "public"."brand_settings" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can update language settings" ON "public"."language_settings" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can update system settings" ON "public"."system_settings" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can view analytics events" ON "public"."analytics_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can view analytics navigation paths" ON "public"."analytics_navigation_paths" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can view analytics page views" ON "public"."analytics_page_views" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can view analytics sessions" ON "public"."analytics_sessions" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Only admins can view data retention audit logs" ON "public"."data_retention_audit" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Public can track events" ON "public"."analytics_events" FOR INSERT WITH CHECK ((("event_name" IS NOT NULL) AND ("session_id" IS NOT NULL) AND ("length"("session_id") > 10)));



CREATE POLICY "Public can track navigation" ON "public"."analytics_navigation_paths" FOR INSERT WITH CHECK ((("to_path" IS NOT NULL) AND ("session_id" IS NOT NULL) AND ("length"("session_id") > 10)));



CREATE POLICY "Public can track page views" ON "public"."analytics_page_views" FOR INSERT WITH CHECK ((("page_path" IS NOT NULL) AND ("session_id" IS NOT NULL) AND ("length"("session_id") > 10)));



CREATE POLICY "Public can view active subscription plans" ON "public"."subscription_plans" FOR SELECT TO "authenticated", "anon" USING (("status" = 'active'::"public"."plan_status"));



CREATE POLICY "Public can view invitation by exact token match" ON "public"."invitations" FOR SELECT USING ((("token" IS NOT NULL) AND ("status" = 'pending'::"public"."invitation_status") AND ("expires_at" > "now"())));



CREATE POLICY "System can insert audit logs" ON "public"."data_retention_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert payment reminders" ON "public"."payment_reminders" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert payments" ON "public"."rent_payments" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can insert signature events" ON "public"."signature_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert subscription history" ON "public"."subscription_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can manage cron job health" ON "public"."cron_job_health" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can manage disputes" ON "public"."payment_disputes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can manage grace period reminders" ON "public"."grace_period_reminders_sent" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "System can manage usage" ON "public"."subscription_usage" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "System can manage webhook events" ON "public"."stripe_webhook_events" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can update page views for geolocation" ON "public"."analytics_page_views" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "System can update payments" ON "public"."rent_payments" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can update signatures" ON "public"."contract_signatures" FOR UPDATE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "contract_signatures"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"()))))));



CREATE POLICY "System can update subscriptions" ON "public"."user_subscriptions" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Tenants can create utility payments for their properties" ON "public"."utility_payments" FOR INSERT WITH CHECK ((("auth"."uid"() = "tenant_id") AND "public"."is_property_tenant"("auth"."uid"(), "property_id")));



CREATE POLICY "Tenants can sign their inspections" ON "public"."tenancy_inspections" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "tenancy_inspections"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"())))) AND ("status" = 'pending_signatures'::"public"."inspection_status")));



CREATE POLICY "Tenants can update their payment proof" ON "public"."rent_payments" FOR UPDATE USING (("auth"."uid"() = "tenant_id")) WITH CHECK (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can update their rent agreements" ON "public"."rent_agreements" FOR UPDATE USING (("auth"."uid"() = "tenant_id")) WITH CHECK (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can update their tenancy document versions" ON "public"."property_documents" FOR UPDATE USING ((("document_category" = 'tenancy'::"text") AND ("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "property_documents"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"()) AND ("pt"."tenancy_status" = ANY (ARRAY['active'::"text", 'ending_tenancy'::"text"]))))))) WITH CHECK ((("document_category" = 'tenancy'::"text") AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Tenants can update their utility payments" ON "public"."utility_payments" FOR UPDATE USING (("auth"."uid"() = "tenant_id")) WITH CHECK (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can update tickets for their properties" ON "public"."tickets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "tickets"."property_id") AND ("property_tenants"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view assigned properties" ON "public"."properties" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "properties"."id") AND ("property_tenants"."tenant_id" = "auth"."uid"()) AND ("property_tenants"."tenancy_status" = ANY (ARRAY['active'::"text", 'ending_tenancy'::"text"]))))));



CREATE POLICY "Tenants can view own tenancy" ON "public"."property_tenants" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Tenants can view requirements by email" ON "public"."tenancy_requirements" FOR SELECT USING ((("tenant_email" = ( SELECT "profiles"."email"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("status" = ANY (ARRAY['sent'::"text", 'accepted'::"text", 'completed'::"text"]))));



CREATE POLICY "Tenants can view schedules for their properties" ON "public"."recurring_schedules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "recurring_schedules"."property_id") AND ("property_tenants"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view templates for their properties" ON "public"."ticket_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "ticket_templates"."property_id") AND ("property_tenants"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their inspections" ON "public"."tenancy_inspections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "tenancy_inspections"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their managers SEPA details" ON "public"."profiles" FOR SELECT USING (("id" IN ( SELECT "p"."manager_id"
   FROM ("public"."properties" "p"
     JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "p"."id")))
  WHERE (("pt"."tenant_id" = "auth"."uid"()) AND ("pt"."tenancy_status" = ANY (ARRAY['active'::"text", 'ending_tenancy'::"text"]))))));



CREATE POLICY "Tenants can view their own disputes" ON "public"."payment_disputes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rent_payments" "rp"
  WHERE (("rp"."id" = "payment_disputes"."rent_payment_id") AND ("rp"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their own payments" ON "public"."rent_payments" FOR SELECT USING (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can view their rent agreements" ON "public"."rent_agreements" FOR SELECT USING (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can view their rent payments" ON "public"."rent_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rent_agreements" "ra"
  WHERE (("ra"."id" = "rent_payments"."rent_agreement_id") AND ("ra"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their signatures" ON "public"."contract_signatures" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "contract_signatures"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Tenants can view their tenancy documents" ON "public"."property_documents" FOR SELECT USING ((("document_category" = 'tenancy'::"text") AND ("property_id" IN ( SELECT "property_tenants"."property_id"
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."tenant_id" = "auth"."uid"()) AND ("property_tenants"."tenancy_status" = ANY (ARRAY['active'::"text", 'ending_tenancy'::"text"])))))));



CREATE POLICY "Tenants can view their tenancy requirements" ON "public"."tenancy_requirements" FOR SELECT USING (("tenancy_id" IN ( SELECT "property_tenants"."id"
   FROM "public"."property_tenants"
  WHERE ("property_tenants"."tenant_id" = "auth"."uid"()))));



CREATE POLICY "Tenants can view their utility payments" ON "public"."utility_payments" FOR SELECT USING (("auth"."uid"() = "tenant_id"));



CREATE POLICY "Tenants can view tickets for their properties" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "tickets"."property_id") AND ("property_tenants"."tenant_id" = "auth"."uid"())))));



CREATE POLICY "Users can add comments to accessible tickets" ON "public"."ticket_comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
     LEFT JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND ("t"."status" <> ALL (ARRAY['resolved'::"public"."ticket_status", 'cancelled'::"public"."ticket_status"])) AND (("p"."manager_id" = "auth"."uid"()) OR (("pt"."tenant_id" = "auth"."uid"()) AND ("p"."status" = 'active'::"public"."property_status")) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))))));



CREATE POLICY "Users can create enterprise contact requests" ON "public"."enterprise_contact_requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create own privacy requests" ON "public"."privacy_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create properties" ON "public"."properties" FOR INSERT WITH CHECK (("auth"."uid"() = "manager_id"));



CREATE POLICY "Users can create tickets for their properties" ON "public"."tickets" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (((EXISTS ( SELECT 1
   FROM "public"."property_tenants"
  WHERE (("property_tenants"."property_id" = "tickets"."property_id") AND ("property_tenants"."tenant_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "tickets"."property_id") AND ("properties"."status" = 'active'::"public"."property_status"))))) OR (EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE (("properties"."id" = "tickets"."property_id") AND ("properties"."manager_id" = "auth"."uid"())))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))));



CREATE POLICY "Users can delete documents" ON "public"."property_documents" FOR DELETE USING (("public"."is_property_manager"("auth"."uid"(), "property_id") OR (("document_category" = 'property'::"text") AND ("property_id" IS NULL) AND ("auth"."uid"() = "uploaded_by")) OR (("document_category" = 'tenancy'::"text") AND ("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."property_tenants" "pt"
  WHERE (("pt"."id" = "property_documents"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"()) AND ("pt"."tenancy_status" = 'active'::"text"))))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can delete their own attachments" ON "public"."ticket_attachments" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."tickets"
  WHERE (("tickets"."id" = "ticket_attachments"."ticket_id") AND ("tickets"."status" <> ALL (ARRAY['resolved'::"public"."ticket_status", 'cancelled'::"public"."ticket_status"])))))));



CREATE POLICY "Users can insert own consents" ON "public"."user_consents" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update invitations sent to them" ON "public"."invitations" FOR UPDATE TO "authenticated" USING ((("lower"("email") = "lower"("public"."get_auth_user_email"())) OR "public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))) WITH CHECK ((("lower"("email") = "lower"("public"."get_auth_user_email"())) OR "public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can update own consents" ON "public"."user_consents" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can upload attachments to their tickets" ON "public"."ticket_attachments" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "t"."property_id")))
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_attachments"."ticket_id") AND ("t"."status" <> ALL (ARRAY['resolved'::"public"."ticket_status", 'cancelled'::"public"."ticket_status"])) AND (("t"."created_by" = "auth"."uid"()) OR ("pt"."tenant_id" = "auth"."uid"()) OR ("p"."manager_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))))));



CREATE POLICY "Users can upload documents" ON "public"."property_documents" FOR INSERT WITH CHECK (((("auth"."uid"() = "uploaded_by") AND ((("document_category" = 'property'::"text") AND ("tenancy_id" IS NULL) AND ("property_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_documents"."property_id") AND ("p"."status" = 'active'::"public"."property_status") AND ("p"."manager_id" = "auth"."uid"()))))) OR (("document_category" = 'property'::"text") AND ("tenancy_id" IS NULL) AND ("property_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."properties"
  WHERE ("properties"."manager_id" = "auth"."uid"())))) OR (("document_category" = 'tenancy'::"text") AND ("tenancy_id" IS NOT NULL)))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can view activities for accessible tickets" ON "public"."ticket_activities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "t"."property_id")))
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_activities"."ticket_id") AND (("t"."created_by" = "auth"."uid"()) OR ("pt"."tenant_id" = "auth"."uid"()) OR ("p"."manager_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view attachments for tickets they can access" ON "public"."ticket_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "t"."property_id")))
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_attachments"."ticket_id") AND (("t"."created_by" = "auth"."uid"()) OR ("pt"."tenant_id" = "auth"."uid"()) OR ("p"."manager_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view inspection items for accessible inspections" ON "public"."inspection_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tenancy_inspections" "ti"
  WHERE (("ti"."id" = "inspection_items"."inspection_id") AND ("public"."is_property_manager"("auth"."uid"(), "ti"."property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR (EXISTS ( SELECT 1
           FROM "public"."property_tenants" "pt"
          WHERE (("pt"."id" = "ti"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view invitations sent to their email" ON "public"."invitations" FOR SELECT TO "authenticated" USING ((("lower"("email") = "lower"("public"."get_auth_user_email"())) OR "public"."is_property_manager"("auth"."uid"(), "property_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can view logs for accessible contracts" ON "public"."qualified_signature_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."contract_signatures" "cs"
     JOIN "public"."property_tenants" "pt" ON (("cs"."tenancy_id" = "pt"."id")))
  WHERE (("cs"."id" = "qualified_signature_logs"."contract_signature_id") AND (("pt"."tenant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."properties" "p"
          WHERE (("p"."id" = "cs"."property_id") AND ("p"."manager_id" = "auth"."uid"())))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view non-internal comments for accessible tickets" ON "public"."ticket_comments" FOR SELECT TO "authenticated" USING (((("is_internal" = false) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM ("public"."tickets" "t"
     JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND ("p"."manager_id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."property_tenants" "pt" ON (("pt"."property_id" = "t"."property_id")))
     LEFT JOIN "public"."properties" "p" ON (("p"."id" = "t"."property_id")))
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND (("t"."created_by" = "auth"."uid"()) OR ("pt"."tenant_id" = "auth"."uid"()) OR ("p"."manager_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))))));



CREATE POLICY "Users can view own consents" ON "public"."user_consents" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own enterprise requests" ON "public"."enterprise_contact_requests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own privacy requests" ON "public"."privacy_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own subscription" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own subscription history" ON "public"."subscription_history" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own usage" ON "public"."subscription_usage" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view signature events for accessible contracts" ON "public"."signature_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contract_signatures" "cs"
  WHERE (("cs"."id" = "signature_events"."contract_signature_id") AND ("public"."is_property_manager"("auth"."uid"(), "cs"."property_id") OR (EXISTS ( SELECT 1
           FROM "public"."property_tenants" "pt"
          WHERE (("pt"."id" = "cs"."tenancy_id") AND ("pt"."tenant_id" = "auth"."uid"())))) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view tickets they created" ON "public"."tickets" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "created_by"));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_navigation_paths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_page_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_signatures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cron_job_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_retention_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enterprise_contact_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grace_period_reminders_sent" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inspection_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."language_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manager_stripe_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."privacy_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qualified_signature_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qualified_signature_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rent_agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rent_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repair_shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signature_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."standard_maintenance_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenancy_inspections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenancy_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."utility_payments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_create_active_property"("p_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_active_property"("p_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_active_property"("p_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_end_tenancy"("p_property_id" "uuid", "p_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_end_tenancy"("p_property_id" "uuid", "p_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_end_tenancy"("p_property_id" "uuid", "p_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_photo"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_photo"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_photo"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_property_document"("_property_id" "uuid", "_file_size_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_property_document"("_property_id" "uuid", "_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_property_document"("_property_id" "uuid", "_file_size_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_video"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_video"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_video"("_ticket_id" "uuid", "_file_size_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_use_feature"("p_user_id" "uuid", "p_feature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_use_feature"("p_user_id" "uuid", "p_feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_use_feature"("p_user_id" "uuid", "p_feature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_full_profile"("_viewer_id" "uuid", "_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_full_profile"("_viewer_id" "uuid", "_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_full_profile"("_viewer_id" "uuid", "_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_has_account"("check_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_has_account"("check_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_has_account"("check_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_rent_payments"("p_agreement_id" "uuid", "p_months_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_rent_payments"("p_agreement_id" "uuid", "p_months_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_rent_payments"("p_agreement_id" "uuid", "p_months_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_ticket_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_properties_status_indicators"("p_property_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_properties_status_indicators"("p_property_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_properties_status_indicators"("p_property_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_gov_id_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_gov_id_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_gov_id_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_overage_gov_id"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_overage_gov_id"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_overage_gov_id"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_overage_signatures"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_overage_signatures"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_overage_signatures"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_signatures_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_signatures_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_signatures_used"("p_user_id" "uuid", "p_year" integer, "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_property_manager"("_user_id" "uuid", "_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_property_manager"("_user_id" "uuid", "_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_property_manager"("_user_id" "uuid", "_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_property_tenant"("_user_id" "uuid", "_property_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_property_tenant"("_user_id" "uuid", "_property_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_property_tenant"("_user_id" "uuid", "_property_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_generate_rent_payments"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_generate_rent_payments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_generate_rent_payments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contract_signatures_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contract_signatures_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contract_signatures_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_navigation_paths" TO "anon";
GRANT ALL ON TABLE "public"."analytics_navigation_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_navigation_paths" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_page_views" TO "anon";
GRANT ALL ON TABLE "public"."analytics_page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_page_views" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_sessions" TO "anon";
GRANT ALL ON TABLE "public"."analytics_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."brand_settings" TO "anon";
GRANT ALL ON TABLE "public"."brand_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_settings" TO "service_role";



GRANT ALL ON TABLE "public"."contract_signatures" TO "anon";
GRANT ALL ON TABLE "public"."contract_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_signatures" TO "service_role";



GRANT ALL ON TABLE "public"."cron_job_health" TO "anon";
GRANT ALL ON TABLE "public"."cron_job_health" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_job_health" TO "service_role";



GRANT ALL ON TABLE "public"."data_retention_audit" TO "anon";
GRANT ALL ON TABLE "public"."data_retention_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."data_retention_audit" TO "service_role";



GRANT ALL ON TABLE "public"."enterprise_contact_requests" TO "anon";
GRANT ALL ON TABLE "public"."enterprise_contact_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."enterprise_contact_requests" TO "service_role";



GRANT ALL ON TABLE "public"."grace_period_reminders_sent" TO "anon";
GRANT ALL ON TABLE "public"."grace_period_reminders_sent" TO "authenticated";
GRANT ALL ON TABLE "public"."grace_period_reminders_sent" TO "service_role";



GRANT ALL ON TABLE "public"."import_logs" TO "anon";
GRANT ALL ON TABLE "public"."import_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."import_logs" TO "service_role";



GRANT ALL ON TABLE "public"."inspection_items" TO "anon";
GRANT ALL ON TABLE "public"."inspection_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inspection_items" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."invitations_safe" TO "anon";
GRANT ALL ON TABLE "public"."invitations_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations_safe" TO "service_role";



GRANT ALL ON TABLE "public"."language_settings" TO "anon";
GRANT ALL ON TABLE "public"."language_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."language_settings" TO "service_role";



GRANT ALL ON TABLE "public"."manager_stripe_accounts" TO "anon";
GRANT ALL ON TABLE "public"."manager_stripe_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_stripe_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_disputes" TO "anon";
GRANT ALL ON TABLE "public"."payment_disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_disputes" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."privacy_requests" TO "anon";
GRANT ALL ON TABLE "public"."privacy_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."privacy_requests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_public" TO "anon";
GRANT ALL ON TABLE "public"."profiles_public" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_public" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_documents" TO "anon";
GRANT ALL ON TABLE "public"."property_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."property_documents" TO "service_role";



GRANT ALL ON TABLE "public"."property_tenants" TO "anon";
GRANT ALL ON TABLE "public"."property_tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."property_tenants" TO "service_role";



GRANT ALL ON TABLE "public"."qualified_signature_logs" TO "anon";
GRANT ALL ON TABLE "public"."qualified_signature_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."qualified_signature_logs" TO "service_role";



GRANT ALL ON TABLE "public"."qualified_signature_providers" TO "anon";
GRANT ALL ON TABLE "public"."qualified_signature_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."qualified_signature_providers" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_schedules" TO "anon";
GRANT ALL ON TABLE "public"."recurring_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."rent_agreements" TO "anon";
GRANT ALL ON TABLE "public"."rent_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."rent_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."rent_payments" TO "anon";
GRANT ALL ON TABLE "public"."rent_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."rent_payments" TO "service_role";



GRANT ALL ON TABLE "public"."repair_shops" TO "anon";
GRANT ALL ON TABLE "public"."repair_shops" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_shops" TO "service_role";



GRANT ALL ON TABLE "public"."signature_events" TO "anon";
GRANT ALL ON TABLE "public"."signature_events" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_events" TO "service_role";



GRANT ALL ON TABLE "public"."standard_maintenance_templates" TO "anon";
GRANT ALL ON TABLE "public"."standard_maintenance_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."standard_maintenance_templates" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_usage" TO "anon";
GRANT ALL ON TABLE "public"."subscription_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_usage" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenancy_inspections" TO "anon";
GRANT ALL ON TABLE "public"."tenancy_inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."tenancy_inspections" TO "service_role";



GRANT ALL ON TABLE "public"."tenancy_requirements" TO "anon";
GRANT ALL ON TABLE "public"."tenancy_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."tenancy_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_activities" TO "anon";
GRANT ALL ON TABLE "public"."ticket_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_activities" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_templates" TO "anon";
GRANT ALL ON TABLE "public"."ticket_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."user_consents" TO "anon";
GRANT ALL ON TABLE "public"."user_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."user_consents" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."utility_payments" TO "anon";
GRANT ALL ON TABLE "public"."utility_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."utility_payments" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Property managers can delete their property photos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'property-photos'::text) AND (EXISTS ( SELECT 1
   FROM public.properties
  WHERE ((properties.id = ((storage.foldername(objects.name))[1])::uuid) AND (properties.manager_id = auth.uid()))))));



  create policy "Property managers can update their property photos"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'property-photos'::text) AND (EXISTS ( SELECT 1
   FROM public.properties
  WHERE ((properties.id = ((storage.foldername(objects.name))[1])::uuid) AND (properties.manager_id = auth.uid()))))));



  create policy "Property managers can upload photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'property-photos'::text) AND (EXISTS ( SELECT 1
   FROM public.properties
  WHERE ((properties.id = ((storage.foldername(objects.name))[1])::uuid) AND (properties.manager_id = auth.uid()))))));



  create policy "Property managers can view their property photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'property-photos'::text) AND (EXISTS ( SELECT 1
   FROM public.properties
  WHERE ((properties.id = ((storage.foldername(objects.name))[1])::uuid) AND (properties.manager_id = auth.uid()))))));



  create policy "Tenants can view assigned property photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'property-photos'::text) AND (EXISTS ( SELECT 1
   FROM (public.property_tenants pt
     JOIN public.properties p ON ((p.id = pt.property_id)))
  WHERE ((p.id = ((storage.foldername(objects.name))[1])::uuid) AND (pt.tenant_id = auth.uid()) AND (pt.tenancy_status = ANY (ARRAY['active'::text, 'ending_tenancy'::text])))))));



