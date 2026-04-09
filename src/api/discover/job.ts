import { getLogger } from '../../utils/logger';
import { sleep } from '../../utils/misc';
import { TimeoutError, APIError } from '../../utils/errors';
import { Deadline } from '../../utils/deadline';
import { DiscoverResult, type DiscoverResultItem } from './result';
import type { DiscoverOperations } from '../../types/discover';

const logger = getLogger('discover.job');

export interface DiscoverPollOptions {
    /** Maximum milliseconds to wait (default: 60_000) */
    timeout?: number;
    /** Milliseconds between status checks (default: 2_000) */
    pollInterval?: number;
}

export class DiscoverJob {
    readonly taskId: string;
    readonly query: string;
    readonly intent: string | null;
    readonly triggeredAt: Date;

    private readonly ops: DiscoverOperations;
    private cachedStatus: string | null = null;
    private cachedResults: unknown[] | null = null;
    private cachedDuration: number | null = null;

    constructor(
        taskId: string,
        ops: DiscoverOperations,
        options?: { query?: string; intent?: string },
    ) {
        this.taskId = taskId;
        this.ops = ops;
        this.query = options?.query ?? '';
        this.intent = options?.intent ?? null;
        this.triggeredAt = new Date();
    }

    toString(): string {
        return `<DiscoverJob task_id=${this.taskId.slice(0, 12)}...>`;
    }

    async status(refresh = true): Promise<string> {
        if (!refresh && this.cachedStatus) {
            return this.cachedStatus;
        }
        const response = await this.ops.pollOnce(this.taskId);
        this.cachedStatus = response.status;
        if (response.results) this.cachedResults = response.results;
        if (response.duration_seconds != null) this.cachedDuration = response.duration_seconds;
        return this.cachedStatus;
    }

    async wait(options?: DiscoverPollOptions): Promise<string> {
        const interval = options?.pollInterval ?? 2_000;
        const deadline = new Deadline(options?.timeout ?? 60_000);

        logger.debug(`${this}: waiting for completion`);

        for (;;) {
            if (deadline.expired) {
                throw new TimeoutError(
                    `Discover task timed out after ${Math.round(deadline.elapsed / 1000)}s for ${this.taskId}`,
                );
            }

            const response = await this.ops.pollOnce(this.taskId);
            this.cachedStatus = response.status;

            logger.debug(`${this}: status=${response.status} elapsed=${Math.round(deadline.elapsed / 1000)}s`);

            if (response.status === 'done') {
                if (response.results) this.cachedResults = response.results;
                if (response.duration_seconds != null) this.cachedDuration = response.duration_seconds;
                return 'done';
            }

            if (response.status === 'error' || response.status === 'failed') {
                throw new APIError(
                    `Discover task ${this.taskId} failed with status: ${response.status}`,
                );
            }

            await sleep(interval);
        }
    }

    async fetch(): Promise<DiscoverResultItem[]> {
        if (this.cachedResults) {
            return this.cachedResults as DiscoverResultItem[];
        }
        const response = await this.ops.pollOnce(this.taskId);
        this.cachedStatus = response.status;
        if (response.results) this.cachedResults = response.results;
        if (response.duration_seconds != null) this.cachedDuration = response.duration_seconds;
        return (response.results ?? []) as DiscoverResultItem[];
    }

    async toResult(options?: DiscoverPollOptions): Promise<DiscoverResult> {
        logger.debug(`${this}: starting toResult()`);

        try {
            await this.wait(options);
        } catch (e: unknown) {
            return new DiscoverResult({
                success: false,
                error: (e as Error).message,
                query: this.query,
                intent: this.intent,
                taskId: this.taskId,
                triggerSentAt: this.triggeredAt,
                dataFetchedAt: new Date(),
            });
        }

        try {
            const data = await this.fetch();
            return new DiscoverResult({
                success: true,
                data,
                query: this.query,
                intent: this.intent,
                taskId: this.taskId,
                durationSeconds: this.cachedDuration,
                totalResults: data.length,
                triggerSentAt: this.triggeredAt,
                dataFetchedAt: new Date(),
            });
        } catch (e: unknown) {
            return new DiscoverResult({
                success: false,
                error: (e as Error).message,
                query: this.query,
                intent: this.intent,
                taskId: this.taskId,
                triggerSentAt: this.triggeredAt,
                dataFetchedAt: new Date(),
            });
        }
    }
}
