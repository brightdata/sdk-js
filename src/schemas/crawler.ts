import { z } from 'zod';
import { URLParamSchema } from './client.js';

export const CrawlInputSchema = URLParamSchema;

export const CrawlOptionsSchema = z.object({
    includeErrors: z.boolean().default(true),
});

export const CrawlDownloadOptionsSchema = z.object({
    pollInterval: z.number().positive().optional(),
    pollTimeout: z.number().positive().optional(),
});

export type CrawlOptions = z.input<typeof CrawlOptionsSchema>;
export type CrawlDownloadOptions = z.input<typeof CrawlDownloadOptionsSchema>;
