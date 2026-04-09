import type { Dispatcher } from 'undici';
import { API_ENDPOINT } from '../../utils/constants';
import { DataNotReadyError } from '../../utils/errors';
import { assertResponse, throwInvalidStatus } from '../../core/transport';
import {
    routeDownloadStream,
    getFilename,
    getAbsAndEnsureDir,
} from '../../utils/files';
import { parseJSON, parseResponse } from '../../utils/misc';
import { pollUntilStatus } from '../../utils/polling';
import type { z } from 'zod';
import {
    SnapshotIdSchema,
    SnapshotDownloadOptionsSchema,
    SnapshotFetchOptionsSchema,
} from '../../schemas/datasets';
import type { SnapshotDownloadOptions, SnapshotFetchOptions } from '../../schemas/datasets';
import { assertSchema } from '../../schemas/utils';
import { SnapshotStatusResponseSchema } from '../../schemas/responses';
import { BaseAPI, BaseAPIOptions } from './base';

const assertDownloadStatus = (status: number) => {
    if (status < 202) return;

    if (status === 202) {
        throw new DataNotReadyError(
            'snapshot is not ready yet, please try again later',
        );
    }

    throwInvalidStatus(status, 'snapshot download failed');
};

export class SnapshotAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'snapshot';
        this.init();
    }
    /**
     * Get the status of a dataset snapshot.
     * @param snapshotId - The unique identifier of the snapshot
     * @returns A promise that resolves with the snapshot status metadata
     */
    async getStatus(snapshotId: string) {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'snapshot.getStatus: invalid snapshot id',
        );
        return this.#getStatus(safeId);
    }
    /**
     * Download the data from a dataset snapshot.
     * @param snapshotId - The unique identifier of the snapshot
     * @param opts - Download options including format and compression settings
     * @returns A promise that resolves with the full filename where the data is saved
     */
    async download(snapshotId: string, options?: SnapshotDownloadOptions) {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'snapshot.download: invalid snapshot id',
        );
        const safeOpts = assertSchema(
            SnapshotDownloadOptionsSchema,
            options || {},
            'snapshot.download: invalid options',
        );
        return this.#download(safeId, safeOpts);
    }
    /**
     * Fetch snapshot results into memory.
     * @param snapshotId - The unique identifier of the snapshot
     * @param options - Optional fetch options (format)
     * @returns A promise that resolves with the parsed snapshot data
     */
    async fetch(snapshotId: string, options?: SnapshotFetchOptions) {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'snapshot.fetch: invalid snapshot id',
        );
        const safeOpts = assertSchema(
            SnapshotFetchOptionsSchema,
            options || {},
            'snapshot.fetch: invalid options',
        );
        return this.#fetch(safeId, safeOpts);
    }
    /**
     * Cancel the dataset gathering process.
     * @param snapshotId - The unique identifier of the snapshot
     * @returns A promise that resolves once the snapshot is cancelled
     */
    async cancel(snapshotId: string): Promise<void> {
        const safeId = assertSchema(
            SnapshotIdSchema,
            snapshotId,
            'snapshot.cancel: invalid snapshot id',
        );
        return this.#cancel(safeId);
    }

    async #getStatus(snapshotId: string) {
        this.logger.info(`fetching snapshot status for id ${snapshotId}`);
        const url = API_ENDPOINT.SNAPSHOT_STATUS.replace(
            '{snapshot_id}',
            snapshotId,
        );

        const response = await this.transport.request(url, {});
        const responseTxt = await assertResponse(response);
        return parseResponse(responseTxt, SnapshotStatusResponseSchema, 'datasets/v3/progress');
    }

    async #fetch(
        snapshotId: string,
        options: z.infer<typeof SnapshotFetchOptionsSchema>,
    ): Promise<unknown> {
        this.logger.info(
            `fetching snapshot data for id ${snapshotId} into memory`,
        );

        const url = API_ENDPOINT.SNAPSHOT_DOWNLOAD.replace(
            '{snapshot_id}',
            snapshotId,
        );

        const response = await this.transport.request(url, {
            method: 'GET',
            query: {
                format: options.format,
            } as Record<string, unknown>,
        });

        // Must consume body before throwing so the connection is
        // released back to undici's pool
        if (response.statusCode === 202) {
            await response.body.text();
            throw new DataNotReadyError(
                'snapshot is not ready yet, please try again later',
            );
        }

        const responseTxt = await assertResponse(response);

        if (options.format === 'json') {
            return parseJSON<unknown[]>(responseTxt);
        }

        return responseTxt;
    }

    async #download(
        snapshotId: string,
        options: z.infer<typeof SnapshotDownloadOptionsSchema>,
    ): Promise<string> {
        this.logger.info(`fetching snapshot for id ${snapshotId}`);

        const url = API_ENDPOINT.SNAPSHOT_DOWNLOAD.replace(
            '{snapshot_id}',
            snapshotId,
        );

        if (options.statusPolling) {
            await this.#awaitReady(snapshotId);
        }

        const filename = getFilename(options.filename, options.format);
        const target = await getAbsAndEnsureDir(filename);

        this.logger.info(
            `starting streaming snapshot ${snapshotId} data to ${target}`,
        );

        await this.transport.stream(
            url,
            {
                method: 'GET',
                query: {
                    format: options.format,
                    compress: options.compress,
                } as Record<string, unknown>,
                opaque: {
                    filename: target,
                    assertStatus: assertDownloadStatus,
                },
            },
            routeDownloadStream as unknown as Dispatcher.StreamFactory,
        );

        return target;
    }

    async #awaitReady(snapshotId: string): Promise<void> {
        this.logger.info(`polling snapshot status for id ${snapshotId}`);

        await pollUntilStatus(snapshotId, (id) => this.#getStatus(id), {
            pollInterval: 10_000,
            onStatus: (status, elapsed) => {
                this.logger.info(
                    `snapshot ${snapshotId} status: ${status} (${Math.round(elapsed / 1000)}s elapsed)`,
                );
            },
        });
    }

    async #cancel(snapshotId: string) {
        this.logger.info(`cancelling snapshot for id ${snapshotId}`);
        const url = API_ENDPOINT.SNAPSHOT_CANCEL.replace(
            '{snapshot_id}',
            snapshotId,
        );

        const response = await this.transport.request(url, {
            method: 'POST',
        });

        await assertResponse(response);
    }
}
