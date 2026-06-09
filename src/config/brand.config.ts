/**
 * Brand Configuration
 * Single source of truth for all brand-related settings
 * This now serves as the default/fallback configuration
 * Actual values are loaded from the database via useBrandSettings hook
 */

import logoImage from "@/assets/logo-rentmate.png";

export const BRAND_CONFIG = {
  // Brand identity (defaults - will be overridden by database settings)
  name: "RentMate",
  tagline: "Property Management Made Simple",
  description: "Modern property management platform for landlords and tenants",
  
  // Visual assets (defaults)
  logo: {
    src: logoImage,
    alt: "RentMate Logo",
  },
  
  // Contact information
  contact: {
    email: "support@rentmate.me",
    supportEmail: "support@rentmate.me",
  },
  
  // SEO & Meta
  meta: {
    title: "RentMate - Property Management Made Simple",
    description: "Modern property management platform for landlords and tenants. Manage properties, invite tenants, and streamline communication.",
    author: "RentMate",
  },
  
  // Social media
  social: {
    twitter: "@rentmate",
  },
  
  // App metadata
  version: "1.0.0",
} as const;

// Export individual constants for convenience (these are defaults)
export const BRAND_NAME = BRAND_CONFIG.name;
export const BRAND_TAGLINE = BRAND_CONFIG.tagline;
export const BRAND_LOGO = BRAND_CONFIG.logo;
export const BRAND_EMAIL = BRAND_CONFIG.contact.email;
