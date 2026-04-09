import { BRDError, TimeoutError } from './errors';
import { sleep } from './misc';
import { getLogger } from './logger';

const logger = getLogger('polling');

export interface PollOptions {
    /** Milliseconds between status checks (default: 10_000) */
    pollInterval?: number;
    /** Maximum milliseconds to wait before timing out (default: 600_000) */
    pollTimeout?: number;
    /** Status value that means "done" (default: 'ready') */
    readyStatus?: string;
    /** Optional callback invoked after each status check */
    onStatus?: (status: string, elapsedMs: number) => void;
}

export async function pollUntilStatus(
    id: string,
    getStatus: (id: string) => Promise<{ status: string }>,
    options?: PollOptions,
): Promise<void> {
    const interval = options?.pollInterval ?? 10_000;
    const timeout = options?.pollTimeout ?? 600_000;
    const ready = options?.readyStatus ?? 'ready';
    const start = Date.now();
    logger.debug(`starting poll for ${id}`, { id });

    for (;;) {
        const elapsed = Date.now() - start;

        if (elapsed > timeout) {
            throw new TimeoutError(
                `Polling timed out after ${Math.round(elapsed / 1000)}s for ${id}`,
            );
        }

        const { status } = await getStatus(id);

        logger.debug(
            `poll ${id}: status=${status} elapsed=${Math.round(elapsed / 1000)}s`,
            { id, status, elapsedMs: elapsed },
        );

        options?.onStatus?.(status, elapsed);

        if (status === ready) {
            logger.debug(
                `poll ${id}: ${ready} after ${Math.round(elapsed / 1000)}s`,
                { id, elapsedMs: elapsed },
            );
            return;
        }
        if (status === 'failed' || status === 'error') {
            throw new BRDError(
                `${id} failed with status: ${status}`,
            );
        }

        await sleep(interval);
    }
}
