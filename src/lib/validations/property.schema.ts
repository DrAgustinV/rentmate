import { z } from 'zod';

export const propertyBaseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  address: z.string()
    .trim()
    .max(200, "Address must be less than 200 characters")
    .optional(),
  city: z.string()
    .trim()
    .max(100, "City must be less than 100 characters")
    .optional(),
  state_province: z.string()
    .trim()
    .max(100, "State/Province must be less than 100 characters")
    .optional(),
  postal_code: z.string()
    .trim()
    .max(20, "Postal code must be less than 20 characters")
    .optional(),
  country: z.string()
    .trim()
    .max(100, "Country must be less than 100 characters")
    .optional(),
  description: z.string()
    .trim()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
});

export const archivePropertySchema = z.object({
  reason: z.enum(['sold', 'no_longer_managing', 'merged_with_other_property', 'other']),
  notes: z.string()
    .trim()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
});

export type PropertyBase = z.infer<typeof propertyBaseSchema>;
export type ArchiveProperty = z.infer<typeof archivePropertySchema>;
