// ========== STORAGE BUCKET NAMES ==========
export const STORAGE_BUCKETS = {
  PROPERTY_PHOTOS: 'property-photos',
  PROFILE_PHOTOS: 'profile-photos',
  PROPERTY_DOCUMENTS: 'property-documents',
  PAYMENT_PROOFS: 'payment-proofs',
  BRAND_LOGOS: 'brand-logos',
  TICKET_PHOTOS: 'ticket-photos',
  TICKET_VIDEOS: 'ticket-videos',
  INSPECTION_MEDIA: 'inspection-media',
  SEPA_MANDATES: 'sepa-mandates',
  QUALIFIED_CONTRACTS: 'qualified-contracts',
  RENT_PAYMENT_PROOFS: 'rent-payment-proofs',
  UTILITY_PAYMENT_PROOFS: 'utility-payment-proofs',
} as const;
export type BucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// ========== SIGNED URL / CACHE ==========
export const SIGNED_URL_TTL = 3600;
export const DEFAULT_STORAGE_CACHE_CONTROL = '3600';
export const FILE_EXISTS_PROBE_TTL = 60;

// ========== FILE SIZE LIMITS (bytes) ==========
export const FILE_SIZE_LIMITS = {
  PROPERTY_PHOTO: 5 * 1024 * 1024,     // 5 MB
  PROFILE_PHOTO: 5 * 1024 * 1024,       // 5 MB
  PAYMENT_PROOF: 10 * 1024 * 1024,      // 10 MB
  PROPERTY_DOCUMENT: 50 * 1024 * 1024,  // 50 MB
  TICKET_PHOTO: 5 * 1024 * 1024,        // 5 MB
  TICKET_VIDEO: 50 * 1024 * 1024,       // 50 MB
  INSPECTION_MEDIA: 50 * 1024 * 1024,   // 50 MB
  BRAND_LOGO: 5 * 1024 * 1024,          // 5 MB
  IMPORT_FILE: 5 * 1024 * 1024,         // 5 MB
} as const;

// ========== PAGINATION DEFAULTS ==========
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  TICKETS_PAGE_SIZE: 10,
} as const;

// ========== INVITATION / TENANCY ==========
export const INVITATION_EXPIRY_DAYS = 7;
export const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const DECLINED_INVITATION_WINDOW_DAYS = 30;

// ========== VIEWABLE DOCUMENT EXTENSIONS ==========
export const VIEWABLE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt'];

// ========== DEVICE BREAKPOINTS ==========
export const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1023,
} as const;

// ========== ANALYTICS ==========
export const ANALYTICS = {
  SESSION_STORAGE_KEY: 'analytics_session_id',
} as const;
