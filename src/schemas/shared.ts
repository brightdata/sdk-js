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

// An API identifier (snapshot id, dataset snapshot id, Scraper-Studio job id) is
// an OPAQUE token: letters, digits, hyphen and underscore only. These values are
// interpolated into request URL PATHS, so they must never contain path-control
// characters ('/', '\', '.', '%', '?', '#', whitespace); otherwise the resolved
// URL can address a different path than intended. The allowlist below is
// deliberate and evidence-backed — do not loosen it without cause: every real
// Bright Data id observed is a strict subset of it (the 181 dataset ids shipped
// under src/api/datasets/platforms/ are all `gd_[a-z0-9]+`; the API's trigger
// response `snapshot_id` is shaped like `s_m4x7enmven8djfqak`). Callers that build
// a URL from an id also percent-encode it at the splice as a second layer, so even
// a future widening of this allowlist cannot carry path semantics onto the wire.
export const SafeIdSchema = z
    .string()
    .trim()
    .min(1, 'id must not be empty')
    .max(200, 'id is unexpectedly long')
    .regex(/^[A-Za-z0-9_-]+$/, 'id contains invalid characters');

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
// actual write target) lives in utils/files.ts's getAbsAndEnsureDir, which
// contains writes by default for callers that pass a raw path without this
// schema (e.g. BaseResult.save()) — an absolute destination there requires an
// explicit opt-in.
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
