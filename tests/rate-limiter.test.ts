import { describe, expect, test } from 'vitest';
import { RateLimiter } from '../src/core/rate-limiter';
import { BRDError } from '../src/utils/errors';

describe('RateLimiter', () => {
    test('allows maxRate requests immediately', async () => {
        const limiter = new RateLimiter(3, 1000);
        const start = Date.now();
        await limiter.acquire();
        await limiter.acquire();
        await limiter.acquire();
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(50);
    });

    test('throttles beyond maxRate', async () => {
        const limiter = new RateLimiter(2, 1000);
        await limiter.acquire();
        await limiter.acquire();
        const start = Date.now();
        await limiter.acquire();
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(400);
        expect(elapsed).toBeLessThan(700);
    });

    test('waiters are served FIFO', async () => {
        const limiter = new RateLimiter(1, 1000);
        await limiter.acquire();
        const order: number[] = [];
        const p1 = limiter.acquire().then(() => order.push(1));
        const p2 = limiter.acquire().then(() => order.push(2));
        await Promise.all([p1, p2]);
        expect(order).toEqual([1, 2]);
    });

    test('destroy rejects all queued waiters', async () => {
        const limiter = new RateLimiter(1, 1000);
        await limiter.acquire();
        const p1 = limiter.acquire();
        const p2 = limiter.acquire();
        limiter.destroy();
        await expect(p1).rejects.toThrow(BRDError);
        await expect(p2).rejects.toThrow(BRDError);
    });

    test('acquire throws after destroy', async () => {
        const limiter = new RateLimiter(5, 1000);
        limiter.destroy();
        await expect(limiter.acquire()).rejects.toThrow(
            'rate limiter is closed',
        );
    });
});
