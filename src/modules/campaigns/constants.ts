import type { CampaignStatus, RecipientStatus } from './types';

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

// ─── Kolory kafli KPI (semantyka design systemu) ──────────────────────────────

export const TILE_STYLES = {
  active: { accentColor: '#16a34a', bgGradient: '', iconBg: '#dcfce7' },
  scheduled: { accentColor: '#d97706', bgGradient: '', iconBg: '#fef3c7' },
  sent: { accentColor: '#0ea5e9', bgGradient: '', iconBg: '#e0f2fe' },
  credits: { accentColor: '#64748b', bgGradient: '', iconBg: '#f1f5f9' },
  creditsLow: { accentColor: '#dc2626', bgGradient: '', iconBg: '#fee2e2' },
} as const;
