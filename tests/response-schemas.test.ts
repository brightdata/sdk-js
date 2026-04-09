import { describe, expect, test } from 'vitest';
import {
    SnapshotMetaResponseSchema,
    SnapshotStatusResponseSchema,
} from '../src/schemas/responses';
import { parseResponse } from '../src/utils/misc';
import { APIError } from '../src/utils/errors';

describe('parseResponse', () => {
    const schema = SnapshotMetaResponseSchema;

    test('valid JSON with matching schema returns parsed data', () => {
        const result = parseResponse(
            '{"snapshot_id":"abc123"}',
            schema,
            'test',
        );
        expect(result.snapshot_id).toBe('abc123');
    });

    test('valid JSON with missing critical field throws APIError', () => {
        expect(() => parseResponse('{}', schema, 'test')).toThrow(APIError);
    });

    test('valid JSON with extra unknown fields passes (passthrough)', () => {
        const result = parseResponse(
            '{"snapshot_id":"abc123","extra":true}',
            schema,
            'test',
        );
        expect(result.snapshot_id).toBe('abc123');
        expect(result.extra).toBe(true);
    });

    test('malformed JSON throws APIError (from inner parseJSON)', () => {
        expect(() => parseResponse('{bad json', schema, 'test')).toThrow(
            APIError,
        );
    });

    test('error message includes label', () => {
        expect(() =>
            parseResponse('{}', schema, 'datasets/v3/trigger'),
        ).toThrow(/datasets\/v3\/trigger/);
    });
});

describe('SnapshotMetaResponseSchema', () => {
    test('accepts {snapshot_id: "abc123"}', () => {
        const result = SnapshotMetaResponseSchema.parse({
            snapshot_id: 'abc123',
        });
        expect(result.snapshot_id).toBe('abc123');
    });

    test('rejects {}', () => {
        expect(() => SnapshotMetaResponseSchema.parse({})).toThrow();
    });

    test('rejects {snapshot_id: ""}', () => {
        expect(() =>
            SnapshotMetaResponseSchema.parse({ snapshot_id: '' }),
        ).toThrow();
    });

    test('accepts with extra fields', () => {
        const result = SnapshotMetaResponseSchema.parse({
            snapshot_id: 'abc',
            extra_field: true,
        });
        expect(result.snapshot_id).toBe('abc');
        expect(result.extra_field).toBe(true);
    });
});

describe('SnapshotStatusResponseSchema', () => {
    test('accepts valid status response', () => {
        const result = SnapshotStatusResponseSchema.parse({
            status: 'ready',
            snapshot_id: 's1',
            dataset_id: 'd1',
        });
        expect(result.status).toBe('ready');
    });

    test('accepts all valid status values', () => {
        for (const status of [
            'running',
            'ready',
            'failed',
            'cancelled',
            'error',
        ]) {
            const result = SnapshotStatusResponseSchema.parse({
                status,
                snapshot_id: 's1',
                dataset_id: 'd1',
            });
            expect(result.status).toBe(status);
        }
    });

    test('rejects unknown status value', () => {
        expect(() =>
            SnapshotStatusResponseSchema.parse({
                status: 'unknown',
                snapshot_id: 's1',
                dataset_id: 'd1',
            }),
        ).toThrow();
    });

    test('rejects missing status', () => {
        expect(() =>
            SnapshotStatusResponseSchema.parse({
                snapshot_id: 's1',
                dataset_id: 'd1',
            }),
        ).toThrow();
    });

    test('rejects missing snapshot_id', () => {
        expect(() =>
            SnapshotStatusResponseSchema.parse({
                status: 'ready',
                dataset_id: 'd1',
            }),
        ).toThrow();
    });

    test('rejects missing dataset_id', () => {
        expect(() =>
            SnapshotStatusResponseSchema.parse({
                status: 'ready',
                snapshot_id: 's1',
            }),
        ).toThrow();
    });

    test('accepts with extra fields', () => {
        const result = SnapshotStatusResponseSchema.parse({
            status: 'running',
            snapshot_id: 's1',
            dataset_id: 'd1',
            progress: 0.5,
            records_count: 100,
        });
        expect(result.progress).toBe(0.5);
    });
});
