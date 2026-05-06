export type { Json, Database } from './supabase';

// Public schema tables
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyTenant = Database['public']['Tables']['property_tenants']['Row'];
export type RentAgreement = Database['public']['Tables']['rent_agreements']['Row'];
export type RentPayment = Database['public']['Tables']['rent_payments']['Row'];
export type UtilityPayment = Database['public']['Tables']['utility_payments']['Row'];
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type TicketActivity = Database['public']['Tables']['ticket_activities']['Row'];
export type PropertyDocument = Database['public']['Tables']['property_documents']['Row'];
export type ContractSignature = Database['public']['Tables']['contract_signatures']['Row'];
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
export type SubscriptionUsage = Database['public']['Tables']['subscription_usage']['Row'];
export type Invitation = Database['public']['Tables']['invitations']['Row'];
export type RepairShop = Database['public']['Tables']['repair_shops']['Row'];
export type TenancyInspection = Database['public']['Tables']['tenancy_inspections']['Row'];
export type InspectionItem = Database['public']['Tables']['inspection_items']['Row'];
export type StandardMaintenanceTemplate = Database['public']['Tables']['standard_maintenance_templates']['Row'];
export type RecurringSchedule = Database['public']['Tables']['recurring_schedules']['Row'];
export type MaintenanceTask = Database['public']['Tables']['maintenance_tasks']['Row'];
export type PaymentReminder = Database['public']['Tables']['payment_reminders']['Row'];
export type SystemSetting = Database['public']['Tables']['system_settings']['Row'];
export type BrandSetting = Database['public']['Tables']['brand_settings']['Row'];
export type LanguageSetting = Database['public']['Tables']['language_settings']['Row'];
export type ImportLog = Database['public']['Tables']['import_logs']['Row'];

// Enums
export type KycStatus = Database['public']['Tables']['profiles']['Row']['kyc_status'];
export type PaymentStatus = Database['public']['Tables']['rent_payments']['Row']['payment_status'];
export type TicketStatus = Database['public']['Tables']['tickets']['Row']['status'];
export type TicketPriority = Database['public']['Tables']['tickets']['Row']['priority'];
export type SubscriptionStatus = Database['public']['Tables']['user_subscriptions']['Row']['status'];

// Insert types (for creating new records)
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type RentPaymentInsert = Database['public']['Tables']['rent_payments']['Insert'];
export type TicketInsert = Database['public']['Tables']['tickets']['Insert'];
export type PropertyDocumentInsert = Database['public']['Tables']['property_documents']['Insert'];

// Update types (for updating records)
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];
export type RentPaymentUpdate = Database['public']['Tables']['rent_payments']['Update'];
export type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

// Utility function for creating typed Supabase client
import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase';

export const createTypedClient = (url: string, key: string) => 
  createClient<Database>(url, key);