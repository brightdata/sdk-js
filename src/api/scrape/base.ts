import { API_ENDPOINT } from '../../utils/constants';
import { getLogger } from '../../utils/logger';
import { Transport, assertResponse } from '../../core/transport';
import { dropEmptyKeys, parseJSON, parseResponse } from '../../utils/misc';
import { SnapshotMetaResponseSchema } from '../../schemas/responses';
import { ScrapeJob } from './job';
import type {
    DatasetOptions,
    OrchestrateOptions,
    UnknownRecord,
    SnapshotFormat,
    SnapshotOperations,
} from '../../types/datasets';
import type { ScrapeResult } from '../../models/result';

interface WebhookDisabled {
    notify: undefined;
}

interface WebhookEnabled {
    notify: string;
    endpoint: string;
    auth_header?: string;
    uncompressed_webhook?: boolean;
}

type WebhookSettings = WebhookEnabled | WebhookDisabled;

interface DatasetsQueryParamsSync {
    dataset_id: string;
    custom_output_fields?: string;
    include_errors?: boolean;
    format?: SnapshotFormat;
}

type DatasetsQueryParamsAsync = DatasetsQueryParamsSync & {
    type?: 'discover_new';
    discover_by?: string;
    limit_per_input?: number;
    limit_multiple_results?: number;
} & WebhookSettings;

interface DatasetsQueryBodySync {
    input: UnknownRecord[];
    custom_output_fields?: string;
}

type DatasetsQueryBodyAsync = UnknownRecord[];

export interface BaseAPIOptions {
    transport: Transport;
    snapshotOps?: SnapshotOperations;
}

export class BaseAPI {
    protected name!: string;
    protected logger!: ReturnType<typeof getLogger>;
    protected transport: Transport;
    protected snapshotOps?: SnapshotOperations;

    constructor(opts: BaseAPIOptions) {
        this.transport = opts.transport;
        this.snapshotOps = opts.snapshotOps;
    }

    init() {
        this.logger = getLogger(`api.scrape.${this.name}`);
    }

    #getRequestBody(
        input: UnknownRecord[],
        opt: DatasetOptions,
    ): DatasetsQueryBodySync | DatasetsQueryBodyAsync {
        return opt.async ? input : { input };
    }

    #getRequestQuery(
        datasetId: string,
        opt: DatasetOptions,
    ): DatasetsQueryParamsSync | DatasetsQueryParamsAsync {
        let res: DatasetsQueryParamsAsync | DatasetsQueryParamsSync;

        if (opt.async) {
            res = {
                dataset_id: datasetId,
                custom_output_fields: opt.customOutputFields,
                include_errors: opt.includeErrors,
                format: opt.format,
                discover_by: opt.discoverBy,
                type: opt.type,
                limit_per_input: opt.limitPerInput,
                limit_multiple_results: opt.limitMultipleResults,
                notify: opt.notify,
                endpoint: opt.endpoint,
                auth_header: opt.authHeader,
                uncompressed_webhook: opt.uncompressedWebhook,
            };
        } else {
            res = {
                dataset_id: datasetId,
                custom_output_fields: opt.customOutputFields,
                include_errors: opt.includeErrors,
                format: opt.format,
            };
        }

        dropEmptyKeys(res as Record<keyof DatasetsQueryParamsSync, unknown>);

        return res;
    }

    protected async run(
        val: UnknownRecord[],
        datasetId: string,
        opt: DatasetOptions,
    ) {
        const body = this.#getRequestBody(val, opt);

        const endpoint = opt.async
            ? API_ENDPOINT.SCRAPE_ASYNC
            : API_ENDPOINT.SCRAPE_SYNC;

        const response = await this.transport.request(endpoint, {
            method: 'POST',
            query: this.#getRequestQuery(
                datasetId,
                opt,
            ) as unknown as Record<string, unknown>,
            body: JSON.stringify(body),
        });

        const responseTxt = await assertResponse(response);

        if (opt.async || response.statusCode === 202) {
            if (response.statusCode === 202 && !opt.async) {
                this.logger.info(
                    'request exceeded sync request timeout, converted to async',
                );
            }
            const meta = parseResponse(responseTxt, SnapshotMetaResponseSchema, 'datasets/v3/trigger');
            return new ScrapeJob(meta.snapshot_id, this.snapshotOps!, {
                platform: this.name,
            });
        }

        if (opt.format === 'json') {
            return parseJSON<UnknownRecord[]>(responseTxt);
        }

        return responseTxt;
    }

    /**
     * Trigger, poll, and fetch results in a single call.
     * Platform API methods delegate to this for one-call orchestration.
     *
     * Equivalent to Python's WorkflowExecutor.execute().
     *
     * @param input - Array of input records (URLs, filters, etc.)
     * @param datasetId - Bright Data dataset identifier
     * @param opts - Orchestration options (poll interval, timeout, format)
     * @returns Promise resolving with a ScrapeResult
     */
    protected async orchestrate(
        input: UnknownRecord[],
        datasetId: string,
        opts?: OrchestrateOptions,
    ): Promise<ScrapeResult> {
        const job = (await this.run(input, datasetId, {
            async: true,
            format: opts?.format,
        })) as ScrapeJob;

        return job.toResult({
            pollInterval: opts?.pollInterval,
            pollTimeout: opts?.pollTimeout,
            onStatus: opts?.onStatus,
        });
    }
}
