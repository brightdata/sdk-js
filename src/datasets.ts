// Datasets service (pre-collected data).
// Usage: import { DatasetsClient } from '@brightdata/sdk/datasets'

export { DatasetsClient } from './api/datasets/client.js';
export { BaseDataset } from './api/datasets/base.js';
export type {
    DatasetInfo,
    DatasetMetadata,
    DatasetField,
    DatasetSnapshotStatus,
    DatasetDownloadOptions,
    DatasetQueryOptions,
} from './api/datasets/types.js';
