/**
 * Centralized environment configuration
 * Provides type-safe access to environment variables
 * 
 * SECURITY: Only non-sensitive config values should be exposed to client
 * Secrets (service role keys, API secrets) remain server-side
 */

const importMetaEnv = import.meta.env;

export const env = {
  // Supabase Configuration
  supabase: {
    url: getRequired('VITE_SUPABASE_URL'),
    anonKey: getRequired('VITE_SUPABASE_ANON_KEY'),
    // Only available in development/preview modes
    // These should NEVER be exposed to client in production
    serviceRoleKey: getOptional('VITE_SUPABASE_SERVICE_ROLE_KEY'),
  },

  // App Configuration
  app: {
    name: getOptional('VITE_APP_NAME', 'RentMate'),
    environment: getRequired('VITE_APP_ENV', 'development'),
    url: getOptional('VITE_APP_URL', 'http://localhost:5173'),
    version: getOptional('VITE_APP_VERSION', '0.0.0'),
  },

  // Feature Flags (all booleans, safe to expose)
  features: {
    enableKYC: getBool('VITE_ENABLE_KYC', true),
    enableStripeConnect: getBool('VITE_ENABLE_STRIPE_CONNECT', true),
    enableOpenAI: getBool('VITE_ENABLE_OPENAI', false),
    enableDocuSeal: getBool('VITE_ENABLE_DOCUSEAL', false),
    enableYouSign: getBool('VITE_ENABLE_YOUSIGN', true),
    enableQualifiedSignature: getBool('VITE_ENABLE_QUALIFIED_SIGNATURE', false),
    enableDebugMode: getBool('VITE_ENABLE_DEBUG', importMetaEnv.DEV),
  },

  // Analytics (safe to expose)
  analytics: {
    posthogKey: getOptional('VITE_POSTHOG_KEY'),
    googleAnalyticsId: getOptional('VITE_GA_MEASUREMENT_ID'),
  },

  // External Services
  services: {
    stripePublishableKey: getOptional('VITE_STRIPE_PUBLISHABLE_KEY'),
    resendApiKey: getOptional('VITE_RESEND_API_KEY'), // Only for server-side use
    openaiApiKey: getOptional('VITE_OPENAI_API_KEY'), // Only for server-side use
  },

  // URLs for external services (safe to expose)
  externalUrls: {
    yousignApiUrl: getOptional('VITE_YOUSIGN_API_URL', 'https://api.yousign.com'),
    docusealUrl: getOptional('VITE_DOCUSEAL_URL', 'https://app.docuseal.com'),
    qualifiedApiUrl: getOptional('VITE_QUALIFIED_API_URL', 'https://api.qualified.com'),
    kiltEndpoint: getOptional('VITE_KILT_ENDPOINT', 'wss://kilt-rpc.developer.attachment.io'),
  },

  // Rate Limiting Configuration
  rateLimits: {
    emailVerificationSeconds: getNumber('VITE_RATE_LIMIT_EMAIL_VERIFY', 60),
    passwordResetSeconds: getNumber('VITE_RATE_LIMIT_PASSWORD_RESET', 60),
    apiRequestMaxPerMinute: getNumber('VITE_RATE_LIMIT_API_MAX', 60),
  },

  // Validation
  validation: {
    maxFileUploadSizeMB: getNumber('VITE_MAX_FILE_UPLOAD_MB', 10),
    allowedFileTypes: getOptional('VITE_ALLOWED_FILE_TYPES', 'pdf,doc,docx,jpg,png').split(','),
    maxPropertyImages: getNumber('VITE_MAX_PROPERTY_IMAGES', 20),
  },

  // Development helpers
  devTools: {
    logQueries: getBool('VITE_LOG_SUPABASE_QUERIES', false),
    mockApiCalls: getBool('VITE_MOCK_API_CALLS', false),
    showPerformanceMetrics: getBool('VITE_SHOW_PERFORMANCE', importMetaEnv.DEV),
  },
};

/**
 * Check if running in production
 */
export const isProduction = env.app.environment === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.app.environment === 'development';

/**
 * Check if running in staging
 */
export const isStaging = env.app.environment === 'staging';

/**
 * Get environment variable with validation (required)
 */
function getRequired(key: string, fallback?: string): string {
  const value = importMetaEnv[key] || fallback;
  if (!value && !fallback) {
    console.warn(`⚠️ Missing required environment variable: ${key}`);
  }
  return value || fallback || '';
}

/**
 * Get environment variable (optional)
 */
function getOptional(key: string, fallback = ''): string {
  return importMetaEnv[key] || fallback;
}

/**
 * Get boolean environment variable
 */
function getBool(key: string, fallback = false): boolean {
  const value = importMetaEnv[key];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumber(key: string, fallback = 0): number {
  const value = importMetaEnv[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Type definitions for use in components
 * These mirror the env object but are strictly typed for consumption
 */
export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    environment: string;
    url: string;
    version: string;
  };
  features: {
    enableKYC: boolean;
    enableStripeConnect: boolean;
    enableOpenAI: boolean;
    enableDocuSeal: boolean;
    enableYouSign: boolean;
    enableQualifiedSignature: boolean;
    enableDebugMode: boolean;
  };
  analytics: {
    posthogKey?: string;
    googleAnalyticsId?: string;
  };
  externalUrls: {
    yousignApiUrl: string;
    docusealUrl: string;
    qualifiedApiUrl: string;
    kiltEndpoint: string;
  };
  validation: {
    maxFileUploadSizeMB: number;
    allowedFileTypes: string[];
    maxPropertyImages: number;
  };
  devTools: {
    logQueries: boolean;
    mockApiCalls: boolean;
    showPerformanceMetrics: boolean;
  };
}

/**
 * Client-safe config (excludes secrets)
 * Use this when passing config to client-side components
 */
export const clientConfig: AppConfig = {
  supabase: {
    url: env.supabase.url,
    anonKey: env.supabase.anonKey,
  },
  app: env.app,
  features: env.features,
  analytics: env.analytics,
  externalUrls: env.externalUrls,
  validation: env.validation,
  devTools: env.devTools,
};

export default env;