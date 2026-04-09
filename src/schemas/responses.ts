import { z } from 'zod';

/**
 * Response from POST /datasets/v3/trigger
 * Used by: BaseAPI.run() to construct ScrapeJob
 * Critical field: snapshot_id (without it, job polls "undefined" forever)
 */
export const SnapshotMetaResponseSchema = z
    .object({
        snapshot_id: z.string().min(1),
    })
    .passthrough();

export type SnapshotMeta = z.infer<typeof SnapshotMetaResponseSchema>;

/**
 * Response from GET /datasets/v3/progress/{id}
 * Used by: SnapshotAPI.#getStatus(), polling loop
 * Critical field: status (without it, poll never sees 'ready')
 */
export const SnapshotStatusResponseSchema = z
    .object({
        snapshot_id: z.string(),
        dataset_id: z.string(),
        status: z.enum(['running', 'ready', 'failed', 'cancelled', 'error']),
    })
    .passthrough();

export type SnapshotStatusResponse = z.infer<
    typeof SnapshotStatusResponseSchema
>;
