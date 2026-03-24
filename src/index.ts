// ── Core ──────────────────────────────────────────────────────────
export {
    BRDError,
    ValidationError,
    AuthenticationError,
    ZoneError,
    NetworkError,
    NetworkTimeoutError,
    TimeoutError,
    FSError,
    APIError,
    DataNotReadyError,
} from './utils/errors';
export { PACKAGE_VERSION as VERSION } from './utils/constants';
export { bdclient } from './client';
export { BaseResult } from './models/result';
export { Deadline } from './utils/deadline';
export type { PollOptions } from './utils/polling';
export type { BaseResultFields } from './models/result';
export type * from './types/client';
export type * from './types/request';
export type * from './types/zones';

// ── Subpath re-exports (backward compat) ─────────────────────────
// Consumers can also import these from '@brightdata/sdk/scrapers',
// '@brightdata/sdk/search', or '@brightdata/sdk/datasets'.
export * from './scrapers';
export * from './search';
export * from './datasets';
