import { z } from 'zod';

export const CurrencySchema = z.literal('RUB');

export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencySchema,
  formatted: z.string().min(1),
});

export type Money = z.infer<typeof MoneySchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
