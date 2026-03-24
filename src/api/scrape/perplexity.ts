import type {
    DatasetOptions,
    OrchestrateOptions,
    UnknownRecord,
} from '../../types/datasets';
import {
    DatasetOptionsSchema,
    DatasetMixedInputSchema,
} from '../../schemas/datasets';
import { assertSchema } from '../../schemas/utils';
import { BaseAPI, type BaseAPIOptions } from './base';

const DATASET_ID = {
    // TODO: confirm dataset ID from Bright Data API registry
    SEARCH: 'gd_m0ci4ikq4icr52snty',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `perplexity.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class PerplexityAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'perplexity';
        this.init();
    }

    collectSearch(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectSearch for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectSearch');
        return this.run(safeInput, DATASET_ID.SEARCH, safeOpt);
    }

    async search(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`search (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'search');
        return this.orchestrate(safeInput, DATASET_ID.SEARCH, opts);
    }
}
