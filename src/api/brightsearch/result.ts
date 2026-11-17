import { BrightSearchEnvelopeSchema } from '../../schemas/brightsearch.js';
import type {
    BrightSearchEnvelope,
    BrightSearchMeta,
    BrightSearchDocument,
} from '../../schemas/brightsearch.js';
import { assertSchema } from '../../schemas/utils.js';

/** One page. matched is a reached count, not a promise of a complete total. */
export class BrightSearchPage {
    readonly raw: BrightSearchEnvelope;
    readonly responseHeaders: Record<string, string>;

    constructor(raw: unknown, responseHeaders: Record<string, string> = {}) {
        // Validate the shape, but keep the original body including unknown keys.
        assertSchema(BrightSearchEnvelopeSchema, raw, 'BrightSearchPage');
        this.raw = raw as BrightSearchEnvelope;
        this.responseHeaders = responseHeaders;
    }

    get reqId(): string {
        return this.raw.req_id;
    }
    get source(): string {
        return this.raw.source;
    }
    get meta(): BrightSearchMeta {
        return this.raw.meta;
    }
    get documents(): BrightSearchDocument[] {
        return this.raw.documents;
    }
    get explain(): unknown {
        return this.raw.__explain__;
    }

    /** The same wire envelope; headers are separate and no fields are added. */
    toJSON(): BrightSearchEnvelope {
        return this.raw;
    }
}
