import type { Dispatcher } from 'undici';
import { describe, it, expect } from 'vitest';
import { throwInvalidStatus, assertResponse } from '../src/core/transport';
import {
    ValidationError,
    AuthenticationError,
    NetworkError,
    APIError,
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

describe('assertResponse — body read failures', () => {
    it('success path: body.text() throws → NetworkError', async () => {
        const response = {
            statusCode: 200,
            headers: {},
            body: {
                text: () => Promise.reject(new Error('stream destroyed')),
            },
        } as unknown as Dispatcher.ResponseData;

        await expect(assertResponse(response)).rejects.toThrow(NetworkError);
        await expect(assertResponse(response)).rejects.toThrow(
            /Failed to read response body/,
        );
    });

    it('error path: body.text() throws → still throws status error with fallback text', async () => {
        const response = {
            statusCode: 500,
            headers: {},
            body: {
                text: () => Promise.reject(new Error('stream destroyed')),
            },
        } as unknown as Dispatcher.ResponseData;

        await expect(assertResponse(response)).rejects.toThrow(APIError);
    });
});
