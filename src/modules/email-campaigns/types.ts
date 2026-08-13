export interface EmailNotificationRule {
  enabled: boolean;
  subjectTemplate: string;
  bodyTemplate: string;
}

/** Every e-mail whose text the studio owns. The backend rejects a template using any other token. */
export type EmailRuleKey =
  | 'visitWelcome'
  | 'visitReadyForPickup'
  | 'visitCardLink'
  | 'reservationCardLink'
  | 'batchOrderClose';

export type EmailAutomationConfig = Record<EmailRuleKey, EmailNotificationRule>;

export type UpdateEmailAutomationConfigRequest = EmailAutomationConfig;
