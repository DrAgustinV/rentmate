import { z } from 'zod';

export const repairShopBaseSchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  contact_person: z.string()
    .trim()
    .max(100, "Contact person name must be less than 100 characters")
    .optional()
    .or(z.literal('')),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .trim()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[\d\s\-+()]+$/, "Invalid phone number format"),
  address: z.string()
    .trim()
    .max(200, "Address must be less than 200 characters")
    .optional()
    .or(z.literal('')),
  city: z.string()
    .trim()
    .max(100, "City must be less than 100 characters")
    .optional()
    .or(z.literal('')),
  postal_code: z.string()
    .trim()
    .max(20, "Postal code must be less than 20 characters")
    .optional()
    .or(z.literal('')),
  specializations: z.array(z.string()).default([]),
  license_number: z.string()
    .trim()
    .max(50, "License number must be less than 50 characters")
    .optional()
    .or(z.literal('')),
  notes: z.string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .or(z.literal('')),
});

export type RepairShopBase = z.infer<typeof repairShopBaseSchema>;
