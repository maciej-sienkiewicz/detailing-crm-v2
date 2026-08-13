import type { ChannelDraft, ChannelStatus } from '../types';

/**
 * Sample values used only for the preview. Every key is something we cannot know when the
 * template is written — the studio's own name, phone and address are deliberately absent,
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
  okres: '01.06.2026 – 30.06.2026',
  kwota_brutto: '12 480,00 zł',
  liczba_wpisow: '18',
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
  liczba_wpisow: 'liczba wpisów',
};

const TOKEN = /\{\{\s*(\w+)\s*\}\}/g;

/** Renders a template with sample data. Unknown tokens are left visible on purpose. */
export function resolveTemplate(template: string): string {
  return template.replace(TOKEN, (match, key: string) =>
    key in PREVIEW_VALUES ? PREVIEW_VALUES[key] : match
  );
}

/** Tokens the studio typed that this message cannot fill — the backend rejects these. */
export function unknownPlaceholders(template: string, allowed: string[]): string[] {
  const used = Array.from(template.matchAll(TOKEN)).map(m => m[1]);
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
    : unit === 'hours' ? (value === 1 ? 'godzinę' : 'godzin')
    : (value === 1 ? 'minutę' : 'minut');
  return `${value} ${word}`;
}

export type { Unit };
