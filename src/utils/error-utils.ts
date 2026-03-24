import { BRDError, APIError } from './errors';

export function wrapAPIError(e: unknown, location: string, operation?: string): never {
    if (e instanceof BRDError) throw e;
    const prefix = operation ? `${location}: ${operation}` : location;
    throw new APIError(`${prefix}: ${(e as Error).message}`);
}
