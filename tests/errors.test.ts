import { describe, it, expect } from 'vitest';
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

describe('BRDError', () => {
    it('toJSON() returns name and message', () => {
        const err = new BRDError('test message');
        expect(err.toJSON()).toEqual({ name: 'BRDError', message: 'test message' });
    });

    it('name property is BRDError', () => {
        expect(new BRDError('x').name).toBe('BRDError');
    });
});

describe('APIError', () => {
    it('toJSON() includes statusCode and responseText', () => {
        const err = new APIError('msg', 500, 'body');
        expect(err.toJSON()).toEqual({
            name: 'APIError',
            message: 'msg [HTTP500] body',
            statusCode: 500,
            responseText: 'body',
        });
    });

    it('toJSON() with null statusCode and responseText', () => {
        const err = new APIError('msg');
        expect(err.toJSON()).toEqual({
            name: 'APIError',
            message: 'msg',
            statusCode: null,
            responseText: null,
        });
    });

    it('JSON.stringify produces valid JSON', () => {
        const err = new APIError('fail', 500, 'error body');
        const parsed = JSON.parse(JSON.stringify(err));
        expect(parsed.name).toBe('APIError');
        expect(parsed.statusCode).toBe(500);
        expect(parsed.responseText).toBe('error body');
    });
});

describe('instanceof chains', () => {
    const subtypes: Array<{ Cls: new (...args: string[]) => BRDError; name: string; args: string[] }> = [
        { Cls: ValidationError, name: 'ValidationError', args: ['bad'] },
        { Cls: AuthenticationError, name: 'AuthenticationError', args: ['auth'] },
        { Cls: ZoneError, name: 'ZoneError', args: ['zone'] },
        { Cls: NetworkError, name: 'NetworkError', args: ['net'] },
        { Cls: NetworkTimeoutError, name: 'NetworkTimeoutError', args: ['timeout'] },
        { Cls: TimeoutError, name: 'TimeoutError', args: [] },
        { Cls: FSError, name: 'FSError', args: ['fs'] },
        { Cls: DataNotReadyError, name: 'DataNotReadyError', args: [] },
    ];

    for (const { Cls, name, args } of subtypes) {
        it(`${name} instanceof BRDError`, () => {
            const err = new Cls(...args);
            expect(err).toBeInstanceOf(BRDError);
        });
    }

    it('APIError instanceof BRDError', () => {
        expect(new APIError('x')).toBeInstanceOf(BRDError);
    });

    it('NetworkTimeoutError instanceof NetworkError', () => {
        expect(new NetworkTimeoutError('t')).toBeInstanceOf(NetworkError);
    });
});

describe('batch serialization', () => {
    it('JSON.stringify with mixed data and APIError', () => {
        const batch = [{ data: 'ok' }, new APIError('fail', 500, 'err')];
        const parsed = JSON.parse(JSON.stringify(batch));
        expect(parsed[0]).toEqual({ data: 'ok' });
        expect(parsed[1].name).toBe('APIError');
        expect(parsed[1].statusCode).toBe(500);
    });

    it('native Error serializes to empty object (contrast)', () => {
        expect(JSON.stringify(new Error('oops'))).toBe('{}');
    });

    it('batch with native Error loses data (contrast)', () => {
        const batch = [{ data: 'ok' }, new Error('oops')];
        expect(JSON.stringify(batch)).toBe('[{"data":"ok"},{}]');
    });
});
