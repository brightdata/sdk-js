import { USER_AGENT } from './constants.js';

export const getAuthHeaders = (apiKey: string) => ({
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
});
