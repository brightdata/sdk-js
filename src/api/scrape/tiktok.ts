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
    POSTS_BY_PROFILE_FAST: 'gd_m7n5v2gq296pex2f5m',
    POSTS_BY_URL_FAST: 'gd_m736hjp71lejc5dc0l',
    POSTS_BY_SEARCH_URL_FAST: 'gd_m7n5ixlw1gc4no56kx',
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

    collectPostsByProfileFast(input: string[], opt: DatasetOptions) {
        this.logger.info(
            `collectPostsByProfileFast for ${input.length} urls`,
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectPostsByProfileFast',
        );
        return this.run(
            safeInput,
            DATASET_ID.POSTS_BY_PROFILE_FAST,
            safeOpt,
        );
    }

    collectPostsByUrlFast(input: string[], opt: DatasetOptions) {
        this.logger.info(
            `collectPostsByUrlFast for ${input.length} urls`,
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectPostsByUrlFast',
        );
        return this.run(safeInput, DATASET_ID.POSTS_BY_URL_FAST, safeOpt);
    }

    collectPostsBySearchUrlFast(input: string[], opt: DatasetOptions) {
        this.logger.info(
            `collectPostsBySearchUrlFast for ${input.length} urls`,
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectPostsBySearchUrlFast',
        );
        return this.run(
            safeInput,
            DATASET_ID.POSTS_BY_SEARCH_URL_FAST,
            safeOpt,
        );
    }

    async postsByProfileFast(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(
            `postsByProfileFast (orchestrated) for ${input.length} urls`,
        );
        const [safeInput] = assertInput(input, {}, 'postsByProfileFast');
        return this.orchestrate(
            safeInput,
            DATASET_ID.POSTS_BY_PROFILE_FAST,
            opts,
        );
    }

    async postsByUrlFast(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(
            `postsByUrlFast (orchestrated) for ${input.length} urls`,
        );
        const [safeInput] = assertInput(input, {}, 'postsByUrlFast');
        return this.orchestrate(
            safeInput,
            DATASET_ID.POSTS_BY_URL_FAST,
            opts,
        );
    }

    async postsBySearchUrlFast(
        input: string[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(
            `postsBySearchUrlFast (orchestrated) for ${input.length} urls`,
        );
        const [safeInput] = assertInput(input, {}, 'postsBySearchUrlFast');
        return this.orchestrate(
            safeInput,
            DATASET_ID.POSTS_BY_SEARCH_URL_FAST,
            opts,
        );
    }
}
