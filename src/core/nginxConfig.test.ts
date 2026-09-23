import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Typy MIME, z jakimi nginx z `deploy/ngnix/ngnix.conf` wyda zasoby aplikacji.
 *
 * Worker pdf.js to moduł ES z rozszerzeniem `.mjs`, a stockowy `mime.types` nginx zna
 * tylko `.js`. Bez własnej mapy worker szedł jako `application/octet-stream`, przeglądarka
 * odrzucała taki moduł („Failed to load module script") i każdy PDF - lista obecności,
 * strona podpisu z SMS-a - kończył się „Nie udało się wyświetlić dokumentu". Lokalnie tego
 * nie widać: serwer Vite wydaje `.mjs` poprawnie.
 */

const CONFIG = readFileSync(new URL('../../deploy/ngnix/ngnix.conf', import.meta.url), 'utf8');
const VIEWER = readFileSync(
    new URL('../modules/public-signing/components/PdfPagesViewer.tsx', import.meta.url),
    'utf8',
);

/** Mapa ze stockowego `mime.types` - dla rozszerzeń, które mają tu znaczenie. */
const STOCK_TYPES: Record<string, string> = { js: 'application/javascript', css: 'text/css', html: 'text/html' };
const STOCK_DEFAULT = 'application/octet-stream';
const JAVASCRIPT = ['application/javascript', 'text/javascript'];

interface Directive { name: string; args: string[]; block?: Directive[] }

function tokenize(text: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '#') { while (i < text.length && text[i] !== '\n') i++; continue; }
        if (c === '{' || c === '}' || c === ';') { tokens.push(c); i++; continue; }
        if (c === '"' || c === "'") {
            const end = text.indexOf(c, i + 1);
            tokens.push(text.slice(i + 1, end));
            i = end + 1;
            continue;
        }
        let j = i;
        while (j < text.length && !/[\s{};]/.test(text[j])) j++;
        tokens.push(text.slice(i, j));
        i = j;
    }
    return tokens;
}

function parse(tokens: string[], at = { i: 0 }): Directive[] {
    const directives: Directive[] = [];
    while (at.i < tokens.length && tokens[at.i] !== '}') {
        const words: string[] = [];
        while (!['{', ';', '}'].includes(tokens[at.i])) words.push(tokens[at.i++]);
        const [name, ...args] = words;
        if (tokens[at.i] === '{') {
            at.i++;
            directives.push({ name, args, block: parse(tokens, at) });
            at.i++; // '}'
        } else {
            at.i++; // ';'
            directives.push({ name, args });
        }
    }
    return directives;
}

const servers = parse(tokenize(CONFIG)).filter(d => d.name === 'server');

/** Lokalizacja, którą nginx wybierze dla adresu: `=`, potem wyrażenia regularne po kolei, potem prefiks. */
function locationFor(server: Directive, uri: string): Directive | undefined {
    const locations = (server.block ?? []).filter(d => d.name === 'location');
    const exact = locations.find(l => l.args[0] === '=' && l.args[1] === uri);
    if (exact) return exact;
    const prefixes = locations
        .filter(l => l.args.length === 1 || l.args[0] === '^~')
        .map(l => ({ location: l, prefix: l.args[l.args.length - 1] }))
        .filter(({ prefix }) => uri.startsWith(prefix))
        .sort((a, b) => b.prefix.length - a.prefix.length);
    if (prefixes[0]?.location.args[0] === '^~') return prefixes[0].location;
    const regex = locations.find(l =>
        (l.args[0] === '~' || l.args[0] === '~*') && new RegExp(l.args[1], l.args[0] === '~*' ? 'i' : '').test(uri),
    );
    return regex ?? prefixes[0]?.location;
}

/** Typ MIME z `types` lokalizacji albo serwera; bez nich - stockowy `mime.types`. */
function mimeFor(server: Directive, uri: string): string {
    const extension = uri.slice(uri.lastIndexOf('.') + 1).toLowerCase();
    const scopes = [locationFor(server, uri), server];
    for (const scope of scopes) {
        const types = scope?.block?.find(d => d.name === 'types');
        if (types) {
            const entry = types.block?.find(d => d.args.includes(extension));
            return entry?.name ?? STOCK_DEFAULT;
        }
    }
    return STOCK_TYPES[extension] ?? STOCK_DEFAULT;
}

// Nazwa, pod jaką Vite wydaje worker: `pdf.worker.min.mjs` -> `/assets/pdf.worker.min-<hash>.mjs`.
const workerFile = VIEWER.match(/'pdfjs-dist\/[^']*\/(pdf\.worker[^']*)'/)?.[1] ?? '';
const workerUri = `/assets/${workerFile.replace(/\.(m?js)$/, '-Dtn11Elq.$1')}`;

const serverName = (server: Directive) =>
    server.block?.find(d => d.name === 'server_name')?.args.join(' ') ?? '(bez nazwy)';
const cases = servers.map(server => [serverName(server), server] as const);

describe('nginx wydaje zasoby aplikacji z właściwym typem MIME', () => {
    it('sprawdza oba bloki: aplikację i podgląd roli, z prawdziwą nazwą workera', () => {
        expect(cases.map(([name]) => name)).toEqual(['localhost', '~^podglad[.-]']);
        expect(workerFile).toBe('pdf.worker.min.mjs');
    });

    it.each(cases)('worker pdf.js jest JavaScriptem (server_name %s)', (_, server) => {
        expect(JAVASCRIPT).toContain(mimeFor(server, workerUri));
    });

    it.each(cases)('własna mapa typów nie psuje .js i .css (server_name %s)', (_, server) => {
        expect(mimeFor(server, '/assets/index-c5d34e0d.js')).toBe('application/javascript');
        expect(mimeFor(server, '/assets/index-c5d34e0d.css')).toBe('text/css');
    });
});
