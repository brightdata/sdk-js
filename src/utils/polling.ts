import { BRDError, TimeoutError } from './errors';
import { sleep } from './misc';
import { getLogger } from './logger';

const logger = getLogger('polling');

export interface PollOptions {
    /** Milliseconds between status checks (default: 10_000) */
    pollInterval?: number;
    /** Maximum milliseconds to wait before timing out (default: 600_000) */
    pollTimeout?: number;
    /** Optional callback invoked after each status check */
    onStatus?: (status: string, elapsedMs: number) => void;
}

export async function pollUntilReady(
    snapshotId: string,
    getStatus: (id: string) => Promise<{ status: string }>,
    options?: PollOptions,
): Promise<void> {
    const interval = options?.pollInterval ?? 10_000;
    const timeout = options?.pollTimeout ?? 600_000;
    const start = Date.now();
    logger.debug(`starting poll for snapshot ${snapshotId}`, { snapshotId });

    for (;;) {
        const elapsed = Date.now() - start;

        if (elapsed > timeout) {
            throw new TimeoutError(
                `Polling timed out after ${Math.round(elapsed / 1000)}s for snapshot ${snapshotId}`,
            );
        }

        const { status } = await getStatus(snapshotId);

        logger.debug(
            `poll ${snapshotId}: status=${status} elapsed=${Math.round(elapsed / 1000)}s`,
            { snapshotId, status, elapsedMs: elapsed },
        );

        options?.onStatus?.(status, elapsed);

        if (status === 'ready') {
            logger.debug(
                `poll ${snapshotId}: ready after ${Math.round(elapsed / 1000)}s`,
                { snapshotId, elapsedMs: elapsed },
            );
            return;
        }
        if (status === 'failed' || status === 'error') {
            throw new BRDError(
                `Snapshot ${snapshotId} failed with status: ${status}`,
            );
        }

        await sleep(interval);
    }
}
