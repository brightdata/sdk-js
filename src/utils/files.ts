import { createWriteStream, type Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Dispatcher } from 'undici';
import { getLogger } from './logger.js';
import { BRDError, FSError } from './errors.js';
import { isStrArray } from './misc.js';
import type { SingleResponse, BatchResponse } from '../types/request.js';
import type { ContentFormat } from '../types/client.js';

const logger = getLogger('utils.files');

export const statSafe = async (filename: string): Promise<Stats | null> => {
    try {
        return await fs.stat(filename);
    } catch {
        return null;
    }
};

const toTXTRec = (item: string, index: number) =>
    `--- RESULT #${index} ---\n\n${item}`;

export const stringifyResults = (
    results: SingleResponse | BatchResponse,
    format: ContentFormat,
): string => {
    if (format == 'txt') {
        if (typeof results == 'string') return results;
        if (isStrArray(results)) return results.map(toTXTRec).join('\n\n');
    }

    return JSON.stringify(results, null, 2);
};

export const getFilename = (
    filename: string | void,
    format: string,
): string => {
    if (filename) {
        return path.extname(filename) ? filename : `${filename}.${format}`;
    }
    return `brightdata_content_${Date.now()}.${format}`;
};

/**
 * Resolve `filename` against `baseDir` (default: cwd) and ensure its parent
 * directory exists — refusing to write outside `baseDir` for *relative*
 * inputs, while still honoring an explicit absolute path.
 *
 * Some callers (e.g. `BaseResult.save()`) accept a raw path that never
 * passes through `FilenameSchema`, so containment can't be assumed to have
 * been checked already. But an absolute path is a deliberate choice by the
 * calling code (the same trust model as calling `fs.writeFile` directly) —
 * `.save()` is a general-purpose "write here" API, not a sanitized-filename
 * option, and has always accepted arbitrary absolute destinations. So
 * containment is only enforced for relative inputs, where escaping `baseDir`
 * (e.g. "../../etc/passwd") can only mean traversal, never an intentional
 * absolute destination. Two layers, both skipped for absolute input:
 *  1. Lexical containment — `path.resolve` the candidate and confirm it's
 *     still under `baseDir`. Cheap, catches the common cases, but is purely
 *     string-based and blind to symlinks.
 *  2. Real-path containment — after creating the parent directory, resolve
 *     both the real (symlink-free) parent and the real base, and re-check
 *     containment. This catches a subfolder that is (or contains) a symlink
 *     pointing outside `baseDir`, which layer 1 cannot see.
 */
export const getAbsAndEnsureDir = async (
    filename: string,
    baseDir: string = process.cwd(),
): Promise<string> => {
    const resolvedBase = path.resolve(baseDir);
    const isExplicitAbsolute = path.isAbsolute(filename);
    const candidate = path.resolve(resolvedBase, filename);

    if (
        !isExplicitAbsolute &&
        candidate !== resolvedBase &&
        !candidate.startsWith(resolvedBase + path.sep)
    ) {
        throw new FSError(
            `refusing to write outside the working directory: ${filename}`,
        );
    }

    try {
        await fs.mkdir(path.dirname(candidate), { recursive: true });
    } catch (e: unknown) {
        const msg = `failed to create dirs ${filename}:`;
        throw new FSError(`${msg} ${(e as Error).message}`);
    }

    if (isExplicitAbsolute) {
        return candidate;
    }

    let realParent: string;
    let realBase: string;
    try {
        [realParent, realBase] = await Promise.all([
            fs.realpath(path.dirname(candidate)),
            fs.realpath(resolvedBase),
        ]);
    } catch (e: unknown) {
        throw new FSError(
            `failed to resolve real path for ${filename}: ${(e as Error).message}`,
        );
    }

    if (
        realParent !== realBase &&
        !realParent.startsWith(realBase + path.sep)
    ) {
        throw new FSError(
            `refusing to write outside the working directory (symlink escape): ${filename}`,
        );
    }

    return path.join(realParent, path.basename(candidate));
};

export const writeContent = async (content: string, filename: string) => {
    try {
        const target = await getAbsAndEnsureDir(filename);
        logger.info(`writing ${target}`);

        await fs.writeFile(target, content, 'utf8');
        const stats = await statSafe(target);

        if (!stats) throw new FSError('file was not created successfully');

        logger.info(`written successfully: ${target} (${stats.size} bytes)`);
        return target;
    } catch (e: unknown) {
        if (e instanceof BRDError) throw e;

        const err = e as NodeJS.ErrnoException;
        logger.error(`failed to write file: ${err.message}`);

        const msg = `failed to write file ${filename}:`;
        if (err.code === 'EACCES') {
            throw new FSError(`${msg} permission denied`);
        } else if (err.code === 'ENOSPC') {
            throw new FSError(`${msg} insufficient disk space`);
        } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
            throw new FSError(`${msg} too many open files`);
        }

        throw new FSError(`${msg} ${err.message}`);
    }
};

export interface WritingOpaque {
    filename: string;
    assertStatus?: (status: number) => void;
}

export const routeDownloadStream: Dispatcher.StreamFactory<WritingOpaque> = ({
    statusCode,
    opaque,
}) => {
    const { assertStatus, filename } = opaque;

    assertStatus?.(statusCode);

    return createWriteStream(filename);
};
