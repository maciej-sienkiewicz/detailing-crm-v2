// ─── SMS Campaigns Module — Types ─────────────────────────────────────────────

export interface VehicleFilter {
  brand: string;
  model?: string; // if omitted → all models of this brand
}

export interface ServiceFilter {
  serviceId: string;
  serviceName: string;
}

export interface LastVisitFilter {
  olderThanDays?: number;  // customers who haven't visited in X days
  newerThanDays?: number;  // customers who visited within X days
}

export interface CampaignFilters {
  vehicles: VehicleFilter[];
  services: ServiceFilter[];
  lastVisit: LastVisitFilter | null;
}

export const CAMPAIGN_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  SENT: 'SENT',
} as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

export interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  filters: CampaignFilters;
  excludedCustomerIds: string[];
  status: CampaignStatus;
  audienceCount: number;
  sentCount?: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  lastVisitDate?: string;
}

export interface AudiencePreviewResult {
  customers: AudienceCustomer[];
  total: number;
}

export interface SmsAutomationRule {
  enabled: boolean;
  offsetMinutes?: number;   // minutes before/after event (absent for immediate event-based rules)
  /**
   * Free text with {{placeholder}} tokens. Which tokens are allowed depends on the rule —
   * see SMS_RULE_PLACEHOLDERS. There is no placeholder for the studio's own name, phone or
   * address: those are known when the template is written, so they go in as plain text.
   */
  messageTemplate: string;
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
  | 'signatureRequest';

export type SmsAutomationConfig = Record<SmsRuleKey, SmsAutomationRule>;

// ─── Request / response shapes ────────────────────────────────────────────────

export interface CreateCampaignRequest {
  name: string;
  message: string;
  filters: CampaignFilters;
  excludedCustomerIds: string[];
  scheduledAt?: string; // ISO string or undefined → send immediately
}

export interface VehicleBrandOption {
  brand: string;
  models: string[];
}

// ─── AI Campaign Creator ───────────────────────────────────────────────────────

export interface AgentAudienceRequest {
  prompt: string;
}

export interface AgentAudienceResult {
  customers: AudienceCustomer[];
  total: number;
  generatedFiltersDescription?: string; // Human-readable summary of what agents found
}

export interface CampaignRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface SmsSenderNameConfig {
  senderName: string | null;
  confirmed: boolean;
  hasAuthDocument: boolean;
  authDocumentName: string | null;
}
