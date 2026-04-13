import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';
import { parseResponse } from '../../utils/misc';
import { getLogger } from '../../utils/logger';
import { assertSchema } from '../../schemas/utils';
import {
    CollectorIdSchema,
    ScraperStudioRunOptionsSchema,
    TriggerResponseSchema,
    JobStatusResponseSchema,
    type ScraperStudioRunOptions,
    type JobStatus,
    type RunResult,
} from '../../schemas/scraperstudio';
import { ScraperStudioJob } from './job';

const logger = getLogger('scraperstudio');

export class ScraperStudioService {
    private transport: Transport;

    constructor(opts: { transport: Transport }) {
        this.transport = opts.transport;
    }

    async run(
        collector: string,
        options: ScraperStudioRunOptions,
    ): Promise<RunResult[]> {
        const safeCollector = assertSchema(
            CollectorIdSchema,
            collector,
            'scraperStudio.run.collector',
        );
        const safeOpts = assertSchema(
            ScraperStudioRunOptionsSchema,
            options,
            'scraperStudio.run.options',
        );

        const inputs = Array.isArray(safeOpts.input)
            ? safeOpts.input
            : [safeOpts.input];

        logger.info(
            `run: ${inputs.length} input(s) for collector ${safeCollector}`,
        );

        const results: RunResult[] = [];

        for (const input of inputs) {
            const start = Date.now();
            try {
                const job = await this._trigger(safeCollector, input);
                const data = await job.waitAndFetch({
                    timeout: safeOpts.timeout,
                    pollInterval: safeOpts.pollInterval,
                });
                results.push({
                    input,
                    data,
                    error: null,
                    responseId: job.responseId,
                    elapsedMs: Date.now() - start,
                });
            } catch (e: unknown) {
                results.push({
                    input,
                    data: null,
                    error: (e as Error).message,
                    responseId: null,
                    elapsedMs: Date.now() - start,
                });
            }
        }

        const succeeded = results.filter((r) => r.data !== null).length;
        logger.info(
            `run complete: ${succeeded}/${results.length} succeeded`,
        );

        return results;
    }

    async trigger(
        collector: string,
        input: Record<string, unknown>,
    ): Promise<ScraperStudioJob> {
        const safeCollector = assertSchema(
            CollectorIdSchema,
            collector,
            'scraperStudio.trigger.collector',
        );

        logger.info(`trigger: collector ${safeCollector}`);

        return this._trigger(safeCollector, input);
    }

    async status(jobId: string): Promise<JobStatus> {
        assertSchema(
            CollectorIdSchema,
            jobId,
            'scraperStudio.status.jobId',
        );

        logger.info(`status: job ${jobId}`);

        const url = `${API_ENDPOINT.DCA_LOG}/${jobId}`;
        const response = await this.transport.request(url, {});
        const responseTxt = await assertResponse(response);
        return parseResponse(
            responseTxt,
            JobStatusResponseSchema,
            'dca/log',
        );
    }

    async fetch(responseId: string): Promise<unknown[]> {
        const job = new ScraperStudioJob(responseId, this.transport);
        return job.fetch();
    }

    private async _trigger(
        collector: string,
        input: Record<string, unknown>,
    ): Promise<ScraperStudioJob> {
        const response = await this.transport.request(
            API_ENDPOINT.DCA_TRIGGER,
            {
                method: 'POST',
                query: { collector } as Record<string, unknown>,
                body: JSON.stringify(input),
            },
        );

        const responseTxt = await assertResponse(response);
        const result = parseResponse(
            responseTxt,
            TriggerResponseSchema,
            'dca/trigger_immediate',
        );

        return new ScraperStudioJob(result.response_id, this.transport);
    }
}
