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

export const getAbsAndEnsureDir = async (filename: string) => {
    try {
        const target = path.resolve(filename);
        await fs.mkdir(path.dirname(target), { recursive: true });
        return target;
    } catch (e: unknown) {
        const msg = `failed to create dirs ${filename}:`;
        throw new FSError(`${msg} ${(e as Error).message}`);
    }
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
