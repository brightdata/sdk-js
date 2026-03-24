import { BRDError } from '../utils/errors';
import { getLogger } from '../utils/logger';

const logger = getLogger('rate-limiter');

interface Waiter {
    resolve: () => void;
    reject: (err: Error) => void;
}

export class RateLimiter {
    private maxRate: number;
    private ratePeriod: number;
    private tokens: number;
    private lastRefill: number;
    private waitQueue: Waiter[] = [];
    private timer: ReturnType<typeof setTimeout> | null = null;
    private closed = false;

    constructor(maxRate: number, ratePeriod: number) {
        this.maxRate = maxRate;
        this.ratePeriod = ratePeriod;
        this.tokens = maxRate;
        this.lastRefill = Date.now();
    }

    async acquire(): Promise<void> {
        if (this.closed) {
            throw new BRDError('rate limiter is closed');
        }

        this.refill();

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
        }

        return new Promise<void>((resolve, reject) => {
            this.waitQueue.push({ resolve, reject });
            logger.debug(
                `throttled: ${this.waitQueue.length} queued`,
                { queueLength: this.waitQueue.length },
            );
            if (!this.timer) {
                this.scheduleNext();
            }
        });
    }

    destroy(): void {
        this.closed = true;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const err = new BRDError('rate limiter is closed');
        for (const waiter of this.waitQueue) {
            waiter.reject(err);
        }
        this.waitQueue.length = 0;
    }

    private refill(): void {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const newTokens = elapsed * (this.maxRate / this.ratePeriod);
        this.tokens = Math.min(this.maxRate, this.tokens + newTokens);
        this.lastRefill = now;
    }

    private scheduleNext(): void {
        this.refill();
        const delay = ((1 - this.tokens) / this.maxRate) * this.ratePeriod;

        this.timer = setTimeout(
            () => {
                this.timer = null;

                if (this.closed || this.waitQueue.length === 0) return;

                this.refill();
                this.tokens -= 1;
                const waiter = this.waitQueue.shift()!;
                waiter.resolve();

                if (this.waitQueue.length > 0) {
                    this.scheduleNext();
                }
            },
            Math.max(0, delay),
        );
    }
}
