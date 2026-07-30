import { API_ENDPOINT } from '../../utils/constants.js';
import { Transport, assertResponse } from '../../core/transport.js';
import { parseResponse } from '../../utils/misc.js';
import { getLogger } from '../../utils/logger.js';
import { assertSchema } from '../../schemas/utils.js';
import {
    CrawlInputSchema,
    CrawlOptionsSchema,
    CrawlDownloadOptionsSchema,
    type CrawlOptions,
    type CrawlDownloadOptions,
} from '../../schemas/crawler.js';
import { SnapshotMetaResponseSchema } from '../../schemas/responses.js';
import { ScrapeJob } from '../scrape/job.js';
import { CrawlResult, type CrawlRecord } from './result.js';
import type { SnapshotOperations } from '../../types/datasets.js';

const DATASET_ID = 'gd_m6gjtfmeh43we6cqc';
const PLATFORM = 'crawler';

export class CrawlerService {
    private transport: Transport;
    private snapshotOps: SnapshotOperations;
    private logger = getLogger('crawler');

    constructor(opts: { transport: Transport; snapshotOps: SnapshotOperations }) {
        this.transport = opts.transport;
        this.snapshotOps = opts.snapshotOps;
    }

    async crawl(
        urls: string | string[],
        opts: CrawlOptions = {},
    ): Promise<CrawlResult> {
        const safeUrls = assertSchema(CrawlInputSchema, urls, 'crawler.crawl.urls');
        const safeOpts = assertSchema(CrawlOptionsSchema, opts, 'crawler.crawl.opts');
        const urlList = Array.isArray(safeUrls) ? safeUrls : [safeUrls];

        this.logger.info(`crawl: ${urlList.length} url(s)`);
        const triggerSentAt = new Date();

        try {
            const response = await this.transport.request(
                API_ENDPOINT.SCRAPE_SYNC,
                {
                    method: 'POST',
                    query: {
                        dataset_id: DATASET_ID,
                        notify: 'false',
                        include_errors: safeOpts.includeErrors ? 'true' : 'false',
                    },
                    body: JSON.stringify({
                        input: urlList.map((url) => ({ url })),
                    }),
                },
            );

            const text = await assertResponse(response);
            const records = parseRecords(text);
            return new CrawlResult({
                success: true,
                data: records,
                pageCount: records.length,
                triggerSentAt,
                dataFetchedAt: new Date(),
            });
        } catch (e: unknown) {
            return new CrawlResult({
                success: false,
                error: (e as Error).message,
                triggerSentAt,
                dataFetchedAt: new Date(),
            });
        }
    }

    async trigger(
        urls: string | string[],
        opts: CrawlOptions = {},
    ): Promise<ScrapeJob> {
        const safeUrls = assertSchema(
            CrawlInputSchema,
            urls,
            'crawler.trigger.urls',
        );
        const safeOpts = assertSchema(
            CrawlOptionsSchema,
            opts,
            'crawler.trigger.opts',
        );
        const urlList = Array.isArray(safeUrls) ? safeUrls : [safeUrls];

        this.logger.info(`trigger: ${urlList.length} url(s)`);

        const response = await this.transport.request(API_ENDPOINT.SCRAPE_ASYNC, {
            method: 'POST',
            query: {
                dataset_id: DATASET_ID,
                notify: 'false',
                include_errors: safeOpts.includeErrors ? 'true' : 'false',
            },
            body: JSON.stringify({ input: urlList.map((url) => ({ url })) }),
        });

        const text = await assertResponse(response);
        const meta = parseResponse(
            text,
            SnapshotMetaResponseSchema,
            'crawler.trigger',
        );
        return new ScrapeJob(meta.snapshot_id, this.snapshotOps, {
            platform: PLATFORM,
        });
    }

    async status(snapshotId: string): Promise<string> {
        const meta = await this.snapshotOps.getStatus(snapshotId);
        return meta.status;
    }

    async download(
        snapshotId: string,
        opts: CrawlDownloadOptions = {},
    ): Promise<CrawlResult> {
        const safeOpts = assertSchema(
            CrawlDownloadOptionsSchema,
            opts,
            'crawler.download.opts',
        );
        const job = new ScrapeJob(snapshotId, this.snapshotOps, {
            platform: PLATFORM,
        });
        const scrapeResult = await job.toResult({
            pollInterval: safeOpts.pollInterval,
            pollTimeout: safeOpts.pollTimeout,
        });

        return new CrawlResult({
            success: scrapeResult.success,
            data: (scrapeResult.data as CrawlRecord[] | null) ?? [],
            pageCount: scrapeResult.rowCount,
            snapshotId: scrapeResult.snapshotId,
            triggerSentAt: scrapeResult.triggerSentAt,
            dataFetchedAt: scrapeResult.dataFetchedAt,
            error: scrapeResult.error,
        });
    }
}

function parseRecords(text: string): CrawlRecord[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) return parsed.filter(isRecord);
        if (isRecord(parsed)) return [parsed];
        return [];
    } catch {
        return trimmed
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .flatMap((line) => {
                try {
                    const x = JSON.parse(line) as unknown;
                    if (Array.isArray(x)) return x.filter(isRecord);
                    if (isRecord(x)) return [x];
                    return [];
                } catch {
                    return [];
                }
            });
    }
}

function isRecord(x: unknown): x is CrawlRecord {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}
