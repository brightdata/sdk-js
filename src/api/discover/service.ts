import type { z } from 'zod';
import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';
import { parseResponse } from '../../utils/misc';
import { getLogger } from '../../utils/logger';
import { assertSchema } from '../../schemas/utils';
import {
    DiscoverOptionsSchema,
    DiscoverQuerySchema,
    DiscoverTriggerResponseSchema,
    DiscoverPollResponseSchema,
    type DiscoverOptions,
} from '../../schemas/discover';
import { DiscoverJob } from './job';
import type { DiscoverResult } from './result';

const logger = getLogger('discover');

export class DiscoverService {
    private transport: Transport;

    constructor(opts: { transport: Transport }) {
        this.transport = opts.transport;
    }

    async search(query: string, opts?: DiscoverOptions): Promise<DiscoverResult> {
        const safeQuery = assertSchema(DiscoverQuerySchema, query, 'discover.query');
        const safeOpts = assertSchema(DiscoverOptionsSchema, opts ?? {}, 'discover.options');

        logger.info(`discover search: "${safeQuery}"`);

        const job = await this._trigger(safeQuery, safeOpts);
        return job.toResult({
            timeout: safeOpts.timeout,
            pollInterval: safeOpts.pollInterval,
        });
    }

    async trigger(query: string, opts?: DiscoverOptions): Promise<DiscoverJob> {
        const safeQuery = assertSchema(DiscoverQuerySchema, query, 'discover.query');
        const safeOpts = assertSchema(DiscoverOptionsSchema, opts ?? {}, 'discover.options');

        logger.info(`discover trigger: "${safeQuery}"`);

        return this._trigger(safeQuery, safeOpts);
    }

    async pollOnce(taskId: string) {
        const response = await this.transport.request(API_ENDPOINT.DISCOVER, {
            method: 'GET',
            query: { task_id: taskId } as Record<string, unknown>,
        });

        const responseTxt = await assertResponse(response);
        return parseResponse(responseTxt, DiscoverPollResponseSchema, 'discover (poll)');
    }

    private async _trigger(
        query: string,
        opts: z.output<typeof DiscoverOptionsSchema>,
    ): Promise<DiscoverJob> {
        const body: Record<string, unknown> = { query };
        if (opts.intent) body.intent = opts.intent;
        if (opts.includeContent) body.include_content = opts.includeContent;
        if (opts.country) body.country = opts.country;
        if (opts.city) body.city = opts.city;
        if (opts.language) body.language = opts.language;
        if (opts.filterKeywords) body.filter_keywords = opts.filterKeywords;
        if (opts.numResults) body.num_results = opts.numResults;
        if (opts.format) body.format = opts.format;

        const response = await this.transport.request(API_ENDPOINT.DISCOVER, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const responseTxt = await assertResponse(response);
        const result = parseResponse(
            responseTxt,
            DiscoverTriggerResponseSchema,
            'discover (trigger)',
        );

        return new DiscoverJob(result.task_id, this, {
            query,
            intent: opts.intent,
        });
    }
}
