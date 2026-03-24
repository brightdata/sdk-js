import { z } from 'zod';
import { FilenameSchema } from './shared';

const ContentFormatSchema = z
    .enum(['json', 'txt', 'JSON', 'TXT'])
    .transform((v) => v.toLowerCase() as 'json' | 'txt')
    .default('json');

export const SaveOptionsSchema = z.object({
    filename: FilenameSchema.optional(),
    format: ContentFormatSchema,
});

export type SaveOptions = z.input<typeof SaveOptionsSchema>;
export type ContentFormat = 'json' | 'txt';
