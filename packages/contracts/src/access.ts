import { z } from 'zod';

export const ProjectAccessResponseSchema = z.object({
  projectId: z.uuid(),
  state: z.enum(['owned', 'not_owned']),
  materialsAvailable: z.boolean(),
});

export type ProjectAccessResponse = z.infer<
  typeof ProjectAccessResponseSchema
>;
