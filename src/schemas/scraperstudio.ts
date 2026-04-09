import { z } from 'zod';

// --- Input validation ---

export const CollectorIdSchema = z
    .string()
    .min(1, 'collector ID is required');

export const ScraperStudioInputSchema = z.union([
    z.record(z.string(), z.any()),
    z.array(z.record(z.string(), z.any())),
]);

export type ScraperStudioInput = z.input<typeof ScraperStudioInputSchema>;

export const ScraperStudioRunOptionsSchema = z.object({
    input: ScraperStudioInputSchema,
    timeout: z.number().positive().default(500_000),
    pollInterval: z.number().positive().default(10_000),
});

export type ScraperStudioRunOptions = z.input<typeof ScraperStudioRunOptionsSchema>;

// --- Result type for run() ---

export interface RunResult {
    input: Record<string, unknown>;
    data: unknown[] | null;
    error: string | null;
    responseId: string | null;
    elapsedMs: number;
}

// --- Response validation ---

export const TriggerResponseSchema = z
    .object({
        response_id: z.string().min(1),
    })
    .passthrough();

// Job status from GET /dca/log/{id}
// The Bright Data API returns mixed-case keys: Id, Status, Collector, Success_rate, Job_time, etc.
// Validate critical fields (accepting both casings), then normalize to camelCase via transform.
const StatusField = z.enum([
    'queued',
    'running',
    'done',
    'failed',
    'cancelled',
    'unknown',
]);

export const JobStatusResponseSchema = z
    .object({
        id: z.string().optional(),
        Id: z.string().optional(),
        status: StatusField.optional(),
        Status: StatusField.optional(),
    })
    .passthrough()
    .refine((d) => d.id || d.Id, 'response missing id field')
    .refine((d) => d.status || d.Status, 'response missing status field')
    .transform((data: Record<string, unknown>) => {
        const get = (key: string) =>
            data[key] ??
            data[key.toLowerCase()] ??
            data[key.charAt(0).toUpperCase() + key.slice(1)];
        return {
            id: (get('id') ?? get('Id') ?? '') as string,
            status: (get('status') ?? get('Status') ?? 'unknown') as string,
            collector: (get('collector') ?? get('Collector') ?? '') as string,
            inputs: (get('inputs') ?? get('Inputs') ?? 0) as number,
            lines: (get('lines') ?? get('Lines') ?? 0) as number,
            fails: (get('fails') ?? get('Fails') ?? 0) as number,
            successRate: (get('success_rate') ??
                get('Success_rate') ??
                0) as number,
            created: (get('created') ?? get('Created') ?? '') as string,
            started: (get('started') ?? get('Started') ?? null) as
                | string
                | null,
            finished: (get('finished') ?? get('Finished') ?? null) as
                | string
                | null,
            jobTime: (get('job_time') ?? get('Job_time') ?? null) as
                | number
                | null,
            queueTime: (get('queue_time') ?? get('Queue_time') ?? null) as
                | number
                | null,
        };
    });

export type JobStatus = z.output<typeof JobStatusResponseSchema>;
