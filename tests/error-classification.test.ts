import type { Dispatcher } from 'undici';
import { describe, it, expect } from 'vitest';
import { throwInvalidStatus, assertResponse } from '../src/core/transport';
import { wrapAPIError } from '../src/utils/error-utils';
import {
    BRDError,
    ValidationError,
    AuthenticationError,
    ZoneError,
    NetworkError,
    NetworkTimeoutError,
    TimeoutError,
    FSError,
    APIError,
    DataNotReadyError,
} from '../src/utils/errors';

describe('throwInvalidStatus', () => {
    it('401 → AuthenticationError', () => {
        expect(() => throwInvalidStatus(401, 'unauthorized')).toThrow(
            AuthenticationError,
        );
    });

    it('403 → AuthenticationError', () => {
        expect(() => throwInvalidStatus(403, 'forbidden')).toThrow(
            AuthenticationError,
        );
    });

    it('400 → ValidationError', () => {
        expect(() => throwInvalidStatus(400, 'bad request')).toThrow(
            ValidationError,
        );
    });

    it('400 includes response text', () => {
        expect(() => throwInvalidStatus(400, 'missing field')).toThrow(
            /missing field/,
        );
    });

    it('500 → APIError with statusCode and responseText', () => {
        try {
            throwInvalidStatus(500, 'internal error');
        } catch (e) {
            expect(e).toBeInstanceOf(APIError);
            const err = e as APIError;
            expect(err.statusCode).toBe(500);
            expect(err.responseText).toBe('internal error');
        }
    });

    it('429 → APIError (not special-cased)', () => {
        try {
            throwInvalidStatus(429, 'rate limited');
        } catch (e) {
            expect(e).toBeInstanceOf(APIError);
            expect(e).not.toBeInstanceOf(AuthenticationError);
            expect(e).not.toBeInstanceOf(ValidationError);
        }
    });

    it('404 → APIError (not special-cased)', () => {
        try {
            throwInvalidStatus(404, 'not found');
        } catch (e) {
            expect(e).toBeInstanceOf(APIError);
            expect(e).not.toBeInstanceOf(AuthenticationError);
        }
    });
});

function mockResponse(statusCode: number, body: string) {
    return {
        statusCode,
        headers: {},
        body: { text: () => Promise.resolve(body) },
    } as unknown as Dispatcher.ResponseData;
}

describe('assertResponse', () => {
    it('status 200 with parse=true returns body text', async () => {
        const result = await assertResponse(mockResponse(200, 'hello'));
        expect(result).toBe('hello');
    });

    it('status 200 with parse=false returns body stream', async () => {
        const resp = mockResponse(200, 'hello');
        const result = await assertResponse(resp, false);
        expect(result).toBe(resp.body);
    });

    it('status 500 throws APIError', async () => {
        await expect(assertResponse(mockResponse(500, 'Internal Server Error'))).rejects.toThrow(APIError);
    });

    it('status 401 throws AuthenticationError', async () => {
        await expect(assertResponse(mockResponse(401, 'Unauthorized'))).rejects.toThrow(AuthenticationError);
    });
});

describe('wrapAPIError', () => {
    describe('rethrows BRDError subtypes unchanged', () => {
        const subtypes = [
            { name: 'AuthenticationError', make: () => new AuthenticationError('auth') },
            { name: 'ValidationError', make: () => new ValidationError('bad') },
            { name: 'ZoneError', make: () => new ZoneError('zone') },
            { name: 'NetworkError', make: () => new NetworkError('net') },
            { name: 'NetworkTimeoutError', make: () => new NetworkTimeoutError('timeout') },
            { name: 'TimeoutError', make: () => new TimeoutError() },
            { name: 'FSError', make: () => new FSError('fs') },
            { name: 'APIError', make: () => new APIError('api') },
            { name: 'DataNotReadyError', make: () => new DataNotReadyError() },
            { name: 'BRDError', make: () => new BRDError('base') },
        ];

        for (const { name, make } of subtypes) {
            it(`rethrows ${name}`, () => {
                const original = make();
                try {
                    wrapAPIError(original, 'test');
                } catch (e) {
                    expect(e).toBe(original);
                }
            });
        }
    });

    describe('wraps non-BRDError as APIError with context', () => {
        it('wraps TypeError', () => {
            expect(() => wrapAPIError(new TypeError('boom'), 'snapshot.fetch')).toThrow(
                APIError,
            );
            try {
                wrapAPIError(new TypeError('boom'), 'snapshot.fetch');
            } catch (e) {
                expect((e as APIError).message).toContain('snapshot.fetch');
                expect((e as APIError).message).toContain('boom');
            }
        });

        it('wraps RangeError', () => {
            expect(() => wrapAPIError(new RangeError('out'), 'test')).toThrow(APIError);
        });

        it('wraps generic Error', () => {
            expect(() => wrapAPIError(new Error('fail'), 'test')).toThrow(APIError);
        });

        it('includes location in message', () => {
            try {
                wrapAPIError(new Error('oops'), 'listZones');
            } catch (e) {
                expect((e as APIError).message).toBe('listZones: oops');
            }
        });

        it('includes location and operation in message', () => {
            try {
                wrapAPIError(new Error('unexpected token'), 'snapshot.fetch', 'parsing response');
            } catch (e) {
                expect((e as APIError).message).toBe('snapshot.fetch: parsing response: unexpected token');
            }
        });
    });
});
