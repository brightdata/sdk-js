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

// Allow legitimate relative subfolders (e.g. "output/data.json") while still
// refusing to escape the working directory. Unlike a blanket path.basename(),
// this preserves directory structure the caller asked for and only rejects
// genuinely dangerous input, with a clear error instead of a silent rewrite:
//   - absolute paths (POSIX "/etc/x", Windows "C:\x" or UNC "\\host\share")
//   - ".." segments anywhere in the path
// Backslashes are always treated as separators (not just on Windows), so a
// Windows-shaped traversal payload can't slip through on a POSIX host by
// switching separator style. This is the lexical half of the defense; the
// filesystem-level half (containment + symlink-escape check against the
// actual write target) lives in utils/files.ts's getAbsAndEnsureDir, since
// some callers (e.g. BaseResult.save()) accept a raw path that never passes
// through this schema at all.
const RESERVED_CHARS = /[<>:"|?*]/g;
const ABSOLUTE_PATH = /^\/|^[a-zA-Z]:\//;

export const FilenameSchema = z
    .string()
    .min(1)
    .transform((v, ctx) => {
        const normalized = v.replace(/\\/g, '/');

        if (ABSOLUTE_PATH.test(normalized)) {
            ctx.addIssue({
                code: 'custom',
                message: 'absolute paths are not allowed in filename',
            });
            return z.NEVER;
        }

        const segments: string[] = [];
        for (const raw of normalized.split('/')) {
            if (raw === '' || raw === '.') continue;
            if (raw === '..') {
                ctx.addIssue({
                    code: 'custom',
                    message: 'filename must not contain ".." path segments',
                });
                return z.NEVER;
            }
            segments.push(raw.replace(RESERVED_CHARS, '_'));
        }

        if (segments.length === 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'filename must not be empty',
            });
            return z.NEVER;
        }

        return segments.join('/');
    });
