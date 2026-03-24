/**
 * Tracks elapsed time against a fixed budget.
 * Use in retry loops to enforce a total time limit across multiple attempts.
 *
 * @example
 * const deadline = new Deadline(60_000); // 60s budget
 * while (!deadline.expired) {
 *     await attempt({ timeout: deadline.remaining });
 * }
 */
export class Deadline {
    private readonly start: number;
    private readonly budget: number;

    constructor(budgetMs: number) {
        this.start = Date.now();
        this.budget = budgetMs;
    }

    /** Milliseconds remaining. Returns 0 (not negative) when expired. */
    get remaining(): number {
        return Math.max(0, this.budget - (Date.now() - this.start));
    }

    /** True when the budget is exhausted. */
    get expired(): boolean {
        return this.remaining === 0;
    }

    /** Milliseconds elapsed since construction. */
    get elapsed(): number {
        return Date.now() - this.start;
    }
}
