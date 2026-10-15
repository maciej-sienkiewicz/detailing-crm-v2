import type { Channel, MessageKey } from './types';
import type { SmsRuleKey } from '@/modules/sms-settings/types';
import type { EmailRuleKey } from '@/modules/email-campaigns/types';

/**
 * The customer journey, in the order the studio lives it. Grouping the list this way
 * answers the question people actually arrive with: "what does the customer get when
 * the car is ready?" instead of making them remember which channel it went out on.
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

/** How the offset reads to a studio, and what it counts from since the last fix. */
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
  /**
   * Gdzie pracownik decyduje, czy ta wiadomość wyjdzie - pole „wyślij" w oknie aplikacji.
   * Tylko takie kanały dostają przełącznik „Domyślnie zaznacz"; wiadomości wysyłane
   * wyłącznie automatycznie albo jednym przyciskiem nie mają czego zaznaczać.
   */
  choice?: string;
  /**
   * Wiadomość bez przełącznika: wysyła ją pracownik z okna aplikacji, więc szablon jest
   * zawsze włączony. Tekst mówi, skąd wychodzi - w miejscu przełącznika.
   */
  alwaysOn?: string;
  /**
   * `[...]` to fragment, który znika, gdy którakolwiek zmienna w nim jest pusta.
   * Mirrors MessageTemplateKind.optionalFragments on the backend.
   */
  optionalFragments?: boolean;
  /** Zdanie doklejane przez serwer na końcu każdej wiadomości - liczy się do długości SMS-a. */
  suffix?: string;
  /**
   * Wychodzi domyślnie bez polskich znaków (pracownik może je włączyć w oknie wysyłki) -
   * licznik SMS-ów liczy wtedy wersję bez ogonków, bo tyle zapłaci studio.
   */
  asciiByDefault?: boolean;
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

/**
 * Klocki SMS-a o zmianach usług. Gotowej zmiennej „opis zmian" nie ma celowo: studio
 * składa opis samo, a fragment w [...] znika, gdy danej zmiany nie było.
 */
const SERVICE_CHANGE = [
  ...CUSTOMER, ...VEHICLE, ...VISIT,
  'dodane', 'usuniete', 'zmienione',
  'liczba_dodanych', 'liczba_usunietych', 'liczba_zmienionych', 'liczba_zmian',
  'poprzednia_cena', 'nowa_cena', 'roznica',
  'termin_odbioru', 'link',
];
const SERVICE_CHANGE_ORIGIN =
  'Wysyła ją pracownik przy zapisie zmian w usługach wizyty, gdy zaznaczy powiadomienie klienta. Przed wysłaniem może poprawić treść.';

export const MESSAGES: MessageSpec[] = [
  {
    key: 'bookingConfirmation',
    stage: 'booking',
    name: 'Potwierdzenie rezerwacji',
    description:
      'Wychodzi zaraz po zapisaniu rezerwacji. Wysłana ręcznie z rezerwacji też ma tę treść.',
    trigger: 'Natychmiast po rezerwacji',
    sms: {
      ruleKey: 'bookingConfirmation',
      placeholders: [...CUSTOMER, ...SCHEDULE],
      choice: 'Pole „Wyślij SMS z potwierdzeniem rezerwacji” w oknie nowej rezerwacji',
    },
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
    name: 'Link do Karty rezerwacji',
    description:
      'Strona z terminem i wyceną, wysyłana przed przyjęciem auta. Wstaw {{link}}, żeby dodać adres. Auto i numer rejestracyjny mogą być jeszcze puste.',
    trigger: 'Przy wysyłce Karty rezerwacji',
    sms: {
      ruleKey: 'reservationCardLink',
      placeholders: [...CUSTOMER, ...VEHICLE, ...SCHEDULE, 'link'],
      choice: 'Pole „Wyślij SMS z linkiem do Karty wizyty” w oknie nowej rezerwacji',
    },
    email: { ruleKey: 'reservationCardLink', placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...SCHEDULE, 'link'] },
  },
  {
    key: 'preVisit',
    stage: 'booking',
    name: 'Przypomnienie przed wizytą',
    description:
      'Przypomnienie na kilka godzin lub dni przed zaplanowaną wizytą. Pomijamy rezerwacje odwołane, porzucone oraz takie, przy których pojazd już do nas trafił.',
    trigger: 'Przed wizytą',
    timing: 'beforeVisit',
    sms: {
      ruleKey: 'preVisit',
      placeholders: [...CUSTOMER, ...SCHEDULE],
      choice: 'Pole „Wyślij SMS przypominający przed wizytą” w oknie nowej rezerwacji',
    },
  },

  {
    key: 'visitWelcome',
    stage: 'intake',
    name: 'Potwierdzenie przyjęcia pojazdu',
    description:
      'E-mail potwierdzający przyjęcie auta do serwisu. Załączniki (PDF protokołu, zdjęcia, mapę uszkodzeń) wybiera pracownik przy wysyłce.',
    trigger: 'Przy rozpoczęciu wizyty',
    email: {
      ruleKey: 'visitWelcome',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE],
      choice: 'Pole „Wyślij e-mail potwierdzający” przy przyjęciu pojazdu',
    },
  },
  {
    key: 'visitCardLink',
    stage: 'intake',
    name: 'Link do Karty wizyty',
    description:
      'Karta z dokumentacją zdjęciową, zakresem usług i dokumentami, dostępna dla klienta przez cały czas trwania wizyty. Wstaw {{link}}, żeby dodać adres karty.',
    trigger: 'Przy wysyłce Karty wizyty',
    sms: {
      ruleKey: 'visitCardLink',
      placeholders: [...CUSTOMER, ...VEHICLE, ...VISIT, ...SCHEDULE, 'link'],
      choice: 'Pole „Wyślij link do Karty wizyty” przy przyjęciu pojazdu',
    },
    email: {
      ruleKey: 'visitCardLink',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE, 'link'],
      choice: 'Pole „Wyślij link do Karty wizyty” przy przyjęciu pojazdu',
    },
  },

  {
    key: 'serviceChangeConsent',
    stage: 'inWork',
    name: 'Zmiana usług: prośba o zgodę',
    description:
      'Pracownik zmienił usługi w trakcie wizyty i klient ma je zaakceptować. Zdanie „Odpisz TAK, aby zaakceptować.” dopisujemy sami na końcu - bez niego klient nie wie, jak potwierdzić, więc nie ma go w szablonie.',
    trigger: 'Przy zapisie zmian w usługach z potwierdzeniem klienta',
    sms: {
      ruleKey: 'serviceChangeConsent',
      placeholders: SERVICE_CHANGE,
      alwaysOn: SERVICE_CHANGE_ORIGIN,
      optionalFragments: true,
      suffix: 'Odpisz TAK, aby zaakceptować.',
      asciiByDefault: true,
    },
  },
  {
    key: 'serviceChangeNotice',
    stage: 'inWork',
    name: 'Zmiana usług: informacja',
    description:
      'Pracownik zmienił usługi w trakcie wizyty i tylko informuje klienta - bez prośby o odpowiedź.',
    trigger: 'Przy zapisie zmian w usługach bez potwierdzenia',
    sms: {
      ruleKey: 'serviceChangeNotice',
      placeholders: SERVICE_CHANGE,
      alwaysOn: SERVICE_CHANGE_ORIGIN,
      optionalFragments: true,
      asciiByDefault: true,
    },
  },
  {
    key: 'upsellConsent',
    stage: 'inWork',
    name: 'Zgoda na dodanie usług',
    description:
      'Klient sam wybiera dodatkowe usługi z Karty wizyty i potwierdza je, odpisując TAK. Zachowaj tę instrukcję w treści: bez niej klient nie wie, jak potwierdzić, a usługi nie zostaną dodane.',
    trigger: 'Gdy klient zamówi usługi z karty',
    sms: { ruleKey: 'upsellConsent', placeholders: [...CUSTOMER, 'uslugi', 'kwota'] },
  },
  {
    key: 'upsellSuggestion',
    stage: 'inWork',
    name: 'Propozycja dodatkowych usług',
    description:
      'Pracownik dodał na Karcie wizyty propozycję dodatkowych usług i zaznaczył „powiadom klienta”. Klient dostaje informację z linkiem do karty — bez „odpisz TAK”; zgodę potwierdza dopiero wtedy, gdy sam wybierze usługę na karcie. Poza godzinami 12:00–18:00 SMS czeka w kolejce.',
    trigger: 'Gdy pracownik doda propozycję z powiadomieniem',
    sms: {
      ruleKey: 'upsellSuggestion',
      placeholders: [...CUSTOMER, 'uslugi', 'link'],
      choice: 'Pole „Czy powiadomić klienta o dodanych usługach?” na Karcie wizyty',
    },
  },
  {
    key: 'signatureRequest',
    stage: 'inWork',
    name: 'Link do podpisu dokumentu',
    description:
      'Link do dokumentu, który klient ma podpisać. Bez tej wiadomości nie wyślesz dokumentu do podpisu SMS-em.',
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
    sms: {
      ruleKey: 'visitReadyForPickup',
      placeholders: [...CUSTOMER, ...VEHICLE, ...VISIT],
      choice: 'Pole „SMS” w oknie „Pojazd gotowy do odbioru”',
    },
    email: {
      ruleKey: 'visitReadyForPickup',
      placeholders: [...CUSTOMER_FULL, ...VEHICLE, ...VISIT, ...SCHEDULE],
      choice: 'Pole „E-mail” w oknie „Pojazd gotowy do odbioru”',
    },
  },

  {
    key: 'postVisit',
    stage: 'after',
    name: 'Podziękowanie po wizycie',
    description:
      'Tylko po zakończonych wizytach. Godzinę (12:00–18:00) wybiera pracownik przy wydaniu auta; czas poniżej działa, gdy jej nie wybrał.',
    trigger: 'Po odbiorze pojazdu',
    timing: 'afterPickup',
    sms: {
      ruleKey: 'postVisit',
      placeholders: [...CUSTOMER, ...SCHEDULE],
      choice: 'Pole „Podziękowanie SMS” przy wydaniu pojazdu',
    },
  },
  {
    key: 'delayedReminder',
    stage: 'after',
    name: 'Przypomnienie po przerwie',
    description:
      'Wiadomość do klienta, który dawno nie był. Czas liczymy od odbioru auta, domyślnie 3 miesiące. Można ją wyłączyć na pojedynczej wizycie.',
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
      choice: 'Pole „Wyślij zestawienie kontrahentowi e-mailem” przy zamknięciu miesiąca',
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
