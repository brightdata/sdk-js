import { getLogger } from './logger';
import { APIError } from './errors';

export function parseJSON<T>(data: string): T {
    try {
        return JSON.parse(data) as T;
    } catch (e: unknown) {
        const logger = getLogger('utils.json');
        logger.warning(
            'failed to parse JSON response, returning as ' + 'string',
            {
                error: (e as Error).message,
                data: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
            },
        );
        throw new APIError('Failed to parse JSON response');
    }
}

export const isStrArray = (maybeArr: unknown): maybeArr is string[] =>
    Array.isArray(maybeArr) &&
    maybeArr.every((item) => typeof item === 'string');

export const dropEmptyKeys = (obj: Record<string, unknown>) => {
    for (const key in obj) {
        if (obj[key] === undefined || obj[key] === null || obj[key] === '') {
            delete obj[key];
        }
    }
};

export const maskKey = (key: string) =>
    key.length > 8 ? `***${key.slice(-4)}` : '***';

export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const getRandomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
