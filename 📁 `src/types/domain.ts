/**
 * Strict, shared TypeScript interfaces for domain entities.
 * Replaces `any` and loosely-typed Supabase responses with explicit contracts.
 */
import { Database } from '@/integrations/supabase/types';

// 🧑‍💼 User & Profile
export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  kyc_status: Database['public']['Enums']['kyc_status'] | null;
  email_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

// 🏢 Property
export interface Property {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  description: string | null;
  status: Database['public']['Enums']['property_status'];
  manager_id: string;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  delete_reason: Database['public']['Enums']['delete_reason'] | null;
}

// 🤝 Tenancy & Invitations
export interface Tenancy {
  id: string;
  property_id: string;
  tenant_id: string;
  tenancy_status: Database['public']['Enums']['tenancy_status'] | null;
  started_at: string;
  ended_at: string | null;
  planned_ending_date: string | null;
  end_reason: string | null;
  notes: string | null;
  property?: Pick<Property, 'title' | 'address'>;
}

export interface Invitation {
  id: string;
  property_id: string;
  email: string;
  status: Database['public']['Enums']['invitation_status'];
  expires_at: string;
  created_at: string;
  declined_at: string | null;
  decline_reason: string | null;
  property?: Pick<Property, 'title'>;
}

// 📄 Documents
export interface Document {
  id: string;
  document_title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_type: string;
  mime_type: string;
  description: string | null;
  version: number;
  is_latest_version: boolean | null;
  parent_document_id: string | null;
  property_id: string | null;
  tenancy_id: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// 💳 Subscription
export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  trial_days: number;
  grace_period_days: number;
  is_available_for_signup: boolean;
  is_default: boolean;
  feature_limits: Record<string, unknown>;
  features_display: Record<string, string[]> | null;
  limitations_display: Record<string, string[]> | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan: SubscriptionPlan;
  status: Database['public']['Enums']['subscription_status'];
  subscription_type: Database['public']['Enums']['subscription_type'];
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  grace_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

// 📊 Analytics
export interface AnalyticsEvent {
  event_name: string;
  event_category?: string;
  event_metadata?: Record<string, unknown>;
  page_path?: string;
  session_id: string;
  user_id: string | null;
}

export interface AnalyticsSession {
  session_id: string;
  user_id: string | null;
  is_authenticated: boolean | null;
  user_role: string | null;
  subscription_tier: string | null;
  started_at: string;
  ended_at: string | null;
  page_views_count: number | null;
  events_count: number | null;
  duration_seconds: number | null;
}
