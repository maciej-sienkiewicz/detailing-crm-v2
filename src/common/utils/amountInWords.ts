/**
 * Kwota słownie po polsku, w formacie z faktur: „dwa tysiące dwieście czternaście złotych 00/100".
 *
 * Ten sam zapis co AmountInWords w backendzie (PDF faktury), żeby podgląd przed
 * wystawieniem nie różnił się od dokumentu. Grosze zostają cyframi, jak w praktyce bankowej.
 */

const UNITS = [
    '', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć',
    'dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście',
    'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście',
];
const TENS = [
    '', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt',
    'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt',
];
const HUNDREDS = [
    '', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset',
    'sześćset', 'siedemset', 'osiemset', 'dziewięćset',
];

/** Formy: 1, 2-4, 5+ - polska odmiana rzeczownika po liczebniku. */
type Forms = [one: string, few: string, many: string];

const SCALES: Array<Forms | null> = [
    null,
    ['tysiąc', 'tysiące', 'tysięcy'],
    ['milion', 'miliony', 'milionów'],
    ['miliard', 'miliardy', 'miliardów'],
];
const ZLOTY: Forms = ['złoty', 'złote', 'złotych'];

/** 1 złoty, 2-4 złote, 5-21 złotych, 22 złote; 12-14 zawsze „złotych”. */
const form = (value: number, [one, few, many]: Forms): string => {
    if (value === 1) return one;
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo >= 12 && lastTwo <= 14) return many;
    return last >= 2 && last <= 4 ? few : many;
};

const spellGroup = (group: number): string => {
    const rest = group % 100;
    const words = [HUNDREDS[Math.floor(group / 100)]];
    if (rest > 0 && rest < 20) words.push(UNITS[rest]);
    if (rest >= 20) words.push(TENS[Math.floor(rest / 10)], UNITS[rest % 10]);
    return words.filter(Boolean).join(' ');
};

const spell = (value: number): string => {
    if (value === 0) return 'zero';
    const groups: string[] = [];
    let rest = value;
    for (let scale = 0; rest > 0; scale++) {
        const group = rest % 1000;
        const forms = SCALES[scale];
        if (group > 0) {
            // „tysiąc”, nie „jeden tysiąc”.
            groups.unshift(!forms ? spellGroup(group) : group === 1 ? forms[0] : `${spellGroup(group)} ${form(group, forms)}`);
        }
        rest = Math.floor(rest / 1000);
    }
    return groups.join(' ');
};

/** @param grosze kwota w groszach; ujemna dostaje „minus”. */
export const amountInWords = (grosze: number): string => {
    const sign = grosze < 0 ? 'minus ' : '';
    const absolute = Math.abs(Math.round(grosze));
    const zlote = Math.floor(absolute / 100);
    const cents = String(absolute % 100).padStart(2, '0');
    return `${sign}${spell(zlote)} ${form(zlote, ZLOTY)} ${cents}/100`;
};
