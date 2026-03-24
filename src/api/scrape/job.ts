import { pollUntilReady, type PollOptions } from '../../utils/polling';
import { DataNotReadyError, TimeoutError } from '../../utils/errors';
import { sleep } from '../../utils/misc';
import { getLogger } from '../../utils/logger';

const logger = getLogger('scrape.job');
import { ScrapeResult } from '../../models/result';
import { Deadline } from '../../utils/deadline';
import type {
    SnapshotOperations,
    SnapshotFetchOptions,
    SnapshotDownloadOptions,
} from '../../types/datasets';

export class ScrapeJob {
    readonly snapshotId: string;
    readonly platform: string | null;
    readonly triggeredAt: Date;

    private readonly snapshotOps: SnapshotOperations;
    private cachedStatus: string | null = null;
    private cachedData: unknown = null;

    constructor(
        snapshotId: string,
        snapshotOps: SnapshotOperations,
        options?: {
            platform?: string;
            triggeredAt?: Date;
        },
    ) {
        this.snapshotId = snapshotId;
        this.snapshotOps = snapshotOps;
        this.platform = options?.platform ?? null;
        this.triggeredAt = options?.triggeredAt ?? new Date();
    }

    toString(): string {
        const platform = this.platform ? `${this.platform} ` : '';
        return `<ScrapeJob ${platform}snapshot_id=${this.snapshotId.slice(0, 12)}...>`;
    }

    /**
     * Check job status.
     * @param refresh - If false, returns cached status if available (default: true)
     * @returns Status string: "ready", "running", "failed", etc.
     */
    async status(refresh = true): Promise<string> {
        if (!refresh && this.cachedStatus) {
            return this.cachedStatus;
        }
        const response = await this.snapshotOps.getStatus(this.snapshotId);
        this.cachedStatus = response.status;
        return this.cachedStatus;
    }

    /**
     * Wait for job to complete.
     * @param options - Poll interval, timeout, and status callback
     * @returns Final status string ("ready")
     * @throws TimeoutError if timeout exceeded
     * @throws BRDError if job fails
     */
    async wait(options?: PollOptions): Promise<string> {
        await pollUntilReady(
            this.snapshotId,
            (id) => this.snapshotOps.getStatus(id),
            options,
        );
        this.cachedStatus = 'ready';
        return 'ready';
    }

    /**
     * Fetch job results into memory.
     * Does not check if job is ready — use wait() first.
     * @param options - Fetch options (format, default 'json')
     * @returns Parsed snapshot data
     */
    async fetch(options?: SnapshotFetchOptions): Promise<unknown> {
        this.cachedData = await this.snapshotOps.fetch(
            this.snapshotId,
            options,
        );
        return this.cachedData;
    }

    /**
     * Download job results to disk.
     * @param options - Download options (format, filename, compression)
     * @returns File path where data was saved
     */
    async download(options?: SnapshotDownloadOptions): Promise<string> {
        return this.snapshotOps.download(this.snapshotId, options);
    }

    /**
     * Cancel the job.
     */
    async cancel(): Promise<void> {
        return this.snapshotOps.cancel(this.snapshotId);
    }

    /**
     * Wait for completion and return results as a ScrapeResult.
     * Convenience method: wait() + fetch() with race condition handling.
     *
     * Never throws — errors are captured in ScrapeResult(success: false).
     * Uses Deadline to enforce a total time budget across race-condition retries.
     *
     * @param options - Poll interval and timeout options
     * @returns ScrapeResult with data on success, error details on failure
     */
    async toResult(options?: PollOptions): Promise<ScrapeResult> {
        const pollInterval = options?.pollInterval ?? 10_000;
        const deadline = new Deadline(options?.pollTimeout ?? 600_000);

        logger.debug(`${this}: starting toResult()`, { snapshotId: this.snapshotId });

        for (;;) {
            // Check total deadline before each wait attempt.
            // Without this, each race-condition retry would get a fresh full
            // timeout budget (the bug that Deadline was created to prevent).
            if (deadline.expired) {
                logger.debug(
                    `${this}: deadline expired after ${Math.round(deadline.elapsed / 1000)}s`,
                    { snapshotId: this.snapshotId },
                );
                return new ScrapeResult({
                    success: false,
                    error: `toResult timed out after ${Math.round(deadline.elapsed / 1000)}s for snapshot ${this.snapshotId}`,
                    status: 'timeout',
                    snapshotId: this.snapshotId,
                    platform: this.platform,
                    triggerSentAt: this.triggeredAt,
                    dataFetchedAt: new Date(),
                });
            }

            try {
                // Pass remaining budget — not the original timeout
                await this.wait({
                    ...options,
                    pollTimeout: deadline.remaining,
                });
            } catch (e: unknown) {
                // Timeout or failure during polling
                return new ScrapeResult({
                    success: false,
                    error: (e as Error).message,
                    status: e instanceof TimeoutError ? 'timeout' : 'error',
                    snapshotId: this.snapshotId,
                    platform: this.platform,
                    triggerSentAt: this.triggeredAt,
                    dataFetchedAt: new Date(),
                });
            }

            logger.debug(`${this}: wait complete, fetching data`, { snapshotId: this.snapshotId });

            try {
                const data = await this.fetch();
                const rowCount = Array.isArray(data) ? data.length : null;

                return new ScrapeResult({
                    success: true,
                    data,
                    status: 'ready',
                    snapshotId: this.snapshotId,
                    platform: this.platform,
                    method: 'web_scraper',
                    rowCount,
                    triggerSentAt: this.triggeredAt,
                    dataFetchedAt: new Date(),
                });
            } catch (e: unknown) {
                if (e instanceof DataNotReadyError) {
                    // Race condition: status said "ready" but fetch returned 202
                    logger.debug(`${this}: DataNotReadyError, retrying fetch`, { snapshotId: this.snapshotId });
                    await sleep(pollInterval);
                    continue;
                }
                // Other fetch errors
                return new ScrapeResult({
                    success: false,
                    error: (e as Error).message,
                    status: 'error',
                    snapshotId: this.snapshotId,
                    platform: this.platform,
                    triggerSentAt: this.triggeredAt,
                    dataFetchedAt: new Date(),
                });
            }
        }
    }
}
