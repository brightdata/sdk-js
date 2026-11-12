import { z } from 'zod';

export type BrightSearchJSONValue =
    | string
    | number
    | boolean
    | null
    | BrightSearchJSONObject
    | BrightSearchJSONValue[];

export interface BrightSearchJSONObject {
    [key: string]: BrightSearchJSONValue;
}

// Check the values JSON.stringify would otherwise drop or rewrite, without
// invoking getters or toJSON. Repeated objects are valid; ancestor cycles aren't.
function isNativeJSON(input: unknown): boolean {
    const active = new WeakSet<object>();
    const stack: { value: unknown; leaving?: boolean }[] = [{ value: input }];
    try {
        while (stack.length) {
            const { value, leaving } = stack.pop()!;
            if (
                value === null ||
                typeof value === 'string' ||
                typeof value === 'boolean'
            ) {
                continue;
            }
            if (typeof value === 'number') {
                if (!Number.isFinite(value)) return false;
                continue;
            }
            if (typeof value !== 'object') return false;
            if (leaving) {
                active.delete(value);
                continue;
            }
            if (active.has(value)) return false;
            const array = Array.isArray(value);
            const prototype: unknown = Object.getPrototypeOf(value);
            if (
                array
                    ? prototype !== Array.prototype
                    : prototype !== Object.prototype && prototype !== null
            ) {
                return false;
            }
            const keys = Reflect.ownKeys(value);
            if (array && keys.length !== value.length + 1) return false;
            active.add(value);
            stack.push({ value, leaving: true });
            for (const key of keys) {
                if (array && key === 'length') continue;
                if (typeof key !== 'string') return false;
                if (
                    array &&
                    (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
                ) {
                    return false;
                }
                const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
                if (!descriptor.enumerable || !('value' in descriptor))
                    return false;
                stack.push({ value: descriptor.value as unknown });
            }
        }
        return true;
    } catch {
        return false;
    }
}

export const BrightSearchJSONValueSchema = z.custom<BrightSearchJSONValue>(
    isNativeJSON,
    'must contain only native JSON values (no cycles or non-finite numbers)',
);

export const BrightSearchJSONObjectSchema = z.custom<BrightSearchJSONObject>(
    (value) =>
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        isNativeJSON(value),
    'must be a native JSON object',
);

export const BrightSearchCategorySchema = z.enum(['company', 'people', 'ecom']);
export type BrightSearchCategory = z.infer<typeof BrightSearchCategorySchema>;
export type BrightSearchMode = 'ludicrous' | 'instant' | 'smart';

export const BrightSearchViewSchema = z.union([
    z.string(),
    z.strictObject({ fields: z.array(z.string()) }),
]);
export type BrightSearchView = z.infer<typeof BrightSearchViewSchema>;

// The keys are an explicit opt-in. Their changing internal configuration stays
// with the API; even false/zero/null must be preserved when explicitly supplied.
const DebugControlsSchema = z.strictObject({
    explain: BrightSearchJSONValueSchema.optional(),
    benchmark: BrightSearchJSONValueSchema.optional(),
    trace: BrightSearchJSONValueSchema.optional(),
    __overrides__: BrightSearchJSONValueSchema.optional(),
});
export type BrightSearchDebug = z.infer<typeof DebugControlsSchema>;
export const BrightSearchDebugSchema = z
    // Keep the pre-validation input type closed too: z.input of the containing
    // options schema must not inherit JSONObject's arbitrary key signature.
    .custom<BrightSearchDebug>(
        (value) => BrightSearchJSONObjectSchema.safeParse(value).success,
        'must be a native JSON object',
    )
    .pipe(DebugControlsSchema);

const commonOptions = {
    source: z.string().optional(),
    view: BrightSearchViewSchema.optional(),
    offset: z.int().min(0).max(1000).default(0),
    limit: z.int().min(0).max(100).default(10),
    debug: BrightSearchDebugSchema.optional(),
    timeout: z.number().positive().optional(),
};

export const BrightSearchStructuredOptionsSchema = z.strictObject({
    ...commonOptions,
    mode: z.literal('ludicrous'),
});
export const BrightSearchNaturalOptionsSchema = z.strictObject({
    ...commonOptions,
    mode: z.enum(['instant', 'smart']),
});
export type BrightSearchStructuredOptions = z.input<
    typeof BrightSearchStructuredOptionsSchema
>;
export type BrightSearchNaturalOptions = z.input<
    typeof BrightSearchNaturalOptionsSchema
>;
export type BrightSearchOptions =
    | BrightSearchStructuredOptions
    | BrightSearchNaturalOptions;

export const BrightSearchOptionsSchema = z
    .discriminatedUnion('mode', [
        BrightSearchStructuredOptionsSchema,
        BrightSearchNaturalOptionsSchema,
    ])
    .superRefine((options, ctx) => {
        if (options.mode === 'ludicrous') return;
        if (options.mode === 'smart' && options.limit > 10) {
            ctx.addIssue({
                code: 'custom',
                path: ['limit'],
                message: 'must be at most 10 for smart mode',
            });
        }
        if (options.offset + options.limit > 100) {
            ctx.addIssue({
                code: 'custom',
                path: ['offset'],
                message: 'instant and smart require offset + limit <= 100',
            });
        }
    });

export const BrightSearchEnvelopeSchema = z
    .object({
        req_id: z.string(),
        source: z.string(),
        meta: z
            .object({
                matched: z.number(),
                coverage_percent: z.number(),
                offset: z.int(),
                limit: z.int(),
            })
            .passthrough(),
        documents: z.array(
            z
                .object({
                    bright_id: z.string(),
                    data: z.record(z.string(), z.unknown()),
                    score: z.number().optional(),
                })
                .passthrough(),
        ),
    })
    .passthrough();

export type BrightSearchEnvelope = z.infer<typeof BrightSearchEnvelopeSchema>;
export type BrightSearchMeta = BrightSearchEnvelope['meta'];
export type BrightSearchDocument = BrightSearchEnvelope['documents'][number];
