import {
    DataNotReadyError,
    NetworkError,
    TimeoutError,
} from '../../utils/errors';
import { sleep, parseJSON } from '../../utils/misc';
import { Deadline } from '../../utils/deadline';
import { getLogger } from '../../utils/logger';
import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';

const logger = getLogger('scraperstudio.job');
const MAX_NETWORK_RETRIES = 3;

export interface ScraperStudioPollOptions {
    /** Maximum milliseconds to wait (default: 180_000) */
    timeout?: number;
    /** Milliseconds between fetch attempts (default: 10_000) */
    pollInterval?: number;
}

export class ScraperStudioJob {
    readonly responseId: string;
    readonly triggeredAt: Date;

    // Takes Transport directly — no operations interface needed.
    // Unlike ScrapeJob→SnapshotOperations, there's no circular import to break.
    private readonly transport: Transport;

    constructor(responseId: string, transport: Transport) {
        this.responseId = responseId;
        this.transport = transport;
        this.triggeredAt = new Date();
    }

    toString(): string {
        return `<ScraperStudioJob response_id=${this.responseId}>`;
    }

    async fetch(): Promise<unknown[]> {
        const response = await this.transport.request(
            API_ENDPOINT.DCA_GET_RESULT,
            {
                method: 'GET',
                query: {
                    response_id: this.responseId,
                } as Record<string, unknown>,
            },
        );

        // Must check 202 before assertResponse — 202 is "not ready",
        // and the body must be consumed to release the undici connection.
        if (response.statusCode === 202) {
            await response.body.text();
            throw new DataNotReadyError(
                'scraper studio result not ready yet',
            );
        }

        const responseTxt = await assertResponse(response);
        return parseJSON<unknown[]>(responseTxt);
    }

    async waitAndFetch(options?: ScraperStudioPollOptions): Promise<unknown[]> {
        const deadline = new Deadline(options?.timeout ?? 500_000);
        const interval = options?.pollInterval ?? 10_000;
        let networkRetries = 0;

        logger.debug(`${this}: waiting for results`);

        for (;;) {
            if (deadline.expired) {
                throw new TimeoutError(
                    `Scraper Studio job timed out after ${Math.round(deadline.elapsed / 1000)}s for ${this.responseId}`,
                );
            }

            try {
                const data = await this.fetch();
                logger.debug(
                    `${this}: got ${data.length} results after ${Math.round(deadline.elapsed / 1000)}s`,
                );
                return data;
            } catch (e) {
                if (e instanceof DataNotReadyError) {
                    logger.debug(
                        `${this}: not ready, retrying in ${interval}ms`,
                    );
                    await sleep(interval);
                    continue;
                }
                if (
                    e instanceof NetworkError &&
                    networkRetries < MAX_NETWORK_RETRIES
                ) {
                    networkRetries++;
                    logger.debug(
                        `${this}: transient network error (${networkRetries}/${MAX_NETWORK_RETRIES}), retrying`,
                    );
                    await sleep(interval);
                    continue;
                }
                throw e;
            }
        }
    }
}
