import { BaseResult, type BaseResultFields } from '../../models/result';

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
        super(fields);
        this.query = fields.query;
        this.intent = fields.intent ?? null;
        this.durationSeconds = fields.durationSeconds ?? null;
        this.totalResults = fields.totalResults ?? null;
        this.taskId = fields.taskId ?? null;
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
