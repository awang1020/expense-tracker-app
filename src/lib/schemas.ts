import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Too long'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #0ea5e9'),
  icon: z.string().trim().max(4).optional(),
});

export const expenseSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .positive('Amount must be > 0')
    .max(1_000_000, 'Amount too large'),
  categoryId: z.string().min(1, 'Pick a category'),
  note: z.string().trim().max(200, 'Too long').optional().default(''),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
});

export const recurringSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .positive('Amount must be > 0')
    .max(1_000_000, 'Amount too large'),
  categoryId: z.string().min(1, 'Pick a category'),
  note: z.string().trim().max(200, 'Too long').optional().default(''),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  active: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
export type RecurringFormValues = z.infer<typeof recurringSchema>;
