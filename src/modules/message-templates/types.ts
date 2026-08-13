import type { SmsAutomationConfig, SmsRuleKey } from '@/modules/sms-campaigns/types';
import type { EmailAutomationConfig, EmailRuleKey } from '@/modules/email-campaigns/types';

/**
 * A message is one situation in which we contact the customer — "vehicle ready for
 * pickup", "reservation confirmed". A situation can reach the customer over SMS, over
 * e-mail, or both, so the channel is an attribute of the message rather than a separate
 * screen. The backend still stores the two channels in separate configs; this module is
 * the seam that presents them as one list.
 */
export type MessageKey =
  | 'bookingConfirmation'
  | 'rescheduleConfirmation'
  | 'reservationCardLink'
  | 'preVisit'
  | 'visitWelcome'
  | 'visitCardLink'
  | 'upsellConsent'
  | 'signatureRequest'
  | 'visitReadyForPickup'
  | 'postVisit'
  | 'delayedReminder'
  | 'batchOrderClose';

export type Channel = 'sms' | 'email';

/** One editable channel of one message. `subject` is meaningless for SMS. */
export interface ChannelDraft {
  enabled: boolean;
  /** Minutes before/after the anchor. Only the time-driven SMS rules carry one. */
  offsetMinutes?: number;
  subject?: string;
  body: string;
}

/** The whole screen's editable state: message → channel → draft. */
export type TemplatesDraft = Record<MessageKey, Partial<Record<Channel, ChannelDraft>>>;

/**
 * What the studio needs to see at a glance for one channel of one message.
 *
 * `blank` is the state that used to hide in plain sight: the rule reads as active but has
 * no text, so nothing is ever sent.
 */
export type ChannelStatus = 'on' | 'blank' | 'off' | 'absent';

export interface TemplatesPayload {
  sms: SmsAutomationConfig;
  email: EmailAutomationConfig;
}

export type { SmsRuleKey, EmailRuleKey };
