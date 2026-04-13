import type {
    DatasetOptions,
    DiscoverOptions,
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
    PRODUCT: 'gd_lj74waf72416ro0k65',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `digikey.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class DigikeyAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'digikey';
        this.init();
    }

    collectProducts(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectProducts for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectProducts',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, safeOpt);
    }

    async products(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`products (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'products');
        return this.orchestrate(safeInput, DATASET_ID.PRODUCT, opts);
    }
    /**
     * Discover DigiKey products by category URL.
     * @param input - an array of category URLs
     * @param opt - discover options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverByCategory(input: string[], opt: DiscoverOptions) {
        this.logger.info(
            `discoverByCategory for ${input.length} urls`,
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverByCategory',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'category',
        });
    }
}
