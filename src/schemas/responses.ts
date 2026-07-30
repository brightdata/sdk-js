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
 *
 * The Bright Data API owns the status vocabulary and adds lifecycle values over
 * time (e.g. "starting", "collecting"). The SDK observes the API's state machine:
 * pollUntilReady keeps polling on any status it does not recognize as terminal, so
 * the schema must NOT reject unknown values. Validate the SHAPE (status is a
 * non-empty string) — not the MEMBERSHIP. Terminal classification lives in
 * pollUntilReady, not here. Known values at time of writing:
 * running | ready | failed | cancelled | error.
 */
export const SnapshotStatusResponseSchema = z
    .object({
        snapshot_id: z.string(),
        dataset_id: z.string(),
        status: z.string().min(1),
    })
    .passthrough();

export type SnapshotStatusResponse = z.infer<
    typeof SnapshotStatusResponseSchema
>;
