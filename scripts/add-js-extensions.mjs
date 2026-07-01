/**
 * One-time codemod: add explicit `.js` extensions to relative import/export
 * specifiers across src/, so the emitted .d.ts resolve under node16/nodenext.
 *
 * AST-based (TypeScript compiler API) — covers ImportDeclaration,
 * ExportDeclaration (incl. `export *` / `export type *`), inline `import('...')`
 * type-nodes, and dynamic `import()` calls. Resolves each relative specifier to
 * file (`./x` -> `./x.js`) or barrel directory (`./x` -> `./x/index.js`).
 *
 * Usage:  node scripts/add-js-extensions.mjs [--dry]
 * Not a runtime/published dependency — delete after the fix lands if desired.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../src');

const RELATIVE = /^\.\.?\//;
const HAS_EXT = /\.(js|mjs|cjs|json|node)$/;

function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(p));
        else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'))
            out.push(p);
    }
    return out;
}

/** new specifier, or null to leave as-is */
function resolveSpecifier(fileDir, spec) {
    if (!RELATIVE.test(spec)) return null; // bare package / node:
    if (HAS_EXT.test(spec)) return null; // already extensioned
    const base = spec.replace(/\/$/, '');
    if (
        fs.existsSync(path.join(fileDir, base + '.ts')) ||
        fs.existsSync(path.join(fileDir, base + '.tsx'))
    )
        return base + '.js';
    if (fs.existsSync(path.join(fileDir, base, 'index.ts')))
        return base + '/index.js';
    return null; // unresolved — report
}

const files = walk(ROOT);
let filesChanged = 0;
let specsChanged = 0;
const unresolved = [];

for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        ts.ScriptKind.TS,
    );
    const fileDir = path.dirname(file);
    const edits = [];

    const consider = (lit) => {
        if (!lit || !ts.isStringLiteral(lit)) return;
        const spec = lit.text;
        const next = resolveSpecifier(fileDir, spec);
        if (next === null) {
            if (RELATIVE.test(spec) && !HAS_EXT.test(spec))
                unresolved.push(`${path.relative(ROOT, file)}: ${spec}`);
            return;
        }
        const start = lit.getStart(sf);
        const quote = text[start];
        edits.push({ start, end: lit.getEnd(), newText: quote + next + quote });
    };

    const visit = (node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            consider(node.moduleSpecifier);
        } else if (ts.isImportTypeNode(node)) {
            const arg = node.argument;
            if (arg && ts.isLiteralTypeNode(arg)) consider(arg.literal);
        } else if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
            consider(node.arguments[0]);
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    if (edits.length) {
        specsChanged += edits.length;
        filesChanged++;
        if (!DRY) {
            edits.sort((a, b) => b.start - a.start);
            let out = text;
            for (const e of edits)
                out = out.slice(0, e.start) + e.newText + out.slice(e.end);
            fs.writeFileSync(file, out);
        }
    }
}

console.log(
    `${DRY ? '[dry-run] ' : ''}files changed: ${filesChanged}, specifiers changed: ${specsChanged}`,
);
if (unresolved.length) {
    console.log(`UNRESOLVED (${unresolved.length}) — left as-is, review:`);
    for (const u of unresolved) console.log('  ' + u);
} else {
    console.log('no unresolved relative specifiers');
}
