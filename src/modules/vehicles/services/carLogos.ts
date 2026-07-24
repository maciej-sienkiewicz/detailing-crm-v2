/**
 * Car logo service – maps vehicle brand names to logo URLs served via jsDelivr CDN.
 *
 * jsDelivr mirrors the GitHub repository with Cache-Control: max-age=31536000 (1 year)
 * on all edge nodes globally, so the first fetch per brand is the only network round-trip.
 * Subsequent requests are served by the browser HTTP cache (layer 1) and by the
 * dedicated logo Service Worker (layer 2) when HTTP cache is cleared.
 *
 * Logo source: https://github.com/filippofilip95/car-logos-dataset
 */

const CDN_BASE =
    'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb';

// Static mapping covers brands most commonly found in the Polish car market.
// Each key is the normalised brand string (lowercase, trimmed).
const BRAND_SLUG_MAP: Record<string, string> = {
    // A
    'alfa romeo':        'alfa-romeo',
    'aston martin':      'aston-martin',
    'audi':              'audi',
    // B
    'bentley':           'bentley',
    'bmw':               'bmw',
    'bugatti':           'bugatti',
    'buick':             'buick',
    // C
    'cadillac':          'cadillac',
    'chevrolet':         'chevrolet',
    'chrysler':          'chrysler',
    'citroën':           'citroen',
    'citroen':           'citroen',
    // D
    'dacia':             'dacia',
    'daewoo':            'daewoo',
    'daihatsu':          'daihatsu',
    'dodge':             'dodge',
    // F
    'ferrari':           'ferrari',
    'fiat':              'fiat',
    'ford':              'ford',
    // G
    'genesis':           'genesis',
    'gmc':               'gmc',
    // H
    'honda':             'honda',
    'hummer':            'hummer',
    'hyundai':           'hyundai',
    // I
    'infiniti':          'infiniti',
    'isuzu':             'isuzu',
    // J
    'jaguar':            'jaguar',
    'jeep':              'jeep',
    // K
    'kia':               'kia',
    // L
    'lamborghini':       'lamborghini',
    'lancia':            'lancia',
    'land rover':        'land-rover',
    'lexus':             'lexus',
    'lincoln':           'lincoln',
    // M
    'maserati':          'maserati',
    'maybach':           'maybach',
    'mazda':             'mazda',
    'mclaren':           'mclaren',
    'mercedes':          'mercedes-benz',
    'mercedes-benz':     'mercedes-benz',
    'mercedes benz':     'mercedes-benz',
    'mg':                'mg',
    'mini':              'mini',
    'mitsubishi':        'mitsubishi',
    // N
    'nissan':            'nissan',
    // O
    'opel':              'opel',
    // P
    'peugeot':           'peugeot',
    'pontiac':           'pontiac',
    'porsche':           'porsche',
    // R
    'ram':               'ram',
    'range rover':       'range-rover',
    'renault':           'renault',
    'rolls-royce':       'rolls-royce',
    'rolls royce':       'rolls-royce',
    // S
    'saab':              'saab',
    'saturn':            'saturn',
    'seat':              'seat',
    'skoda':             'skoda',
    'škoda':             'skoda',
    'smart':             'smart',
    'ssangyong':         'ssangyong',
    'subaru':            'subaru',
    'suzuki':            'suzuki',
    // T
    'tesla':             'tesla',
    'toyota':            'toyota',
    // V
    'volkswagen':        'volkswagen',
    'volvo':             'volvo',
    // W
    'wiesmann':          'wiesmann',
    // Other
    'acura':             'acura',
    'abarth':            'abarth',
    'alpine':            'alpine',
    'ariel':             'ariel',
    'byd':               'byd',
    'ds':                'ds',
    'fisker':            'fisker',
    'gac':               'gac',
    'geely':             'geely',
    'great wall':        'great-wall',
    'haval':             'haval',
    'lada':              'lada',
    'lucid':             'lucid',
    'lynk & co':         'lynk-co',
    'nio':               'nio',
    'polestar':          'polestar',
    'rivian':            'rivian',
    'scion':             'scion',
    'srt':               'srt',
    'svt':               'svt',
    'tata':              'tata',
    'trabant':           'trabant',
    'triumph':           'triumph',
    'tvr':               'tvr',
    'vauxhall':          'vauxhall',
    'vinfast':           'vinfast',
    'wartburg':          'wartburg',
    'zastava':           'zastava',
};

function normaliseBrand(brand: string): string {
    return brand
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/** Returns the jsDelivr CDN thumbnail URL for a given car brand, or null if unknown. */
export function getCarLogoUrl(brand: string | null | undefined): string | null {
    if (!brand) return null;

    const key = normaliseBrand(brand);
    const slug = BRAND_SLUG_MAP[key];

    if (slug) return `${CDN_BASE}/${slug}.png`;

    // Generic fallback: try a hyphenated slug directly (covers brands not in the map
    // that still follow the dataset naming convention).
    const generatedSlug = key.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (generatedSlug) return `${CDN_BASE}/${generatedSlug}.png`;

    return null;
}

/** The jsDelivr CDN hostname – used by the Service Worker to scope its cache. */
export const CAR_LOGOS_CDN_HOST = 'cdn.jsdelivr.net';
export const CAR_LOGOS_CDN_PATH_PREFIX =
    '/gh/filippofilip95/car-logos-dataset@master/logos/thumb/';
