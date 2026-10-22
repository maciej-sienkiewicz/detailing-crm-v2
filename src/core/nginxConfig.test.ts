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

/**
 * Service Worker ma stałą nazwę pliku, bez hasha - więc każda warstwa cache, która go
 * zatrzyma, przypina telefony do starej wersji. Tak już było: /sw.js poszedł kiedyś pod
 * regułę „*.js na rok, immutable" i poprawiony handler powiadomień nie docierał do nikogo,
 * dopóki worker nie dostał nowej nazwy. Ten test pilnuje, żeby żaden nowy blok location
 * nie przejął workera przed regułą no-store, a CDN przed serwerem też dostał zakaz.
 */
describe('nginx nigdy nie pozwala zatrzymać Service Workera w cache', () => {
    const [app, preview] = servers;
    const headers = (location: Directive | undefined) =>
        Object.fromEntries(
            (location?.block ?? [])
                .filter(d => d.name === 'add_header')
                .map(d => [d.args[0].toLowerCase(), d.args[1]]),
        );

    it.each(['/service-worker.js', '/sw.js', '/logo-sw.js', '/call.html'])(
        '%s: no-store w przeglądarce i na CDN, bez expires',
        uri => {
            const location = locationFor(app, uri);
            const h = headers(location);
            expect(h['cache-control']).toContain('no-store');
            expect(h['cdn-cache-control']).toBe('no-store');
            expect(h['cloudflare-cdn-cache-control']).toBe('no-store');
            expect(location?.block?.some(d => d.name === 'expires')).toBe(false);
        },
    );

    it('podgląd roli nie wydaje workera wcale', () => {
        const location = locationFor(preview, '/service-worker.js');
        expect(location?.block?.find(d => d.name === 'return')?.args).toEqual(['404']);
    });
});

/**
 * Log dostępu bez danych osobowych (audyt HTTP, P2-20). Domyślny format `main` zapisuje
 * "$request" z query stringiem, a w nim frazy wyszukiwania (imiona, telefony, e-maile), NIP-y
 * i tokeny z linków. Każdy blok serwera pisze więc formatem bez query stringa - także
 * w nagłówku Referer, który niesie adres strony razem z jej parametrami.
 */
describe('nginx nie zapisuje query stringa w logu dostępu', () => {
    const top = parse(tokenize(CONFIG));
    const format = top.find(d => d.name === 'log_format' && d.args[0] === 'no_query');
    const line = format?.args.slice(1).join('') ?? '';

    it('format no_query ma ścieżkę bez parametrów', () => {
        expect(line).toContain('$request_method $uri $server_protocol');
        for (const variable of ['$request ', '$request"', '$request_uri', '$args', '$query_string', '$http_referer']) {
            expect(line).not.toContain(variable);
        }
    });

    it('Referer trafia do logu bez query stringa i fragmentu', () => {
        const map = top.find(d => d.name === 'map' && d.args[0] === '$http_referer' && d.args[1] === '$referer_path');
        const rule = map?.block?.find(d => d.name.startsWith('~'));
        const base = new RegExp(rule?.name.slice(1).replace('(?<referer_base>', '(?<base>') ?? '$^');
        expect(line).toContain('"$referer_path"');
        expect('https://app.detailboost.pl/customers?search=jan%40klient.pl#x'.match(base)?.groups?.base)
            .toBe('https://app.detailboost.pl/customers');
    });

    it.each(cases)('blok %s pisze log formatem no_query', (_, server) => {
        const logs = (server.block ?? []).filter(d => d.name === 'access_log');
        expect(logs.map(d => d.args)).toEqual([['/var/log/nginx/access.log', 'no_query']]);
        const nested = (server.block ?? []).flatMap(d => d.block ?? []).filter(d => d.name === 'access_log');
        expect(nested.every(d => d.args[0] === 'off' || d.args[1] === 'no_query')).toBe(true);
    });
});

/**
 * Porządki w serwerze (audyt HTTP, P2-22): bez wersji nginx w odpowiedziach obu bloków,
 * z kompresją JSON-a i zasobów, a `Connection: upgrade` tylko dla WebSocketu - zwykłe /api
 * nie prosi backendu o zmianę protokołu przy każdym zapytaniu.
 */
describe('nginx: wersja, kompresja i Connection', () => {
    const top = parse(tokenize(CONFIG));
    const directive = (name: string) => top.find(d => d.name === name)?.args;
    const header = (location: Directive | undefined, name: string) =>
        location?.block?.find(d => d.name === 'proxy_set_header' && d.args[0].toLowerCase() === name)?.args[1];

    it('server_tokens off obejmuje oba bloki serwera, a żaden go nie włącza', () => {
        expect(directive('server_tokens')).toEqual(['off']);
        for (const server of servers) {
            expect(server.block?.find(d => d.name === 'server_tokens')?.args ?? ['off']).toEqual(['off']);
        }
    });

    it('kompresuje JSON (także problem+json), skrypty i style', () => {
        expect(directive('gzip')).toEqual(['on']);
        expect(directive('gzip_types')).toEqual(expect.arrayContaining([
            'application/json', 'application/problem+json', 'application/javascript', 'text/css',
        ]));
    });

    it.each(cases)('blok %s: /api bez Upgrade, /ws-registry z upgrade z mapy', (_, server) => {
        const api = locationFor(server, '/api/v1/visits');
        expect(header(api, 'connection')).toBe('');
        expect(header(api, 'upgrade')).toBeUndefined();
        const ws = locationFor(server, '/ws-registry/info');
        expect(header(ws, 'upgrade')).toBe('$http_upgrade');
        expect(header(ws, 'connection')).toBe('$connection_upgrade');
    });
});

describe('obraz nie wydaje metadanych wdrożenia', () => {
    const DOCKERFILE = readFileSync(new URL('../../deploy/Dockerfile', import.meta.url), 'utf8');

    it('build-info.txt leży poza katalogiem, który wydaje nginx', () => {
        expect(DOCKERFILE).not.toMatch(/\/app\/dist\/build-info\.txt/);
        expect(DOCKERFILE).toContain('COPY --from=build-stage /app/build-info.txt /etc/nginx/build-info.txt');
    });

    // Jenkins sprawdza obraz przed wypchnięciem do rejestru. Gdy czytał build-info.txt ze starego
    // miejsca, build kończył się błędem; bez `nginx -t` zepsuty ngnix.conf wyszedłby dopiero na serwerze.
    it.each(['Jenkinsfile', 'deploy/build-and-push.sh'])('%s czyta build-info.txt z /etc/nginx', path => {
        const script = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
        expect(script).toContain('cat /etc/nginx/build-info.txt');
        expect(script).not.toContain('/usr/share/nginx/html/build-info.txt');
    });

    it('Jenkins sprawdza konfigurację nginx w obrazie, zanim go wypchnie', () => {
        const pipeline = readFileSync(new URL('../../Jenkinsfile', import.meta.url), 'utf8');
        const verify = pipeline.indexOf('nginx -t');
        expect(verify).toBeGreaterThan(-1);
        expect(verify).toBeLessThan(pipeline.indexOf('docker push'));
    });
});
