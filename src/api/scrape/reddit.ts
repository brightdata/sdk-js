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
    POST: 'gd_lvz8ah06191smkebj4',
    COMMENTS: 'gd_lvzdpsdlw09j6t702',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `reddit.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class RedditAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'reddit';
        this.init();
    }

    collectPosts(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectPosts for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectPosts');
        return this.run(safeInput, DATASET_ID.POST, safeOpt);
    }

    collectComments(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectComments for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectComments',
        );
        return this.run(safeInput, DATASET_ID.COMMENTS, safeOpt);
    }

    async posts(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`posts (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'posts');
        return this.orchestrate(safeInput, DATASET_ID.POST, opts);
    }

    async comments(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`comments (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'comments');
        return this.orchestrate(safeInput, DATASET_ID.COMMENTS, opts);
    }
}
