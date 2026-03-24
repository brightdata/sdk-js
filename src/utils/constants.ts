export const PACKAGE_VERSION = process.env.BRD_PACKAGE_VERSION || 'dev';
export const USER_AGENT = `brightdata-sdk-js/${PACKAGE_VERSION}`;

// API Configuration
export const DEFAULT_CONCURRENCY = 10;
export const DEFAULT_TIMEOUT = 120_000;
export const MAX_RETRIES = 3;
export const RETRY_BACKOFF_FACTOR = 1.5;
export const RETRY_STATUSES = [429, 500, 502, 503, 504];
export const DEFAULT_CONNECTIONS = DEFAULT_CONCURRENCY * (MAX_RETRIES + 1); // 40
export const DEFAULT_KEEP_ALIVE_TIMEOUT = 30_000;
export const DEFAULT_KEEP_ALIVE_MAX_TIMEOUT = 120_000;

const API_BASE_URL = 'https://api.brightdata.com';

export const API_ENDPOINT = {
    REQUEST: `${API_BASE_URL}/request`,
    ZONE: `${API_BASE_URL}/zone`,
    ZONE_LIST: `${API_BASE_URL}/zone/get_active_zones`,
    SCRAPE_ASYNC: `${API_BASE_URL}/datasets/v3/trigger`,
    SCRAPE_SYNC: `${API_BASE_URL}/datasets/v3/scrape`,
    SNAPSHOT_STATUS: `${API_BASE_URL}/datasets/v3/progress/{snapshot_id}`,
    SNAPSHOT_DOWNLOAD: `${API_BASE_URL}/datasets/v3/snapshot/{snapshot_id}`,
    SNAPSHOT_DELIVER: `${API_BASE_URL}/datasets/v3/deliver/{snapshot_id}`,
    SNAPSHOT_CANCEL: `${API_BASE_URL}/datasets/v3/snapshot/{snapshot_id}/cancel`,

    // Datasets service (pre-collected data — separate from /datasets/v3/ scraper endpoints)
    DATASET_LIST: `${API_BASE_URL}/datasets/list`,
    DATASET_METADATA: `${API_BASE_URL}/datasets/{dataset_id}/metadata`,
    DATASET_FILTER: `${API_BASE_URL}/datasets/filter`,
    DATASET_SNAPSHOT_STATUS: `${API_BASE_URL}/datasets/snapshots/{snapshot_id}`,
    DATASET_SNAPSHOT_DOWNLOAD: `${API_BASE_URL}/datasets/snapshots/{snapshot_id}/download`,
};

export const DEFAULT_WEB_UNLOCKER_ZONE = 'sdk_unlocker';
export const DEFAULT_SERP_ZONE = 'sdk_serp';
