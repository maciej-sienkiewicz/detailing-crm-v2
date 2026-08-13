import type { Channel, MessageKey } from './types';
import type { SmsRuleKey } from '@/modules/sms-campaigns/types';
import type { EmailRuleKey } from '@/modules/email-campaigns/types';

/**
 * The customer journey, in the order the studio lives it. Grouping the list this way
 * answers the question people actually arrive with — "what does the customer get when
 * the car is ready?" — instead of making them remember which channel it went out on.
 */
export const STAGES = [
  { id: 'booking',  title: 'Rezerwacja',      caption: 'Zanim klient przyjedzie' },
  { id: 'intake',   title: 'Przyjęcie pojazdu', caption: 'Auto trafia do serwisu' },
  { id: 'inWork',   title: 'W trakcie prac',  caption: 'Wymaga decyzji klienta' },
  { id: 'pickup',   title: 'Odbiór',          caption: 'Auto gotowe' },
  { id: 'after',    title: 'Po wizycie',      caption: 'Klient już odjechał' },
  { id: 'billing',  title: 'Rozliczenie B2B', caption: 'Kontrahenci flotowi' },
] as const;

export type StageId = typeof STAGES[number]['id'];

/** How the offset reads to a studio — and, since the last fix, what it counts from. */
export type TimingAnchor = 'beforeVisit' | 'afterPickup';

export const TIMING_LABEL: Record<TimingAnchor, string> = {
  beforeVisit: 'przed wizytą',
  afterPickup: 'po odbiorze pojazdu',
};

export interface ChannelSpec {
  /** Key under which the backend stores this channel's rule. */
  ruleKey: string;
  /** Placeholders this message can fill. Mirrors MessageTemplateKind on the backend. */
  placeholders: string[];
}

export interface MessageSpec {
  key: MessageKey;
  stage: StageId;
  name: string;
  /** The full explanation. Lives in the drawer, where there is room to read it. */
  description: string;
  /** Short answer to "when does this go out", for rules without a configurable offset. */
  trigger: string;
  timing?: TimingAnchor;
  sms?: ChannelSpec & { ruleKey: SmsRuleKey };
  email?: ChannelSpec & { ruleKey: EmailRuleKey };
}

const CUSTOMER = ['imie', 'nazwisko'];
const CUSTOMER_FULL = [...CUSTOMER, 'imie_nazwisko'];
const SCHEDULE = ['data', 'godzina'];
const VEHICLE = ['pojazd', 'rejestracja'];
const VISIT = ['numer_wizyty'];

export const MESSAGES: MessageSpec[] = [
  {
    key: 'bookingConfirmation',
    stage: 'booking',
    name: 'Potwierdzenie rezerwacji',
    description:
      'Wychodzi natychmiast po zapisaniu rezerwacji. Operator może wysłać ją także ręcznie z formularza rezerwacji — wtedy przełącznik jest pomijany, ale treść nadal pochodzi z tego szablonu.',
    trigger: 'Natychmiast po rezerwacji',
    sms: { ruleKey: 'bookingConfirmation', placeholders: [...CUSTOMER, ...SCHEDULE] },
  },
  {
    key: 'rescheduleConfirmation',
    stage: 'booking',
    name: 'Zmiana terminu',
    description:
      'Wysyłane tylko wtedy, gdy zmieni się data rozpoczęcia rezerwacji. Edycja usług, notatki czy koloru nie wywołuje żadnej wiadomości.',
    trigger: 'Po zmianie daty rezerwacji',
    sms: { ruleKey: 'rescheduleConfirmation', placeholders: [...CUSTOMER, ...SCHEDULE] },
  },
  {
    key: 'reservationCardLink',
    stage: 'booking',
    name: 'Link do Karty Rezerwacji',
    description:
      'Strona rezerwacji ze szczegółami terminu i zakresem usług z wyceną, wysyłana zanim pojazd trafi do serwisu. Wstaw zmienną link, żeby dodać adres strony.',
    trigger: 'Przy wysyłce Karty Rezerwacji',
    sms: { ruleKey: 'reservationCardLink', placeholders: [...CUSTOMER, ...SCHEDULE, 'link'] },
    email: { ruleKey: 'reservationCardLink', placeholders: [...CUSTOMER_FULL, ...SCHEDULE, 'link'] },
  },
  {
    key: 'preVisit',
    stage: 'booking',
    name: 'Przypomnienie przed wizytą',
    description:
      'Przypomnienie na kilka godzin lub dni przed zaplanowaną wizytą. Pomijamy rezerwacje odwołane, porzucone oraz takie, przy których pojazd już do nas trafił.',
    trigger: 'Przed wizytą',
    timing: 'beforeVisit',
    sms: { ruleKey: 'preVisit', placeholders: [...CUSTOMER, ...SCHEDULE] },
  },

  {
    key: 'visitWelcome',
    stage: 'intake',
    name: 'Potwierdzenie przyjęcia pojazdu',
    description:
      'E-mail potwierdzający przyjęcie auta do serwisu. Załączniki — PDF protokołu, zdjęcia, mapę uszkodzeń — wybiera operator przy wysyłce.',
    trigger: 'Przy rozpoczęciu wizyty',
    email: {
      ruleKey: 'visitWelcome',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE],
    },
  },
  {
    key: 'visitCardLink',
    stage: 'intake',
    name: 'Link do Karty Wizyty',
    description:
      'Karta z dokumentacją zdjęciową, zakresem usług i dokumentami, dostępna dla klienta przez cały czas trwania wizyty. Wstaw zmienną link, żeby dodać adres karty.',
    trigger: 'Przy wysyłce Karty Wizyty',
    sms: {
      ruleKey: 'visitCardLink',
      placeholders: [...CUSTOMER, ...VEHICLE, ...VISIT, ...SCHEDULE, 'link'],
    },
    email: {
      ruleKey: 'visitCardLink',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE, 'link'],
    },
  },

  {
    key: 'upsellConsent',
    stage: 'inWork',
    name: 'Zgoda na dodanie usług',
    description:
      'Klient sam wybiera dodatkowe usługi z Karty Wizyty i potwierdza je, odpisując TAK. Zachowaj tę instrukcję w treści — bez niej klient nie wie, jak potwierdzić, a usługi nie zostaną dodane.',
    trigger: 'Gdy klient zamówi usługi z karty',
    sms: { ruleKey: 'upsellConsent', placeholders: [...CUSTOMER, 'uslugi', 'kwota'] },
  },
  {
    key: 'signatureRequest',
    stage: 'inWork',
    name: 'Link do podpisu dokumentu',
    description:
      'Tokenizowany link do dokumentu czekającego na podpis klienta. Bez włączonego szablonu wysyłka dokumentu do podpisu SMS-em nie powiedzie się.',
    trigger: 'Przy wysyłce dokumentu do podpisu',
    sms: { ruleKey: 'signatureRequest', placeholders: [...CUSTOMER, 'dokument', 'link'] },
  },

  {
    key: 'visitReadyForPickup',
    stage: 'pickup',
    name: 'Pojazd gotowy do odbioru',
    description:
      'Wysyłane jednym kliknięciem z widoku wizyty, gdy prace zostały zakończone i auto czeka na klienta.',
    trigger: 'Po oznaczeniu gotowości',
    sms: { ruleKey: 'visitReadyForPickup', placeholders: [...CUSTOMER, ...VEHICLE, ...VISIT] },
    email: {
      ruleKey: 'visitReadyForPickup',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE],
    },
  },

  {
    key: 'postVisit',
    stage: 'after',
    name: 'Podziękowanie po wizycie',
    description:
      'Wysyłane tylko po wizytach faktycznie zakończonych, a czas liczymy od momentu odbioru pojazdu. Rezerwacja, na którą klient się nie stawił, nie dostanie tej wiadomości.',
    trigger: 'Po odbiorze pojazdu',
    timing: 'afterPickup',
    sms: { ruleKey: 'postVisit', placeholders: [...CUSTOMER, ...SCHEDULE] },
  },
  {
    key: 'delayedReminder',
    stage: 'after',
    name: 'Przypomnienie po przerwie',
    description:
      'Odezwanie się do klienta, który dawno nie był w serwisie. Czas liczymy od odbioru pojazdu — domyślnie 3 miesiące. Można je wyciszyć na pojedynczej wizycie.',
    trigger: 'Po odbiorze pojazdu',
    timing: 'afterPickup',
    sms: { ruleKey: 'delayedReminder', placeholders: [...CUSTOMER, ...SCHEDULE] },
  },

  {
    key: 'batchOrderClose',
    stage: 'billing',
    name: 'Zestawienie zbiorcze miesiąca',
    description:
      'Podsumowanie zamkniętego miesiąca z raportem PDF w załączniku, wysyłane na adres kontrahenta flotowego.',
    trigger: 'Przy zamknięciu miesiąca',
    email: {
      ruleKey: 'batchOrderClose',
      placeholders: ['kontrahent', 'okres', 'kwota_brutto', 'liczba_wpisow'],
    },
  },
];

export const CHANNEL_LABEL: Record<Channel, string> = { sms: 'SMS', email: 'E-mail' };

/** Fallback offsets for rules the backend has not sent yet. */
export const DEFAULT_OFFSET_MINUTES: Partial<Record<MessageKey, number>> = {
  preVisit: 60,
  postVisit: 30,
  delayedReminder: 90 * 24 * 60,
};
