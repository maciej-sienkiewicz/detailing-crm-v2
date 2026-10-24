import { pluralPl } from '@/common/utils/plural';
import type { ChannelDraft, ChannelStatus } from '../types';

/**
 * Sample values used only for the preview. Every key is something we cannot know when the
 * template is written: the studio's own name, phone and address are deliberately absent,
 * because the studio types those straight into the text.
 */
export const PREVIEW_VALUES: Record<string, string> = {
  imie: 'Jan',
  nazwisko: 'Kowalski',
  imie_nazwisko: 'Jan Kowalski',
  data: '15.06.2026',
  godzina: '14:30',
  pojazd: 'BMW X5',
  rejestracja: 'WA 12345',
  numer_wizyty: 'W/2026/0142',
  link: 'https://karta.detailboost.pl/vc/a8f3c1',
  uslugi: 'Korekta lakieru (w cenie 1200.00 PLN)',
  kwota: '1200.00',
  dokument: 'Protokół przyjęcia pojazdu',
  kontrahent: 'Auto Flota Sp. z o.o.',
  okres: '01.06.2026 - 30.06.2026',
  kwota_brutto: '12 480,00 zł',
  liczba_wpisow: '18',
  // Zmiana usług w podglądzie: dodano i zmieniono cenę, nic nie usunięto - żeby było
  // widać, że fragment „[Usunięto: {{usuniete}}.]" znika, gdy danej zmiany nie było.
  dodane: 'Powłoka ceramiczna',
  usuniete: '',
  zmienione: 'Kontrola po zabezpieczeniu',
  liczba_dodanych: '1 usługa',
  liczba_usunietych: '',
  liczba_zmienionych: '1 usługa',
  liczba_zmian: '2 usługi',
  poprzednia_cena: '1 200,00 zł',
  nowa_cena: '3 690,00 zł',
  roznica: '2 490,00 zł',
  termin_odbioru: '18.06.2026',
};

export const VAR_LABELS: Record<string, string> = {
  imie: 'imię',
  nazwisko: 'nazwisko',
  imie_nazwisko: 'imię i nazwisko',
  data: 'data',
  godzina: 'godzina',
  pojazd: 'pojazd',
  rejestracja: 'rejestracja',
  numer_wizyty: 'nr wizyty',
  link: 'link',
  uslugi: 'usługi',
  kwota: 'kwota',
  dokument: 'dokument',
  kontrahent: 'kontrahent',
  okres: 'okres',
  kwota_brutto: 'kwota brutto',
  liczba_wpisow: 'liczba aut',
  dodane: 'dodane usługi',
  usuniete: 'usunięte usługi',
  zmienione: 'usługi ze zmienioną ceną',
  liczba_dodanych: 'ile dodanych',
  liczba_usunietych: 'ile usuniętych',
  liczba_zmienionych: 'ile ze zmienioną ceną',
  liczba_zmian: 'ile zmian razem',
  poprzednia_cena: 'cena przed zmianą',
  nowa_cena: 'cena po zmianie',
  roznica: 'różnica w cenie',
  termin_odbioru: 'termin odbioru',
};

/**
 * Wszystko w podwójnych klamrach jest zmienną, także z polską literą czy myślnikiem - ta
 * sama reguła co MessageTemplateRenderer na serwerze. Wcześniej `\w` widziało tylko ASCII,
 * więc `{{imię}}` nie było zmienną: przechodziło walidację i klient dostawał SMS
 * z dosłownym „{{imię}}".
 */
const TOKEN = /\{\{\s*([^{}]*?)\s*\}\}/g;

const POLISH_TO_ASCII: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
};

/** `{{imię}}` to `{{imie}}`: nazwa zmiennej bez polskich znaków, jak na serwerze. */
const tokenName = (raw: string): string => raw.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => POLISH_TO_ASCII[ch] ?? ch);
const FRAGMENT = /\[([^[\]]*)\]/g;

/**
 * Renders a template with sample data. Unknown tokens are left visible on purpose.
 *
 * `optionalFragments` - ta sama reguła co MessageTemplateRenderer na serwerze: `[...]`
 * zostaje bez nawiasów, gdy każda zmienna w środku ma wartość, a znika, gdy któraś jest
 * pusta. Nawiasy bez zmiennej to zwykły tekst.
 */
export function resolveTemplate(template: string, optionalFragments = false): string {
  const withFragments = optionalFragments
    ? template.replace(FRAGMENT, (match, inner: string) => {
        const keys = Array.from(inner.matchAll(TOKEN)).map(m => tokenName(m[1]));
        if (keys.length === 0) return match;
        // Nieznana zmienna zostaje widoczna (patrz niżej), więc fragmentu nie gasi.
        return keys.every(key => !(key in PREVIEW_VALUES) || PREVIEW_VALUES[key] !== '') ? inner : '';
      })
    : template;
  const resolved = withFragments.replace(TOKEN, (match, raw: string) => {
    const key = tokenName(raw);
    return key in PREVIEW_VALUES ? PREVIEW_VALUES[key] : match;
  });
  return optionalFragments ? resolved.replace(/[ \t]{2,}/g, ' ').trim() : resolved;
}

/** Kawałek podglądu: tekst studia albo wartość, którą system wstawi sam. */
export interface PreviewSegment {
  text: string;
  /** Wartość ze zmiennej - podgląd ją podświetla, żeby było widać, czego studio nie pisze. */
  filled: boolean;
}

/**
 * Ten sam podgląd co resolveTemplate, tylko pocięty na kawałki: tekst studia osobno,
 * wartości zmiennych osobno. Sklejone kawałki są ZAWSZE równe resolveTemplate - pilnuje
 * tego test, bo dwie implementacje tej samej reguły rozjeżdżają się po cichu.
 *
 * Zwijanie spacji i obcinanie brzegów (fragmenty opcjonalne) działa na znakach z flagą,
 * a nie na kawałkach: podwójna spacja potrafi powstać na styku tekstu i pustej zmiennej.
 */
export function previewSegments(template: string, optionalFragments = false): PreviewSegment[] {
  const withFragments = optionalFragments
    ? template.replace(FRAGMENT, (match, inner: string) => {
        const keys = Array.from(inner.matchAll(TOKEN)).map(m => tokenName(m[1]));
        if (keys.length === 0) return match;
        return keys.every(key => !(key in PREVIEW_VALUES) || PREVIEW_VALUES[key] !== '') ? inner : '';
      })
    : template;

  const chars: { ch: string; filled: boolean }[] = [];
  const push = (text: string, filled: boolean) => {
    for (const ch of text) chars.push({ ch, filled });
  };
  let last = 0;
  for (const match of withFragments.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    push(withFragments.slice(last, index), false);
    const key = tokenName(match[1]);
    if (key in PREVIEW_VALUES) push(PREVIEW_VALUES[key], true);
    else push(match[0], false);
    last = index + match[0].length;
  }
  push(withFragments.slice(last), false);

  let flagged = chars;
  if (optionalFragments) {
    const collapsed: typeof chars = [];
    for (let i = 0; i < chars.length; i++) {
      const isBlank = chars[i].ch === ' ' || chars[i].ch === '\t';
      if (isBlank) {
        let end = i;
        while (end + 1 < chars.length && (chars[end + 1].ch === ' ' || chars[end + 1].ch === '\t')) end++;
        // Jak .replace(/[ \t]{2,}/g, ' '): pojedynczy znak zostaje sobą, ciąg - jedną spacją.
        collapsed.push(end > i ? { ch: ' ', filled: chars[i].filled } : chars[i]);
        i = end;
      } else {
        collapsed.push(chars[i]);
      }
    }
    let start = 0;
    let stop = collapsed.length;
    while (start < stop && /\s/.test(collapsed[start].ch)) start++;
    while (stop > start && /\s/.test(collapsed[stop - 1].ch)) stop--;
    flagged = collapsed.slice(start, stop);
  }

  const segments: PreviewSegment[] = [];
  for (const { ch, filled } of flagged) {
    const tail = segments[segments.length - 1];
    if (tail && tail.filled === filled) tail.text += ch;
    else segments.push({ text: ch, filled });
  }
  return segments;
}

/** Tokens the studio typed that this message cannot fill: the backend rejects these. */
export function unknownPlaceholders(template: string, allowed: string[]): string[] {
  const used = Array.from(template.matchAll(TOKEN)).map(m => tokenName(m[1]));
  return Array.from(new Set(used.filter(key => !allowed.includes(key))));
}

const HAS_DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;

/** GSM-7 vs UCS-2, same rules SMSAPI bills by. */
export function smsSegments(text: string): number {
  if (!text) return 0;
  return HAS_DIACRITICS.test(text)
    ? (text.length <= 70 ? 1 : Math.ceil(text.length / 67))
    : (text.length <= 160 ? 1 : Math.ceil(text.length / 153));
}

/**
 * A channel counts as sending only when the studio switched it on *and* wrote something.
 * `blank` is the trap this screen exists to surface: looks active, sends nothing.
 */
export function channelStatus(draft: ChannelDraft | undefined, hasSubject: boolean): ChannelStatus {
  if (!draft) return 'absent';
  if (!draft.enabled) return 'off';
  const bodyFilled = draft.body.trim().length > 0;
  const subjectFilled = !hasSubject || (draft.subject ?? '').trim().length > 0;
  return bodyFilled && subjectFilled ? 'on' : 'blank';
}

type Unit = 'minutes' | 'hours' | 'days';

export function minutesToValue(total: number): { value: number; unit: Unit } {
  if (total % 1440 === 0 && total >= 1440) return { value: total / 1440, unit: 'days' };
  if (total % 60 === 0 && total >= 60) return { value: total / 60, unit: 'hours' };
  return { value: total, unit: 'minutes' };
}

export function valueToMinutes(value: number, unit: Unit): number {
  if (unit === 'days') return value * 1440;
  if (unit === 'hours') return value * 60;
  return value;
}

export function formatOffset(total: number): string {
  const { value, unit } = minutesToValue(total);
  const word =
    unit === 'days' ? (value === 1 ? 'dzień' : 'dni')
    : unit === 'hours' ? pluralPl(value, 'godzinę', 'godziny', 'godzin')
    : pluralPl(value, 'minutę', 'minuty', 'minut');
  return `${value} ${word}`;
}

export type { Unit };
