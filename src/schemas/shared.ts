import path from 'node:path';
import { z } from 'zod';

export const ZoneNameSchema = z
    .string()
    .trim()
    .min(3, 'zone name must be at least 3 characters long')
    .max(63, 'zone name must not exceed 63 characters')
    .regex(
        /^[a-z0-9_]+$/,
        'zone name can only contain letters, numbers, and underscores',
    )
    .refine((val) => !val.startsWith('_'), {
        message: 'zone name cannot start with an underscore',
    })
    .refine((val) => !val.endsWith('_'), {
        message: 'zone name cannot end with an underscore',
    });

// Reduce to the final path segment before stripping reserved characters so
// path-traversal sequences (../, absolute paths, alt-separators) cannot escape
// the working directory once getAbsAndEnsureDir → path.resolve runs downstream.
// path.basename only splits on the platform's native separator, so the regex
// must still strip backslashes for POSIX hosts receiving Windows-shaped input.
export const FilenameSchema = z
    .string()
    .min(1)
    .transform((v) => path.basename(v).replace(/[<>:"\\|?*]/g, '_'));
