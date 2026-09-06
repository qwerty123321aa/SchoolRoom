import { z } from 'zod';

export const CurrentUserResponseSchema = z.object({
  user: z.object({
    id: z.uuid(),
    telegramId: z.string().regex(/^[1-9]\d*$/),
    name: z.string(),
    username: z.string().nullable(),
  }),
});
export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
