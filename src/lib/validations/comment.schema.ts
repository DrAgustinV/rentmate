import { z } from 'zod';

export const commentSchema = z.object({
  comment: z.string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be less than 1000 characters"),
  isInternal: z.boolean().optional(),
});

export type Comment = z.infer<typeof commentSchema>;
