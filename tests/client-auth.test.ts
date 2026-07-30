import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the CLI reader so the suite NEVER touches the developer's real
// ~/.config store — otherwise these tests would pass/fail per machine.
vi.mock('../src/utils/cli-credentials', () => ({
    readCliCredentials: vi.fn(() => null),
}));

import { bdclient } from '../src/client';
import { readCliCredentials } from '../src/utils/cli-credentials';
import { getAuthHeaders } from '../src/utils/auth';
import { USER_AGENT } from '../src/utils/constants';
import { AuthenticationError } from '../src/utils/errors';

const mockCli = vi.mocked(readCliCredentials);

const TOKEN = 'BRIGHTDATA_API_TOKEN';
const KEY = 'BRIGHTDATA_API_KEY';
let saved: Record<string, string | undefined>;

// Read the composed User-Agent the client's transport will actually send.
function uaOf(client: bdclient): string {
    return (
        client as unknown as {
            transport: { headers: Record<string, string> };
        }
    ).transport.headers['User-Agent'];
}

beforeEach(() => {
    // Isolate the env: no ambient tokens leak into resolution.
    saved = { [TOKEN]: process.env[TOKEN], [KEY]: process.env[KEY] };
    delete process.env[TOKEN];
    delete process.env[KEY];
    mockCli.mockReturnValue(null);
});

afterEach(() => {
    for (const k of [TOKEN, KEY]) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    }
    vi.clearAllMocks();
});

describe('bdclient token resolution → auth source in User-Agent', () => {
    it('param → auth=param', () => {
        const c = new bdclient({ apiKey: 'param-key-1234567890' });
        expect(uaOf(c)).toBe(`${USER_AGENT} (auth=param)`);
    });

    it('env BRIGHTDATA_API_TOKEN → auth=env', () => {
        process.env[TOKEN] = 'env-token-1234567890';
        expect(uaOf(new bdclient())).toBe(`${USER_AGENT} (auth=env)`);
    });

    it('env BRIGHTDATA_API_KEY (alias) → auth=env', () => {
        process.env[KEY] = 'env-key-1234567890';
        expect(uaOf(new bdclient())).toBe(`${USER_AGENT} (auth=env)`);
    });

    it('empty BRIGHTDATA_API_TOKEN falls through to BRIGHTDATA_API_KEY', () => {
        process.env[TOKEN] = '';
        process.env[KEY] = 'env-key-1234567890';
        expect(uaOf(new bdclient())).toBe(`${USER_AGENT} (auth=env)`);
    });

    it('CLI store → auth=cli_credentials', () => {
        mockCli.mockReturnValue('cli-key-1234567890');
        expect(uaOf(new bdclient())).toBe(
            `${USER_AGENT} (auth=cli_credentials)`,
        );
    });

    it('precedence: param beats env beats CLI', () => {
        process.env[TOKEN] = 'env-token-1234567890';
        mockCli.mockReturnValue('cli-key-1234567890');
        expect(uaOf(new bdclient({ apiKey: 'param-key-1234567890' }))).toBe(
            `${USER_AGENT} (auth=param)`,
        );
    });

    it('precedence: env beats CLI when no param', () => {
        process.env[TOKEN] = 'env-token-1234567890';
        mockCli.mockReturnValue('cli-key-1234567890');
        expect(uaOf(new bdclient())).toBe(`${USER_AGENT} (auth=env)`);
    });

    it('no credentials anywhere → AuthenticationError', () => {
        mockCli.mockReturnValue(null);
        expect(() => new bdclient()).toThrow(AuthenticationError);
    });

    it('param path never reads the CLI store', () => {
        new bdclient({ apiKey: 'param-key-1234567890' });
        expect(mockCli).not.toHaveBeenCalled();
    });
});

describe('getAuthHeaders — User-Agent format', () => {
    it('includes (auth=<source>) when a source is given', () => {
        expect(getAuthHeaders('k', 'cli_credentials')['User-Agent']).toBe(
            `${USER_AGENT} (auth=cli_credentials)`,
        );
    });

    it('omits the suffix when no source (bare User-Agent)', () => {
        expect(getAuthHeaders('k')['User-Agent']).toBe(USER_AGENT);
    });
});
