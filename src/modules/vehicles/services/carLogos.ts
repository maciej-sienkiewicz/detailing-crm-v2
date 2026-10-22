/**
 * Car logo service: maps vehicle brand names to logo URLs served via jsDelivr CDN.
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
    'range rover':       'land-rover',
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
    'gac':               'gac-group',
    'geely':             'geely',
    'great wall':        'great-wall',
    'haval':             'haval',
    'lada':              'lada',
    'lucid':             'lucid',
    'lynk & co':         'lynk-and-co',
    'nio':               'nio',
    'polestar':          'polestar',
    'rivian':            'rivian',
    'scion':             'scion',
    'tata':              'tata',
    'triumph':           'triumph',
    'tvr':               'tvr',
    'vauxhall':          'vauxhall',
    'vinfast':           'vinfast',
    'wartburg':          'wartburg',
    'zastava':           'zastava',
    // Marki z katalogu marek (db/marki_modele_*.json) zapisane tam inaczej niż powyżej
    // albo wcześniej trafiane tylko przez zgadywany adres - każdy slug sprawdzony w zbiorze.
    'aiways':            'aiways',
    'aixam':             'aixam',
    'alfa-romeo':        'alfa-romeo',
    'alpina':            'alpina',
    'apollo':            'apollo',
    'arcfox':            'arcfox',
    'artega':            'artega',
    'aston-martin':      'aston-martin',
    'austin':            'austin',
    'autobianchi':       'autobianchi',
    'bestune':           'bestune',
    'brilliance':        'brilliance',
    'caterham':          'caterham',
    'changan':           'changan',
    'chery':             'chery',
    'cupra':             'cupra',
    'dkw':               'dkw',
    'dongfeng':          'dongfeng',
    'faw':               'faw',
    'foton':             'foton',
    'gaz':               'gaz',
    'hiphi':             'hiphi',
    'hongqi':            'hongqi',
    'iveco':             'iveco',
    'jac':               'jac',
    'jawa':              'jawa',
    'jetour':            'jetour',
    'ktm':               'ktm',
    'land-rover':        'land-rover',
    'leapmotor':         'leapmotor',
    'levc':              'levc',
    'li-auto':           'li-auto',
    'lifan':             'lifan',
    'ligier':            'ligier',
    'lotus':             'lotus',
    'lynk-and-co':       'lynk-and-co',
    'man':               'man',
    'maxus':             'maxus',
    'mercury':           'mercury',
    'microcar':          'microcar',
    'morgan':            'morgan',
    'oldsmobile':        'oldsmobile',
    'omoda':             'omoda',
    'plymouth':          'plymouth',
    'rover':             'rover',
    'simca':             'simca',
    'uaz':               'uaz',
    'wey':               'wey',
    'xpeng':             'xpeng',
    'zeekr':             'zeekr',
};

function normaliseBrand(brand: string): string {
    return brand
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/**
 * Returns the jsDelivr CDN thumbnail URL for a given car brand, or null if unknown.
 *
 * Tylko marki z mapy - dawniej marka spoza niej dostawała zgadywany adres, a większość
 * takich zgadnięć (głównie motocykle) kończyła się 404, dwa razy: dla <img> i dla
 * przycinania. Bez logo widok pokazuje inicjał.
 */
export function getCarLogoUrl(brand: string | null | undefined): string | null {
    if (!brand) return null;
    const slug = BRAND_SLUG_MAP[normaliseBrand(brand)];
    return slug ? `${CDN_BASE}/${slug}.png` : null;
}

