import { z } from 'zod';

export const ChatgptFilterSchema = z.object({
    prompt: z.string().min(1).max(4096),
    additional_prompt: z.string().max(4096).optional(),
    country: z.string().optional(),
    require_sources: z.boolean().optional(),
    web_search: z.boolean().optional(),
}).strict();

export type ChatgptFilter = z.infer<typeof ChatgptFilterSchema>;
