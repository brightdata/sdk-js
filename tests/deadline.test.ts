import { describe, expect, test, vi } from 'vitest';
import { Deadline } from '../src/utils/deadline';

describe('Deadline', () => {
    test('remaining decreases over time', () => {
        const deadline = new Deadline(1000);
        expect(deadline.remaining).toBeLessThanOrEqual(1000);
        expect(deadline.remaining).toBeGreaterThan(0);
        expect(deadline.expired).toBe(false);
    });

    test('expired is true after budget exhausted', () => {
        vi.useFakeTimers();
        try {
            const deadline = new Deadline(100);
            expect(deadline.expired).toBe(false);
            vi.advanceTimersByTime(150);
            expect(deadline.expired).toBe(true);
            expect(deadline.remaining).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });

    test('remaining never goes negative', () => {
        vi.useFakeTimers();
        try {
            const deadline = new Deadline(50);
            vi.advanceTimersByTime(200);
            expect(deadline.remaining).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });

    test('elapsed tracks time since construction', () => {
        vi.useFakeTimers();
        try {
            const deadline = new Deadline(10_000);
            vi.advanceTimersByTime(3000);
            expect(deadline.elapsed).toBe(3000);
        } finally {
            vi.useRealTimers();
        }
    });
});
