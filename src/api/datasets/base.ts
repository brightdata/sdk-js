import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';
import { parseJSON } from '../../utils/misc';
import { getLogger } from '../../utils/logger';
import { pollUntilStatus } from '../../utils/polling';
import type {
    DatasetMetadata,
    DatasetSnapshotStatus,
    DatasetDownloadOptions,
    DatasetQueryOptions,
} from './types';

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
        this.logger.debug('getStatus', { snapshotId });
        const url = API_ENDPOINT.DATASET_SNAPSHOT_STATUS.replace(
            '{snapshot_id}',
            snapshotId,
        );
        const response = await this.transport.request(url);
        const text = await assertResponse(response);
        return parseJSON<DatasetSnapshotStatus>(text);
    }

    async download(
        snapshotId: string,
        opts?: DatasetDownloadOptions,
    ): Promise<unknown[]> {
        this.logger.debug('download', { snapshotId });
        await pollUntilStatus(snapshotId, (id) => this.getStatus(id));
        const url = API_ENDPOINT.DATASET_SNAPSHOT_DOWNLOAD.replace(
            '{snapshot_id}',
            snapshotId,
        );
        const query: Record<string, unknown> = {};
        if (opts?.format) query.format = opts.format;
        const response = await this.transport.request(url, { query });
        const text = await assertResponse(response);
        return parseJSON<unknown[]>(text);
    }
}
