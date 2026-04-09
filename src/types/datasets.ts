import type { PollOptions } from '../utils/polling';
import type { SnapshotStatusResponse } from '../schemas/responses';

export type {
    DatasetOptionsSync,
    DatasetOptionsAsync,
    DatasetOptions,
    DiscoverOptions,
    SnapshotDownloadOptions,
    SnapshotFetchOptions,
} from '../schemas/datasets';

export type SnapshotFormat = 'json' | 'ndjson' | 'jsonl' | 'csv';

export type {
    SnapshotMeta,
    SnapshotStatusResponse,
} from '../schemas/responses';

export type SnapshotStatus = SnapshotStatusResponse['status'];

/**
 * Interface for snapshot operations needed by ScrapeJob.
 * SnapshotAPI implements this naturally via structural typing.
 * Defined here (not in snapshot.ts) to avoid circular imports
 * between base.ts → job.ts → snapshot.ts → base.ts.
 */
export interface SnapshotOperations {
    getStatus(snapshotId: string): Promise<SnapshotStatusResponse>;
    fetch(
        snapshotId: string,
        options?: import('../schemas/datasets').SnapshotFetchOptions,
    ): Promise<unknown>;
    download(
        snapshotId: string,
        options?: import('../schemas/datasets').SnapshotDownloadOptions,
    ): Promise<string>;
    cancel(snapshotId: string): Promise<void>;
}

export type UnknownRecord = Record<string, unknown>;

export interface UrlFilter extends UnknownRecord {
    url: string;
}

export type { ChatgptFilter } from '../schemas/filters/chatgpt';
export type {
    LinkedinProfileFilter,
    LinkedinJobFilter,
} from '../schemas/filters/linkedin';

export type {
    AmazonCollectProductsFilter,
    AmazonCollectReviewsFilter,
    AmazonCollectSearchFilter,
    AmazonDiscoverProductsByBSUrlFilter,
    AmazonDiscoverProductsByCategoryURLFilter,
    AmazonDiscoverProductsByKeywordFilter,
    AmazonDiscoverProductsByUPCFilter,
} from '../schemas/filters/amazon';

export type {
    InstagramDiscoverPostsByProfileURLFilter,
    InstagramDiscoverReelsByProfileURLFilter,
} from '../schemas/filters/instagram';

export type {
    FacebookCollectUserPostsFilter,
    FacebookCollectGroupPostsFilter,
    FacebookCollectPostCommentsFilter,
    FacebookCompanyReviewsFilter,
    FacebookDiscoverPostsByUserNameFilter,
    FacebookDiscoverMarketplaceItemsByKeywordFilter,
    FacebookDiscoverMarketplaceItemsByURLFilter,
    FacebookDiscoverEventsByURLFilter,
    FacebookDiscoverEventsByVenueFilter,
} from '../schemas/filters/facebook';

/**
 * Options for one-call orchestration methods (products, reviews, etc.).
 * Extends PollOptions with format selection.
 */
export interface OrchestrateOptions extends PollOptions {
    /** Format for fetched data (default: 'json') */
    format?: SnapshotFormat;
}
