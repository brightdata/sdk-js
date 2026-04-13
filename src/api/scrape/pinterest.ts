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
    POST: 'gd_lk0sjs4d21kdr7cnlv',
    PROFILE: 'gd_lk0zv93c2m9qdph46z',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `pinterest.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class PinterestAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'pinterest';
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

    async posts(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`posts (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'posts');
        return this.orchestrate(safeInput, DATASET_ID.POST, opts);
    }

    async profiles(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(
            `profiles (orchestrated) for ${input.length} urls`,
        );
        const [safeInput] = assertInput(input, {}, 'profiles');
        return this.orchestrate(safeInput, DATASET_ID.PROFILE, opts);
    }
}
