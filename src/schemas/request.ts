import { z } from 'zod';
import { DEFAULT_CONCURRENCY } from '../utils/constants';
import { ZoneNameSchema } from './shared';

export const RequestOptionsBaseSchema = z.object({
    zone: ZoneNameSchema.optional(),
    country: z
        .string()
        .length(
            2,
            'country code must be exactly 2 characters (ISO 3166-1 alpha-2) or empty',
        )
        .transform((v) => v.toLowerCase())
        .optional(),
    method: z
        .enum(['GET', 'POST', 'get', 'post'])
        .transform((v) => v.toUpperCase() as 'GET' | 'POST')
        .optional(),
    format: z.enum(['json', 'raw']).optional(),
    dataFormat: z.enum(['html', 'markdown', 'screenshot']).optional(),
});

export const FetchingOptionsSchema = z.object({
    concurrency: z.int().min(1).max(50).default(DEFAULT_CONCURRENCY),
    timeout: z.number().min(250).max(300_000).optional(),
});

export const RequestOptionsSchema = z.object({
    ...RequestOptionsBaseSchema.shape,
    ...FetchingOptionsSchema.shape,
});

export const ScrapeOptionsSchema = z.object({
    ...RequestOptionsBaseSchema.shape,
    ...FetchingOptionsSchema.shape,
});

export const SearchOptionsSchema = z.object({
    ...RequestOptionsBaseSchema.shape,
    ...FetchingOptionsSchema.shape,
    searchEngine: z
        .enum(['google', 'bing', 'yandex', 'GOOGLE', 'BING', 'YANDEX'])
        .transform((v) => v.toLowerCase() as 'google' | 'bing' | 'yandex')
        .optional(),
    language: z.string().min(2).max(5).optional(),
    numResults: z.int().min(1).max(100).default(10),
    start: z.int().min(0).default(0),
});

export type RequestOptions = z.input<typeof RequestOptionsSchema>;
export type ScrapeOptions = z.input<typeof ScrapeOptionsSchema>;
export type SearchOptions = z.input<typeof SearchOptionsSchema>;
export type FetchingOptions = z.input<typeof FetchingOptionsSchema>;
export type SearchEngine = 'google' | 'bing' | 'yandex';
