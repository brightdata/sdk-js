import { BaseResult, type BaseResultFields } from '../../models/result.js';

export interface DiscoverResultItem {
    link: string;
    title: string;
    description: string;
    relevance_score: number;
    content?: string;
}

export interface DiscoverResultFields extends BaseResultFields<DiscoverResultItem[]> {
    query: string;
    intent?: string | null;
    durationSeconds?: number | null;
    totalResults?: number | null;
    taskId?: string | null;
}

export class DiscoverResult extends BaseResult<DiscoverResultItem[]> {
    readonly query: string;
    readonly intent: string | null;
    readonly durationSeconds: number | null;
    readonly totalResults: number | null;
    readonly taskId: string | null;

    constructor(fields: DiscoverResultFields) {
        // `data` is always an array (empty on failure) so callers can safely
        // iterate `result.data` / `result.results` without a null check.
        super({ ...fields, data: fields.data ?? [] });
        this.query = fields.query;
        this.intent = fields.intent ?? null;
        this.durationSeconds = fields.durationSeconds ?? null;
        this.totalResults = fields.totalResults ?? null;
        this.taskId = fields.taskId ?? null;
    }

    /**
     * The discovered items. Alias for `data`, kept in sync with the raw API's
     * `results` field. Always an array (empty when the search failed).
     */
    get results(): DiscoverResultItem[] {
        return this.data ?? [];
    }

    /** Iterate the discovered items directly: `for (const item of result)`. */
    [Symbol.iterator](): Iterator<DiscoverResultItem> {
        return this.results[Symbol.iterator]();
    }

    override toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            query: this.query,
            intent: this.intent,
            durationSeconds: this.durationSeconds,
            totalResults: this.totalResults,
            taskId: this.taskId,
        };
    }

    override toString(): string {
        const base = super.toString();
        const queryPreview = this.query.length > 50
            ? this.query.slice(0, 50) + '...'
            : this.query;
        return `<DiscoverResult ${base} query=${queryPreview}>`;
    }
}
