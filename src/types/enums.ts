import { STORAGE_BUCKETS } from '@/constants';
export { STORAGE_BUCKETS };
export type { BucketName } from '@/constants';

// ========== STATUS ENUMS (re-exported for convenience) ==========
export type {
  TenancyStatus,
  InvitationStatus,
  MandateStatus,
  PropertyStatus,
  PaymentStatus,
  UtilityPaymentStatus,
  UtilityType,
  TicketStatus,
  TicketPriority,
  KYCStatus,
} from '@/types/domain';

// ========== SUBSCRIPTION ENUMS ==========
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
export type SubscriptionType = 'stripe' | 'admin_grant' | 'free';

// ========== INSPECTION ENUMS ==========
export type InspectionType = 'move_in' | 'move_out';
export type InspectionStatus = 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

// ========== APP ROLE ==========
export type AppRole = 'admin' | 'user';

// ========== DOCUMENT ENUMS ==========
export type DocumentCategory = 'contract' | 'template' | 'inspection' | 'receipt' | 'other';
export type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled';

// ========== USER PREFERENCES ENUMS ==========
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'sm' | 'md' | 'lg';
export type WeekStartDay = 'monday' | 'sunday';

// ========== SEPA MANDATE ENUMS ==========
export type MandateState = 'pending' | 'pending_signature' | 'active' | 'failed' | 'cancelled';

// ========== KYC ENUMS ==========
export type KYCProvider = 'kilt' | 'didit';
// NOTE: OpenAPI KYC is BLOCKED — see supabase/functions/initiate-openapi-kyc/index.ts
// Previously: export type KYCProvider = 'kilt' | 'didit' | 'openapi';

// ========== INVITATION STATUS ARRAY (for validation) ==========
export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'declined', 'property_inactive', 'already_tenant', 'cancelled'] as const;
export const PROPERTY_STATUSES = ['active', 'inactive', 'ending_tenancy'] as const;
export const TENANCY_STATUSES = ['active', 'ending_tenancy', 'historic', 'pending'] as const;
export const INSPECTION_STATUSES = ['draft', 'in_progress', 'pending_signatures', 'completed'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'] as const;
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'cancelled'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const UTILITY_TYPES = ['electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other'] as const;

// ========== CONDITION RATINGS ==========
export const CONDITION_RATINGS = ['excellent', 'good', 'fair', 'poor', 'damaged'] as const;