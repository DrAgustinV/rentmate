/**
 * Brand Configuration
 * Single source of truth for all brand-related settings
 */

import logoImage from "@/assets/logo-rentmate.png";

export const BRAND_CONFIG = {
  // Brand identity
  name: "RentMate",
  tagline: "Property Management Made Simple",
  description: "Modern property management platform for landlords and tenants",
  
  // Visual assets
  logo: {
    src: logoImage,
    alt: "RentMate Logo",
  },
  
  // Contact information
  contact: {
    email: "support@rentmate.app",
    supportEmail: "support@rentmate.app",
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

// Export individual constants for convenience
export const BRAND_NAME = BRAND_CONFIG.name;
export const BRAND_TAGLINE = BRAND_CONFIG.tagline;
export const BRAND_LOGO = BRAND_CONFIG.logo;
export const BRAND_EMAIL = BRAND_CONFIG.contact.email;
