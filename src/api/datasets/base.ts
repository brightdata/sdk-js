import { Transport, assertResponse } from '../../core/transport.js';
import { API_ENDPOINT } from '../../utils/constants.js';
import { parseJSON } from '../../utils/misc.js';
import { getLogger } from '../../utils/logger.js';
import { pollUntilReady } from '../../utils/polling.js';
import { assertSchema } from '../../schemas/utils.js';
import { SnapshotIdSchema } from '../../schemas/datasets.js';
import type {
    DatasetMetadata,
    DatasetSnapshotStatus,
    DatasetDownloadOptions,
    DatasetQueryOptions,
} from './types.js';

export abstract class BaseDataset {
    abstract readonly datasetId: string;
    abstract readonly name: string;
    protected transport: Transport;
    private _logger?: ReturnType<typeof getLogger>;

    constructor(opts: { transport: Transport }) {
        this.transport = opts.transport;
    }

    protected get logger() {
        if (!this._logger) {
            this._logger = getLogger(`datasets.${this.name}`);
        }
        return this._logger;
    }

    async getMetadata(): Promise<DatasetMetadata> {
        this.logger.debug('getMetadata');
        const url = API_ENDPOINT.DATASET_METADATA.replace(
            '{dataset_id}',
            this.datasetId,
        );
        const response = await this.transport.request(url);
        const text = await assertResponse(response);
        return parseJSON<DatasetMetadata>(text);
    }

    async query(
        filter: Record<string, unknown>,
        opts?: DatasetQueryOptions,
    ): Promise<string> {
        this.logger.debug('query', { filter });
        const body: Record<string, unknown> = {
            dataset_id: this.datasetId,
            filter,
        };
        if (opts?.records_limit) {
            body.records_limit = opts.records_limit;
        }
        const response = await this.transport.request(
            API_ENDPOINT.DATASET_FILTER,
            {
                method: 'POST',
                body: JSON.stringify(body),
            },
        );
        const text = await assertResponse(response);
        const result = parseJSON<{ snapshot_id: string }>(text);
        return result.snapshot_id;
    }

    async sample(opts?: DatasetQueryOptions): Promise<string> {
        this.logger.debug('sample');
        return this.query({}, opts);
    }

    async getStatus(snapshotId: string): Promise<DatasetSnapshotStatus> {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'dataset.getStatus: invalid snapshot id',
        );
        this.logger.debug('getStatus', { snapshotId: safeId });
        // Encode the (validated) id as a second layer before it enters the path.
        const url = API_ENDPOINT.DATASET_SNAPSHOT_STATUS.replace(
            '{snapshot_id}',
            encodeURIComponent(safeId),
        );
        const response = await this.transport.request(url);
        const text = await assertResponse(response);
        return parseJSON<DatasetSnapshotStatus>(text);
    }

    async download(
        snapshotId: string,
        opts?: DatasetDownloadOptions,
    ): Promise<unknown[]> {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'dataset.download: invalid snapshot id',
        );
        this.logger.debug('download', { snapshotId: safeId });
        await pollUntilReady(safeId, (id) => this.getStatus(id));
        // Encode the (validated) id as a second layer before it enters the path.
        const url = API_ENDPOINT.DATASET_SNAPSHOT_DOWNLOAD.replace(
            '{snapshot_id}',
            encodeURIComponent(safeId),
        );
        const query: Record<string, unknown> = {};
        if (opts?.format) query.format = opts.format;
        const response = await this.transport.request(url, { query });
        const text = await assertResponse(response);
        return parseJSON<unknown[]>(text);
    }
}
