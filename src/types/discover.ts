/**
 * Interface for discover operations needed by DiscoverJob.
 * DiscoverService implements this via structural typing.
 * Defined here (not in service.ts) to avoid circular imports.
 */
export interface DiscoverOperations {
    pollOnce(taskId: string): Promise<{
        status: string;
        results?: unknown[];
        duration_seconds?: number;
    }>;
}
