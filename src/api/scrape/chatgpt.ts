import type {
    DatasetOptions,
    OrchestrateOptions,
    ChatgptFilter,
} from '../../types/datasets';
import {
    DatasetOptionsSchema,
    ChatGPTInputSchema,
} from '../../schemas/datasets';
import { ChatgptFilterSchema } from '../../schemas/filters/chatgpt';
import { assertSchema } from '../../schemas/utils';
import { BaseAPI, type BaseAPIOptions } from './base';

const DATASET_ID = {
    CHATGPT: 'gd_m7aof0k82r803d5bjm',
};

const assertInput = (
    input: ChatgptFilter[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `chatgpt.${fn}: `;
    input.forEach((item, i) =>
        assertSchema(ChatgptFilterSchema, item, `${prefix}invalid filter[${i}]`),
    );
    return [
        assertSchema(ChatGPTInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class ChatgptAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'chatgpt';
        this.init();
    }
    /**
     * Fetch ChatGPT responses for one or more prompts.
     * @param input - an array
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the response data or snapshot meta
     */
    search(input: ChatgptFilter[], opt: DatasetOptions) {
        this.logger.info(`search for ${input.length} prompts`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'search');
        return this.run(safeInput, DATASET_ID.CHATGPT, safeOpt);
    }
    /**
     * ChatGPT prompt — one-call trigger+poll+fetch.
     * Equivalent to Python's client.scrape.chatgpt.prompt(text).
     */
    async prompt(input: ChatgptFilter[], opts?: OrchestrateOptions) {
        this.logger.info(`prompt (orchestrated) for ${input.length} prompts`);
        const [safeInput] = assertInput(input, {}, 'prompt');
        return this.orchestrate(safeInput, DATASET_ID.CHATGPT, opts);
    }
}
