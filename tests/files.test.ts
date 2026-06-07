import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { assertSchema } from '../src/schemas/utils';
import { FilenameSchema } from '../src/schemas/shared';
import { ValidationError } from '../src/utils/errors';
import { bdclient } from '../src/client';

describe('FilenameSchema — path traversal protection (CWE-22)', () => {
    it('strips parent-directory traversal sequences', () => {
        expect(assertSchema(FilenameSchema, '../../../etc/passwd')).toBe('passwd');
        expect(assertSchema(FilenameSchema, '../etc/passwd')).toBe('passwd');
        expect(
            assertSchema(
                FilenameSchema,
                '../../../../../../../../../../tmp/pwned.txt',
            ),
        ).toBe('pwned.txt');
    });

    it('reduces POSIX absolute paths to the basename', () => {
        expect(assertSchema(FilenameSchema, '/tmp/pwned.txt')).toBe('pwned.txt');
        expect(assertSchema(FilenameSchema, '/etc/passwd')).toBe('passwd');
        expect(assertSchema(FilenameSchema, '/a/b/c/d/e/f.json')).toBe('f.json');
    });

    it('reduces nested relative paths to the basename', () => {
        expect(assertSchema(FilenameSchema, 'output/data.json')).toBe('data.json');
        expect(assertSchema(FilenameSchema, 'a/b/c/file.txt')).toBe('file.txt');
    });

    it('strips Windows-style separators on POSIX hosts (regex fallback)', () => {
        // path.basename on POSIX does not split on '\\', so the regex must.
        const result = assertSchema(
            FilenameSchema,
            '..\\..\\Windows\\System32\\drivers\\etc\\hosts',
        );
        expect(result).not.toContain('\\');
        expect(result).not.toContain('/');
    });

    it('preserves legitimate basenames untouched', () => {
        expect(assertSchema(FilenameSchema, 'output.json')).toBe('output.json');
        expect(assertSchema(FilenameSchema, 'my-data_2026.txt')).toBe(
            'my-data_2026.txt',
        );
        expect(assertSchema(FilenameSchema, 'snapshot.csv')).toBe('snapshot.csv');
    });

    it('still strips Windows-reserved characters', () => {
        expect(assertSchema(FilenameSchema, 'a<b>c:d"e|f?g*h.txt')).toBe(
            'a_b_c_d_e_f_g_h.txt',
        );
    });

    it('rejects empty input', () => {
        expect(() => assertSchema(FilenameSchema, '')).toThrow(ValidationError);
    });
});

describe('saveResults — path traversal protection', () => {
    let client: bdclient;
    let originalCwd: string;
    let tmpDir: string;

    beforeEach(async () => {
        originalCwd = process.cwd();
        // realpath: on macOS, os.tmpdir() returns /var/folders/... but
        // path.resolve sees through the /private/var symlink, so canonicalize
        // here so equality checks against resolved paths work cross-platform.
        tmpDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-test-')),
        );
        process.chdir(tmpDir);
        client = new bdclient({ apiKey: 'test-key-1234567890' });
    });

    afterEach(async () => {
        await client.close();
        process.chdir(originalCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('keeps a ../../../tmp/<file> payload inside the working directory', async () => {
        const sentinel = `brd-pwn-test-${Date.now()}.txt`;
        const malicious = `../../../../../../../../../../tmp/${sentinel}`;
        const escapeTarget = path.join('/tmp', sentinel);

        // Ensure no pre-existing sentinel from a previous run.
        await fs.unlink(escapeTarget).catch(() => {});

        const saved = await client.saveResults('payload', {
            filename: malicious,
            format: 'txt',
        });

        // The escape target must not have been created.
        await expect(fs.stat(escapeTarget)).rejects.toThrow();

        // The actual write landed inside our isolated tmpDir.
        expect(saved.startsWith(tmpDir + path.sep)).toBe(true);
        expect(path.basename(saved)).toBe(sentinel);

        const content = await fs.readFile(saved, 'utf8');
        expect(content).toBe('payload');
    });

    it('reduces absolute /tmp paths to a basename in the working directory', async () => {
        const sentinel = `absolute-pwn-${Date.now()}.txt`;
        const malicious = `/tmp/${sentinel}`;
        const escapeTarget = `/tmp/${sentinel}`;

        await fs.unlink(escapeTarget).catch(() => {});

        const saved = await client.saveResults('payload', {
            filename: malicious,
            format: 'txt',
        });

        await expect(fs.stat(escapeTarget)).rejects.toThrow();
        expect(saved.startsWith(tmpDir + path.sep)).toBe(true);
        expect(path.basename(saved)).toBe(sentinel);
    });

    it('writes legitimate basenames at the expected location', async () => {
        const name = `output-${Date.now()}.txt`;
        const saved = await client.saveResults('hello', {
            filename: name,
            format: 'txt',
        });

        expect(saved).toBe(path.join(tmpDir, name));
        expect(await fs.readFile(saved, 'utf8')).toBe('hello');
    });
});
