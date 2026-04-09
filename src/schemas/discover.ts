import { z } from 'zod';

export const DiscoverQuerySchema = z.string().min(1, 'query must not be empty');

export const DiscoverOptionsSchema = z.object({
    intent: z.string().optional(),
    includeContent: z.boolean().optional(),
    country: z
        .string()
        .length(2, 'country code must be exactly 2 characters')
        .transform((v) => v.toLowerCase())
        .optional(),
    city: z.string().optional(),
    language: z.string().optional(),
    filterKeywords: z.array(z.string()).optional(),
    numResults: z.int().positive().optional(),
    format: z.enum(['json']).default('json'),
    timeout: z.number().positive().default(60_000),
    pollInterval: z.number().positive().default(2_000),
});

export type DiscoverOptions = z.input<typeof DiscoverOptionsSchema>;

export const DiscoverTriggerResponseSchema = z
    .object({
        task_id: z.string().min(1),
    })
    .passthrough();

export const DiscoverPollResponseSchema = z
    .object({
        status: z.enum(['processing', 'done', 'error', 'failed']),
    })
    .passthrough();
