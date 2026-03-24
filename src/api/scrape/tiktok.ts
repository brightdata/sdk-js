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
    POST: 'gd_lu702nij2f790tmv9h',
    PROFILE: 'gd_l1villgoiiidt09ci',
    COMMENTS: 'gd_lkf2st302ap89utw5k',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `tiktok.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class TiktokAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'tiktok';
        this.init();
    }

    collectPosts(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectPosts for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectPosts');
        return this.run(safeInput, DATASET_ID.POST, safeOpt);
    }

    collectProfiles(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectProfiles for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectProfiles',
        );
        return this.run(safeInput, DATASET_ID.PROFILE, safeOpt);
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

    async profiles(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`profiles (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'profiles');
        return this.orchestrate(safeInput, DATASET_ID.PROFILE, opts);
    }

    async comments(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`comments (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'comments');
        return this.orchestrate(safeInput, DATASET_ID.COMMENTS, opts);
    }
}
