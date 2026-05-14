/**
 * Centralized configuration constants extracted from the codebase.
 * Eliminates magic numbers/strings and ensures consistency across services.
 */

// 📦 Storage & File Limits
export const STORAGE_BUCKET = 'property-documents';
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;
export const ALLOWED_DOC_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.odt', '.xls', '.xlsx', '.ods', '.txt',
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
] as const;

// ⏱️ Timeouts & Intervals
export const SIGNED_URL_TTL_SECONDS = 3600;
export const POLLING_INTERVAL_MS = 3000;
export const TOAST_REMOVE_DELAY_MS = 1000000;
export const TOAST_LIMIT = 1;
export const INVITATION_EXPIRY_DAYS = 30;
export const DELETION_GRACE_PERIOD_DAYS = 14;

// 📊 React Query Defaults
export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_GC_TIME_MS = 30 * 60 * 1000;   // 30 minutes

// 🌐 Paths & Routes
export const ROUTES = {
  AUTH: '/auth',
  ACCOUNT: '/account',
  PROPERTIES: '/properties',
  RENTALS: '/rentals',
  CONFIGURATION: '/configuration',
  PRICING: '/pricing',
  VERIFY_EMAIL: '/verify-email',
} as const;

// 🏷️ Status Enums (Centralized for consistency)
export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'declined', 'property_inactive', 'already_tenant', 'cancelled'] as const;
export const PROPERTY_STATUSES = ['active', 'inactive', 'ending_tenancy'] as const;
export const TENANCY_STATUSES = ['active', 'ending_tenancy', 'historic', 'pending'] as const;
export const INSPECTION_STATUSES = ['draft', 'in_progress', 'pending_signatures', 'completed'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'] as const;
