import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { assertSchema } from '../src/schemas/utils';
import { FilenameSchema } from '../src/schemas/shared';
import { ValidationError, FSError } from '../src/utils/errors';
import { getAbsAndEnsureDir } from '../src/utils/files';
import { BaseResult } from '../src/models/result';
import { bdclient } from '../src/client';

// fs.symlink() typically requires Developer Mode or admin rights on Windows,
// unrelated to whether the containment fix itself works there — skip the
// symlink-creating tests on win32 rather than fail on an environment
// limitation.
const isWindows = process.platform === 'win32';

describe('FilenameSchema — allows safe subfolders, rejects traversal (CWE-22)', () => {
    it('allows a single relative subfolder', () => {
        expect(assertSchema(FilenameSchema, 'output/data.json')).toBe(
            'output/data.json',
        );
    });

    it('allows deeply nested relative subfolders', () => {
        expect(assertSchema(FilenameSchema, 'a/b/c/file.txt')).toBe(
            'a/b/c/file.txt',
        );
    });

    it('drops "." segments and collapses redundant slashes', () => {
        expect(assertSchema(FilenameSchema, './output/data.json')).toBe(
            'output/data.json',
        );
        expect(assertSchema(FilenameSchema, 'output//data.json')).toBe(
            'output/data.json',
        );
    });

    it('rejects ".." traversal segments anywhere in the path', () => {
        expect(() => assertSchema(FilenameSchema, '../etc/passwd')).toThrow(
            ValidationError,
        );
        expect(() =>
            assertSchema(FilenameSchema, 'output/../../etc/passwd'),
        ).toThrow(ValidationError);
        expect(() =>
            assertSchema(
                FilenameSchema,
                '../../../../../../../../../../tmp/pwned.txt',
            ),
        ).toThrow(ValidationError);
    });

    it('rejects POSIX absolute paths', () => {
        expect(() => assertSchema(FilenameSchema, '/tmp/pwned.txt')).toThrow(
            ValidationError,
        );
        expect(() => assertSchema(FilenameSchema, '/etc/passwd')).toThrow(
            ValidationError,
        );
    });

    it('rejects Windows-style absolute paths (drive letter)', () => {
        expect(() =>
            assertSchema(FilenameSchema, 'C:\\Windows\\System32\\hosts'),
        ).toThrow(ValidationError);
        expect(() => assertSchema(FilenameSchema, 'C:/Windows/hosts')).toThrow(
            ValidationError,
        );
    });

    it('rejects UNC-style paths', () => {
        expect(() =>
            assertSchema(FilenameSchema, '\\\\server\\share\\file.txt'),
        ).toThrow(ValidationError);
    });

    it('rejects Windows-style traversal on POSIX hosts (backslash treated as a separator)', () => {
        // Backslashes are normalized to separators regardless of host OS, so a
        // Windows-shaped payload can't slip through by switching separators.
        expect(() =>
            assertSchema(
                FilenameSchema,
                '..\\..\\Windows\\System32\\drivers\\etc\\hosts',
            ),
        ).toThrow(ValidationError);
    });

    it('preserves legitimate basenames untouched', () => {
        expect(assertSchema(FilenameSchema, 'output.json')).toBe('output.json');
        expect(assertSchema(FilenameSchema, 'my-data_2026.txt')).toBe(
            'my-data_2026.txt',
        );
        expect(assertSchema(FilenameSchema, 'snapshot.csv')).toBe('snapshot.csv');
    });

    it('still strips Windows-reserved characters, per path segment', () => {
        expect(assertSchema(FilenameSchema, 'a<b>c:d"e|f?g*h.txt')).toBe(
            'a_b_c_d_e_f_g_h.txt',
        );
        expect(assertSchema(FilenameSchema, 'out<put/da?ta.json')).toBe(
            'out_put/da_ta.json',
        );
    });

    it('rejects empty input', () => {
        expect(() => assertSchema(FilenameSchema, '')).toThrow(ValidationError);
    });

    it('rejects input that normalizes to nothing', () => {
        expect(() => assertSchema(FilenameSchema, '.')).toThrow(ValidationError);
        expect(() => assertSchema(FilenameSchema, '///')).toThrow(
            ValidationError,
        );
    });
});

describe('getAbsAndEnsureDir — filesystem-level containment (CWE-22)', () => {
    let baseDir: string;

    beforeEach(async () => {
        // realpath: on macOS, os.tmpdir() returns /var/folders/... but
        // path.resolve sees through the /private/var symlink, so canonicalize
        // here so equality checks against resolved paths work cross-platform.
        baseDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-getabs-test-')),
        );
    });

    afterEach(async () => {
        await fs.rm(baseDir, { recursive: true, force: true });
    });

    it('creates nested subfolders and resolves within baseDir', async () => {
        const target = await getAbsAndEnsureDir('a/b/c/file.txt', baseDir);
        expect(target).toBe(path.join(baseDir, 'a', 'b', 'c', 'file.txt'));
        await expect(fs.stat(path.join(baseDir, 'a', 'b', 'c'))).resolves.toBeDefined();
    });

    it('defaults baseDir to process.cwd() when omitted', async () => {
        const originalCwd = process.cwd();
        process.chdir(baseDir);
        try {
            const target = await getAbsAndEnsureDir('nested/file.txt');
            expect(target).toBe(path.join(baseDir, 'nested', 'file.txt'));
        } finally {
            process.chdir(originalCwd);
        }
    });

    // FilenameSchema normally blocks this before getAbsAndEnsureDir ever sees
    // it — but BaseResult.save() (see below) accepts a raw path that never
    // passes through the schema, so this function must refuse *relative*
    // traversal too.
    it('throws FSError when a raw relative path escapes baseDir via ".."', async () => {
        await expect(
            getAbsAndEnsureDir('../../../etc/passwd', baseDir),
        ).rejects.toThrow(FSError);
    });

    it('honors an explicit absolute path outside baseDir (deliberate caller choice)', async () => {
        // Unlike a relative path, an absolute input is a deliberate decision by
        // the calling code (same trust model as fs.writeFile) — BaseResult.save()
        // has always supported writing to an arbitrary absolute destination.
        const outsideDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-explicit-abs-')),
        );
        try {
            const explicitTarget = path.join(outsideDir, 'file.txt');
            const target = await getAbsAndEnsureDir(explicitTarget, baseDir);
            expect(target).toBe(explicitTarget);
        } finally {
            await fs.rm(outsideDir, { recursive: true, force: true });
        }
    });

    it.skipIf(isWindows)('throws FSError when a subfolder is a symlink escaping baseDir', async () => {
        const outsideDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-outside-')),
        );
        try {
            const linkPath = path.join(baseDir, 'escape-link');
            await fs.symlink(outsideDir, linkPath, 'dir');

            await expect(
                getAbsAndEnsureDir('escape-link/pwned.txt', baseDir),
            ).rejects.toThrow(FSError);

            // Nothing should have been created outside baseDir.
            await expect(
                fs.stat(path.join(outsideDir, 'pwned.txt')),
            ).rejects.toThrow();
        } finally {
            await fs.rm(outsideDir, { recursive: true, force: true });
        }
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

    it('rejects a ../../../tmp/<file> traversal payload before any write', async () => {
        const sentinel = `brd-pwn-test-${Date.now()}.txt`;
        const malicious = `../../../../../../../../../../tmp/${sentinel}`;
        const escapeTarget = path.join('/tmp', sentinel);

        await fs.unlink(escapeTarget).catch(() => {});

        await expect(
            client.saveResults('payload', { filename: malicious, format: 'txt' }),
        ).rejects.toThrow(ValidationError);

        await expect(fs.stat(escapeTarget)).rejects.toThrow();
    });

    it('rejects an absolute /tmp path before any write', async () => {
        const sentinel = `absolute-pwn-${Date.now()}.txt`;
        const malicious = `/tmp/${sentinel}`;

        await fs.unlink(malicious).catch(() => {});

        await expect(
            client.saveResults('payload', { filename: malicious, format: 'txt' }),
        ).rejects.toThrow(ValidationError);

        await expect(fs.stat(malicious)).rejects.toThrow();
    });

    it.skipIf(isWindows)('rejects a symlink subfolder that escapes the working directory', async () => {
        const outsideDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-outside-')),
        );
        try {
            await fs.symlink(outsideDir, path.join(tmpDir, 'escape-link'), 'dir');

            // "escape-link/pwned.txt" has no ".." or absolute segment, so it
            // passes FilenameSchema — the symlink-escape defense in
            // getAbsAndEnsureDir is what must catch this.
            await expect(
                client.saveResults('payload', {
                    filename: 'escape-link/pwned.txt',
                    format: 'txt',
                }),
            ).rejects.toThrow(FSError);

            await expect(
                fs.stat(path.join(outsideDir, 'pwned.txt')),
            ).rejects.toThrow();
        } finally {
            await fs.rm(outsideDir, { recursive: true, force: true });
        }
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

    it('creates and writes into a legitimate nested subfolder', async () => {
        const saved = await client.saveResults('nested-hello', {
            filename: 'reports/2026/summary.txt',
            format: 'txt',
        });

        expect(saved).toBe(
            path.join(tmpDir, 'reports', '2026', 'summary.txt'),
        );
        expect(await fs.readFile(saved, 'utf8')).toBe('nested-hello');
    });
});

describe('BaseResult.save() — raw filepath never passes through FilenameSchema', () => {
    let originalCwd: string;
    let tmpDir: string;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tmpDir = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'brd-sdk-result-test-')),
        );
        process.chdir(tmpDir);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('still refuses a raw ".." traversal payload (getAbsAndEnsureDir enforces it directly)', async () => {
        const result = new BaseResult({ success: true, data: { ok: true } });
        const sentinel = `brd-result-pwn-${Date.now()}.json`;

        await expect(
            result.save(`../../../../../../../../../../tmp/${sentinel}`),
        ).rejects.toThrow(FSError);

        await expect(fs.stat(path.join('/tmp', sentinel))).rejects.toThrow();
    });

    it('writes a legitimate nested path', async () => {
        const result = new BaseResult({ success: true, data: { ok: true } });
        const saved = await result.save('out/nested-result.json');

        expect(saved).toBe(path.join(tmpDir, 'out', 'nested-result.json'));
    });
});

