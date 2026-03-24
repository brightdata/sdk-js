/** Metadata about a dataset returned by /datasets/list */
export interface DatasetInfo {
    id: string;
    name: string;
    description?: string;
    records_count?: number;
    last_updated?: string;
}

/** Schema field descriptor returned by /datasets/{id}/metadata */
export interface DatasetField {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
}

/** Full metadata for a dataset */
export interface DatasetMetadata {
    id: string;
    name: string;
    description?: string;
    fields: DatasetField[];
}

/** Status of a dataset snapshot */
export interface DatasetSnapshotStatus {
    snapshot_id: string;
    status: 'pending' | 'running' | 'ready' | 'failed' | 'error';
    records_count?: number;
    progress?: number;
}

/** Options for downloading dataset snapshot data */
export interface DatasetDownloadOptions {
    format?: 'json' | 'csv' | 'ndjson';
}

/** Options for querying a dataset */
export interface DatasetQueryOptions {
    records_limit?: number;
}
