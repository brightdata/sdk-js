import { USER_AGENT } from './constants.js';
import type { AuthSource } from './cli-credentials.js';

export const getAuthHeaders = (apiKey: string, authSource?: AuthSource) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': authSource
        ? `${USER_AGENT} (auth=${authSource})`
        : USER_AGENT,
});
