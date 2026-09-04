import type { AudienceEligibility, CampaignStatus, RecipientStatus } from './types';

// ─── Słownik statusów (język rozdziela światy: jednorazowe "zaplanowane/wysłane",
//     automatyczne "działa/wstrzymana", patrz docs/campaigns-module-views.md §2) ──

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Szkic',
  SCHEDULED: 'Zaplanowana',
  SENDING: 'W trakcie wysyłki',
  COMPLETED: 'Wysłana',
  CANCELLED: 'Anulowana',
  FAILED: 'Błąd',
  ACTIVE: 'Działa',
  PAUSED: 'Wstrzymana',
  ARCHIVED: 'Zarchiwizowana',
};

/**
 * Kolor etapu kampanii - kropka, nie wypełniona plakietka.
 *
 * Ten sam język, którym etap leada oznaczony jest w tabeli leadów i w wybieraku
 * statusu: siedmiopikselowa kropka niesie barwę, a nazwa pisana normalnie czyta
 * się szybciej niż KAPITALIKAMI. Wypełniona plakietka w każdym wierszu nie
 * wyróżnia niczego - jeśli świeci cała kolumna, nie świeci nic.
 *
 * Barwy niosą znaczenie i nic poza tym: zielony = idzie zgodnie z planem,
 * bursztyn = czeka albo stoi, czerwony = coś nie wyszło, szary = nic się nie
 * dzieje. Kanał, rodzaj kampanii ani „ładny akcent" koloru nie dostają.
 */
export const STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: '#94a3b8',
  SCHEDULED: '#d97706',
  SENDING: '#0284c7',
  COMPLETED: '#15803d',
  CANCELLED: '#94a3b8',
  FAILED: '#b91c1c',
  ACTIVE: '#15803d',
  PAUSED: '#a16207',
  ARCHIVED: '#cbd5e1',
};

export const KIND_LABELS = {
  ONE_TIME: 'Jednorazowa',
  AUTOMATIC: 'Automatyczna',
} as const;

export const KIND_DESCRIPTIONS = {
  ONE_TIME: 'Wysyłana raz: teraz albo w wybranym terminie.',
  AUTOMATIC: 'Działa stale: sama wysyła wiadomość każdemu klientowi, gdy spełni warunek, np. 180 dni po usłudze.',
} as const;

export const CHANNEL_LABELS = {
  SMS: 'SMS',
  EMAIL: 'E-mail',
  BOTH: 'SMS i e-mail',
} as const;

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  PENDING: 'Oczekuje',
  SENT: 'Wysłano',
  FAILED: 'Błąd wysyłki',
  SKIPPED_NO_CONSENT: 'Brak zgody',
  SKIPPED_NO_ADDRESS: 'Brak numeru / adresu',
  SKIPPED_FREQUENCY_CAP: 'Limit wysyłek',
  SKIPPED_OPTED_OUT: 'Rezygnacja (STOP)',
  EXCLUDED_MANUALLY: 'Wykluczono ręcznie',
  SKIPPED_NO_CREDITS: 'Brak kredytów SMS',
  STOPPED: 'Zatrzymano',
};

/**
 * Only values we cannot know when the campaign is written. The studio's own name,
 * phone and website are not here; type them straight into the message.
 */
export const PLACEHOLDERS: { token: string; label: string }[] = [
  { token: '{{imie}}', label: 'Imię' },
  { token: '{{nazwisko}}', label: 'Nazwisko' },
  { token: '{{marka}}', label: 'Marka auta' },
  { token: '{{model}}', label: 'Model auta' },
  { token: '{{ostatnia_usluga}}', label: 'Ostatnia usługa' },
  { token: '{{data_ostatniej_wizyty}}', label: 'Data ostatniej wizyty' },
  { token: '{{dni_od_wizyty}}', label: 'Dni od wizyty' },
];

/** Poniżej tego progu doładowanie przestaje być formalnością - mówimy o tym wprost. */
export const LOW_CREDITS_THRESHOLD = 200;

/**
 * Dlaczego ktoś z listy nie dostanie wiadomości. Jedno zdanie na powód - bo to
 * jedyna odpowiedź na pytanie „czemu wyszło mniej, niż się spodziewałem".
 */
export const ELIGIBILITY_LABELS: Record<AudienceEligibility, string> = {
  ELIGIBLE: 'Otrzyma',
  NO_CONSENT: 'Brak zgody marketingowej',
  NO_ADDRESS: 'Brak numeru / adresu',
  OPTED_OUT: 'Wypisany (STOP)',
  FREQUENCY_CAP: 'Niedawno kontaktowany',
  EXCLUDED_MANUALLY: 'Odznaczony ręcznie',
};

/** Ile odbiorców pokazuje jedna strona tabeli w kreatorze. */
export const AUDIENCE_PAGE_SIZE = 25;

/** Ile dni w przód patrzy prognoza kampanii automatycznej. */
export const TRIGGER_HORIZON_DAYS = 30;
