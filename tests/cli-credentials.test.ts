import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the filesystem + home dir so tests never touch the real machine.
vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));
vi.mock('node:os', () => ({ homedir: vi.fn(() => '/home/tester') }));

import { readFileSync } from 'node:fs';
import { readCliCredentials } from '../src/utils/cli-credentials';

const mockRead = vi.mocked(readFileSync);
const origPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
let savedAppData: string | undefined;

function setPlatform(p: NodeJS.Platform) {
    Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

beforeEach(() => {
    vi.clearAllMocks();
    savedAppData = process.env.APPDATA;
});

afterEach(() => {
    Object.defineProperty(process, 'platform', origPlatform);
    if (savedAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = savedAppData;
});

describe('readCliCredentials — per-platform path (matches the CLI writer)', () => {
    it('linux → ~/.config/brightdata-cli/credentials.json', () => {
        setPlatform('linux');
        mockRead.mockReturnValue('{"api_key":"linux-key-1234567890"}');
        expect(readCliCredentials()).toBe('linux-key-1234567890');
        expect(mockRead).toHaveBeenCalledWith(
            '/home/tester/.config/brightdata-cli/credentials.json',
            'utf8',
        );
    });

    it('darwin → ~/Library/Application Support/brightdata-cli/credentials.json', () => {
        setPlatform('darwin');
        mockRead.mockReturnValue('{"api_key":"mac-key-1234567890"}');
        expect(readCliCredentials()).toBe('mac-key-1234567890');
        expect(mockRead).toHaveBeenCalledWith(
            '/home/tester/Library/Application Support/brightdata-cli/credentials.json',
            'utf8',
        );
    });

    it('win32 → homedir()/AppData/Roaming/… and NOT %APPDATA% (CLI parity)', () => {
        setPlatform('win32');
        // A redirected %APPDATA% must be ignored — the CLI uses homedir().
        process.env.APPDATA = '/somewhere/redirected';
        mockRead.mockReturnValue('{"api_key":"win-key-1234567890"}');
        expect(readCliCredentials()).toBe('win-key-1234567890');
        // path.join uses the host separator; on POSIX runners this is '/'.
        expect(mockRead).toHaveBeenCalledWith(
            '/home/tester/AppData/Roaming/brightdata-cli/credentials.json',
            'utf8',
        );
        expect(String(mockRead.mock.calls[0][0])).not.toContain('redirected');
    });
});

describe('readCliCredentials — only reads credentials.json, never config.json', () => {
    it('every read targets credentials.json', () => {
        setPlatform('linux');
        mockRead.mockReturnValue('{"api_key":"k-1234567890"}');
        readCliCredentials();
        for (const call of mockRead.mock.calls) {
            expect(String(call[0])).toMatch(/credentials\.json$/);
            expect(String(call[0])).not.toContain('config.json');
        }
    });
});

describe('readCliCredentials — value/null outcomes (never throws)', () => {
    beforeEach(() => setPlatform('linux'));

    it('trims a valid key', () => {
        mockRead.mockReturnValue('{"api_key":"  key-1234567890  "}');
        expect(readCliCredentials()).toBe('key-1234567890');
    });

    it('missing file (readFileSync throws) → null', () => {
        mockRead.mockImplementation(() => {
            throw new Error('ENOENT');
        });
        expect(readCliCredentials()).toBeNull();
    });

    it('malformed JSON → null', () => {
        mockRead.mockReturnValue('{not json');
        expect(readCliCredentials()).toBeNull();
    });

    it('missing api_key → null', () => {
        mockRead.mockReturnValue('{"other":"x"}');
        expect(readCliCredentials()).toBeNull();
    });

    it('empty/whitespace api_key → null', () => {
        mockRead.mockReturnValue('{"api_key":"   "}');
        expect(readCliCredentials()).toBeNull();
    });

    it('non-string api_key → null', () => {
        mockRead.mockReturnValue('{"api_key":12345}');
        expect(readCliCredentials()).toBeNull();
    });
});
