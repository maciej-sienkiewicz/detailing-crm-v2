// ─── Ustawienia SMS: wiadomości automatyczne i nazwa nadawcy ──────────────────

export interface SmsAutomationRule {
  enabled: boolean;
  offsetMinutes?: number;   // minutes before/after event (absent for immediate event-based rules)
  /**
   * Free text with {{placeholder}} tokens. Which tokens are allowed depends on the rule;
   * see SMS_RULE_PLACEHOLDERS. There is no placeholder for the studio's own name, phone or
   * address: those are known when the template is written, so they go in as plain text.
   */
  messageTemplate: string;
  /**
   * „Domyślnie zaznacz": czy pole „wyślij" przy tej wiadomości w oknach aplikacji
   * (rezerwacja, przyjęcie, wydanie…) startuje zaznaczone. Samo niczego nie wysyła.
   */
  checkedByDefault?: boolean;
}

/** Every SMS whose text the studio owns. The backend rejects a template using any other token. */
export type SmsRuleKey =
  | 'preVisit'
  | 'postVisit'
  | 'delayedReminder'
  | 'bookingConfirmation'
  | 'rescheduleConfirmation'
  | 'visitReadyForPickup'
  | 'visitCardLink'
  | 'reservationCardLink'
  | 'upsellConsent'
  | 'upsellSuggestion'
  | 'signatureRequest'
  /** Zmiana usług w trakcie wizyty - z prośbą o „TAK" i sama informacja. Zawsze włączone. */
  | 'serviceChangeConsent'
  | 'serviceChangeNotice';

export type SmsAutomationConfig = Record<SmsRuleKey, SmsAutomationRule>;

export interface SmsSenderNameConfig {
  senderName: string | null;
  confirmed: boolean;
  hasAuthDocument: boolean;
  authDocumentName: string | null;
}
