import { z } from 'zod';

export const BrowserConnectOptionsSchema = z.object({
    country: z
        .string()
        .length(2, 'country code must be exactly 2 characters')
        .transform((v) => v.toLowerCase())
        .optional(),
});

export type BrowserConnectOptions = z.input<typeof BrowserConnectOptionsSchema>;
