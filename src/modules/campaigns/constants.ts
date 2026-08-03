import type { CampaignStatus, RecipientStatus, Scenario } from './types';

// ─── Słownik statusów (język rozdziela światy: jednorazowe "zaplanowane/wysłane",
//     automatyczne "działa/wstrzymana" — patrz docs/campaigns-module-views.md §2) ──

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

export const STATUS_VARIANTS: Record<CampaignStatus, 'success' | 'error' | 'warning' | 'info' | 'primary'> = {
  DRAFT: 'info',
  SCHEDULED: 'warning',
  SENDING: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'info',
  FAILED: 'error',
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'info',
};

export const KIND_LABELS = {
  ONE_TIME: 'Jednorazowa',
  AUTOMATIC: 'Automatyczna',
} as const;

export const KIND_DESCRIPTIONS = {
  ONE_TIME: 'Wysyłana raz — teraz albo w wybranym terminie.',
  AUTOMATIC: 'Działa stale — sama wysyła wiadomość każdemu klientowi, gdy spełni warunek, np. 180 dni po usłudze.',
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

export const PLACEHOLDERS: { token: string; label: string }[] = [
  { token: '{{imie}}', label: 'Imię' },
  { token: '{{nazwisko}}', label: 'Nazwisko' },
  { token: '{{studio}}', label: 'Nazwa studia' },
  { token: '{{marka}}', label: 'Marka auta' },
  { token: '{{model}}', label: 'Model auta' },
  { token: '{{ostatnia_usluga}}', label: 'Ostatnia usługa' },
  { token: '{{data_ostatniej_wizyty}}', label: 'Data ostatniej wizyty' },
  { token: '{{dni_od_wizyty}}', label: 'Dni od wizyty' },
];

// ─── Scenariusze kreatora ─────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [
  {
    id: 'HOLIDAY',
    kind: 'ONE_TIME',
    title: 'Świąteczna / okazjonalna',
    description: 'Życzenia albo oferta specjalna dla wszystkich klientów ze zgodą.',
    prefillSms:
      'Wesołych Świąt, {{imie}}! Dziękujemy, że jesteś z nami. Zespół {{studio}}',
  },
  {
    id: 'REACTIVATION',
    kind: 'ONE_TIME',
    title: 'Reaktywacja',
    description: 'Do klientów, których nie było ponad pół roku.',
    prefillAudience: { lastVisitOlderThanDays: 180 },
    prefillSms:
      'Cześć {{imie}}! Minęło już {{dni_od_wizyty}} dni od Twojej wizyty w {{studio}}. Zajrzyj do nas — Twoje auto na pewno się ucieszy.',
  },
  {
    id: 'VEHICLE_OWNERS',
    kind: 'ONE_TIME',
    title: 'Właściciele wybranych aut',
    description: 'Oferta dopasowana do marki lub modelu pojazdu.',
    prefillSms:
      'Dzień dobry {{imie}}! Mamy ofertę przygotowaną dla właścicieli {{marka}}. Szczegóły: {{studio}}.',
  },
  {
    id: 'VIP',
    kind: 'ONE_TIME',
    title: 'Klienci VIP',
    description: 'Najwierniejsi klienci — po liczbie wizyt i wydatkach.',
    prefillAudience: { visitCountMin: 3, revenueTotalGrossMin: 500_000 },
    prefillSms:
      '{{imie}}, dziękujemy za zaufanie! Jako stały klient {{studio}} masz u nas specjalne warunki. Zapraszamy.',
  },
  {
    id: 'CUSTOM_ONE_TIME',
    kind: 'ONE_TIME',
    title: 'Własna jednorazowa',
    description: 'Zacznij od zera i ustaw wszystko samodzielnie.',
  },
  {
    id: 'SERVICE_FOLLOW_UP',
    kind: 'AUTOMATIC',
    title: 'Przypomnienie po usłudze',
    description: 'Stały automat: wiadomość po wybranym czasie od wykonania usługi.',
    prefillTrigger: { afterDays: 180, sendTime: '10:00', onlyIfNoVisitSince: true },
    prefillSms:
      'Cześć {{imie}}! Minęło {{dni_od_wizyty}} dni od usługi {{ostatnia_usluga}} w {{studio}}. Czas na odświeżenie? Zapraszamy.',
  },
  {
    id: 'CUSTOM_AUTOMATIC',
    kind: 'AUTOMATIC',
    title: 'Własna automatyczna',
    description: 'Własny warunek wysyłki i własna treść.',
  },
];

// ─── Kolory kafli KPI (semantyka design systemu) ──────────────────────────────

export const TILE_STYLES = {
  active: { accentColor: '#16a34a', bgGradient: '', iconBg: '#dcfce7' },
  scheduled: { accentColor: '#d97706', bgGradient: '', iconBg: '#fef3c7' },
  sent: { accentColor: '#0ea5e9', bgGradient: '', iconBg: '#e0f2fe' },
  credits: { accentColor: '#64748b', bgGradient: '', iconBg: '#f1f5f9' },
  creditsLow: { accentColor: '#dc2626', bgGradient: '', iconBg: '#fee2e2' },
} as const;
