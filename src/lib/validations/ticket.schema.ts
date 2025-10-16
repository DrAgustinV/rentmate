import { z } from 'zod';

export const ticketBaseSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  type: z.enum(['maintenance', 'repair', 'inspection', 'request', 'issue', 'incident', 'cleaning', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  propertyId: z.string().uuid("Invalid property ID"),
});

export type TicketBase = z.infer<typeof ticketBaseSchema>;
