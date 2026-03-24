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
    VIDEO: 'gd_lk56epmy2i5g7lzu0k',
    CHANNEL: 'gd_lk538t2k2p1k3oos71',
    COMMENTS: 'gd_lk9q0ew71spt1mxywf',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `youtube.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class YoutubeAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'youtube';
        this.init();
    }

    collectVideos(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectVideos for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectVideos');
        return this.run(safeInput, DATASET_ID.VIDEO, safeOpt);
    }

    collectChannels(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectChannels for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectChannels',
        );
        return this.run(safeInput, DATASET_ID.CHANNEL, safeOpt);
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

    async videos(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`videos (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'videos');
        return this.orchestrate(safeInput, DATASET_ID.VIDEO, opts);
    }

    async channels(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`channels (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'channels');
        return this.orchestrate(safeInput, DATASET_ID.CHANNEL, opts);
    }

    async comments(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`comments (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'comments');
        return this.orchestrate(safeInput, DATASET_ID.COMMENTS, opts);
    }
}
