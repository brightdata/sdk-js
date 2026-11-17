import type { Dispatcher } from 'undici';
import { Transport, classifyTransportError } from '../../core/transport.js';
import {
    BrightSearchCategorySchema,
    BrightSearchJSONObjectSchema,
    BrightSearchOptionsSchema,
} from '../../schemas/brightsearch.js';
import type {
    BrightSearchCategory,
    BrightSearchJSONObject,
    BrightSearchNaturalOptions,
    BrightSearchStructuredOptions,
    BrightSearchOptions,
} from '../../schemas/brightsearch.js';
import { assertSchema } from '../../schemas/utils.js';
import { z } from 'zod';
import { API_ENDPOINT } from '../../utils/constants.js';
import {
    APIError,
    AuthenticationError,
    BRDError,
    NetworkError,
    NetworkTimeoutError,
    ValidationError,
    withHTTPContext,
} from '../../utils/errors.js';
import type { HTTPResponseContext } from '../../utils/errors.js';
import { BrightSearchPage } from './result.js';

function selectedHeaders(
    headers: Dispatcher.ResponseData['headers'],
): Record<string, string> {
    const selected: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
        const key = name.toLowerCase();
        if (
            ['retry-after', 'x-debug-trace', 'x-debug-trace-page'].includes(key)
        ) {
            if (typeof value === 'string') selected[key] = value;
            else if (Array.isArray(value)) selected[key] = value.join(', ');
        }
    }
    return selected;
}

function responseError(
    context: HTTPResponseContext,
    message: string,
    cause?: unknown,
): BRDError {
    const excerpt = context.responseText?.slice(0, 512);
    const detail = excerpt ? `${message}: ${excerpt}` : message;
    let error: BRDError;
    if (context.statusCode === 400) {
        error = new ValidationError(detail);
    } else if (context.statusCode === 401 || context.statusCode === 403) {
        error = new AuthenticationError(
            'invalid API key or insufficient permissions',
        );
    } else {
        const apiError = new APIError(detail, context.statusCode);
        // Full diagnostics stay accessible without expanding the displayed message.
        apiError.responseText = context.responseText ?? null;
        error = apiError;
    }
    return withHTTPContext(error, context, cause);
}

/** Direct indexed search. The owning client manages this service's transport. */
export class BrightSearchService {
    constructor(private readonly transport: Transport) {}

    search(
        category: 'company' | 'people',
        query: string,
        options: BrightSearchNaturalOptions,
    ): Promise<BrightSearchPage>;
    search(
        category: BrightSearchCategory,
        query: BrightSearchJSONObject,
        options: BrightSearchStructuredOptions,
    ): Promise<BrightSearchPage>;
    async search(
        category: BrightSearchCategory,
        query: string | BrightSearchJSONObject,
        options: BrightSearchOptions,
    ): Promise<BrightSearchPage> {
        const safeCategory = assertSchema(
            BrightSearchCategorySchema,
            category,
            'Bright Search category',
        );
        const opts = assertSchema(
            BrightSearchOptionsSchema,
            options,
            'Bright Search options',
        );
        if (safeCategory === 'ecom' && opts.mode !== 'ludicrous') {
            throw new ValidationError(
                'E-commerce supports ludicrous mode only',
            );
        }
        const safeQuery =
            opts.mode === 'ludicrous'
                ? assertSchema(
                      BrightSearchJSONObjectSchema,
                      query,
                      'Bright Search query',
                  )
                : assertSchema(z.string(), query, 'Bright Search query');
        if (
            safeCategory === 'ecom' &&
            (opts.source === undefined ||
                opts.source === 'retail_products_live') &&
            opts.view === 'summary'
        ) {
            throw new ValidationError(
                'retail_products_live does not support the summary view',
            );
        }

        const payload: BrightSearchJSONObject = {
            mode: opts.mode,
            query: safeQuery,
            offset: opts.offset,
            limit: opts.limit,
        };
        if (opts.source !== undefined) payload.source = opts.source;
        if (opts.view !== undefined) payload.view = opts.view;
        if (opts.debug !== undefined) Object.assign(payload, opts.debug);
        let body: string;
        try {
            body = JSON.stringify(payload);
        } catch {
            throw new ValidationError(
                'Bright Search payload cannot be serialized as JSON',
            );
        }
        const url = {
            company: API_ENDPOINT.BRIGHT_SEARCH_COMPANY,
            people: API_ENDPOINT.BRIGHT_SEARCH_PEOPLE,
            ecom: API_ENDPOINT.BRIGHT_SEARCH_ECOM,
        }[safeCategory];
        // Pre-response errors belong to Transport; do not mutate them with context.
        const response = await this.transport.request(url, {
            method: 'POST',
            body,
            timeout: opts.timeout,
            singleAttempt: true,
        });
        const context: HTTPResponseContext = {
            statusCode: response.statusCode,
            responseHeaders: selectedHeaders(response.headers),
            url,
            method: 'POST',
        };

        let bytes: ArrayBuffer;
        try {
            bytes = await response.body.arrayBuffer();
        } catch (cause) {
            response.body.destroy();
            if (response.statusCode !== 200) {
                throw responseError(
                    context,
                    'Bright Search response body could not be read',
                    cause,
                );
            }
            try {
                classifyTransportError(cause);
            } catch (classified) {
                // Always create a fresh contextual error, including when a body
                // emits an existing/shared SDK error.
                const ErrorType =
                    classified instanceof NetworkTimeoutError
                        ? NetworkTimeoutError
                        : NetworkError;
                throw withHTTPContext(
                    new ErrorType(
                        'Failed to read Bright Search response body',
                        { cause },
                    ),
                    context,
                );
            }
        }

        try {
            context.responseText = new TextDecoder('utf-8', {
                fatal: true,
            }).decode(bytes);
        } catch (cause) {
            // Replacement text is diagnostic display only, never parsed identity.
            context.responseText = new TextDecoder().decode(bytes);
            throw responseError(
                context,
                'Bright Search returned invalid UTF-8',
                cause,
            );
        }
        let data: unknown;
        try {
            data = JSON.parse(context.responseText) as unknown;
        } catch (cause) {
            throw responseError(
                context,
                'Bright Search returned invalid JSON',
                cause,
            );
        }
        context.responseJson = data;
        if (
            data !== null &&
            typeof data === 'object' &&
            'req_id' in data &&
            typeof data.req_id === 'string'
        ) {
            context.reqId = data.req_id;
        }
        if (response.statusCode !== 200) {
            throw responseError(context, 'Unexpected Bright Search status');
        }
        try {
            return new BrightSearchPage(data, context.responseHeaders);
        } catch (cause) {
            throw responseError(
                context,
                'Invalid Bright Search response envelope',
                cause,
            );
        }
    }
}
