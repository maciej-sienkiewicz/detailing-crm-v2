// ─── Moduł Kampanii — typy (lustrzane wobec backendowego CampaignController) ──

export type CampaignKind = 'ONE_TIME' | 'AUTOMATIC';
export type CampaignChannel = 'SMS' | 'EMAIL' | 'BOTH';
export type RecipientChannel = 'SMS' | 'EMAIL';

export type CampaignStatus =
  | 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
  | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type RecipientStatus =
  | 'PENDING' | 'SENT' | 'FAILED'
  | 'SKIPPED_NO_CONSENT' | 'SKIPPED_NO_ADDRESS' | 'SKIPPED_FREQUENCY_CAP'
  | 'SKIPPED_OPTED_OUT' | 'EXCLUDED_MANUALLY' | 'SKIPPED_NO_CREDITS'
  | 'STOPPED';

export type CustomerTypeFilter = 'ALL' | 'INDIVIDUAL' | 'COMPANY';

export type AudienceEligibility =
  | 'ELIGIBLE' | 'OPTED_OUT' | 'NO_CONSENT' | 'NO_ADDRESS' | 'FREQUENCY_CAP';

export interface VehicleBrandFilter {
  brand: string;
  model?: string | null;
}

export interface AudienceCriteria {
  visitCountMin?: number | null;
  visitCountMax?: number | null;
  lastVisitOlderThanDays?: number | null;
  lastVisitNewerThanDays?: number | null;
  revenueTotalGrossMin?: number | null;   // grosze
  revenueTotalGrossMax?: number | null;
  servicesUsedAnyOf: string[];
  servicesUsedNoneOf: string[];
  serviceLastUsedOlderThanDays?: number | null;
  vehicleBrands: VehicleBrandFilter[];
  vehicleYearMin?: number | null;
  vehicleYearMax?: number | null;
  customerType: CustomerTypeFilter;
  customerCreatedAfter?: string | null;
  includeCustomerIds: string[];
  excludeCustomerIds: string[];
}

export const emptyAudience = (): AudienceCriteria => ({
  servicesUsedAnyOf: [],
  servicesUsedNoneOf: [],
  vehicleBrands: [],
  customerType: 'ALL',
  includeCustomerIds: [],
  excludeCustomerIds: [],
});

export interface TriggerConfig {
  serviceIds: string[];
  afterDays: number;
  sendTime: string;            // "HH:mm"
  onlyIfNoVisitSince: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  kind: CampaignKind;
  channel: CampaignChannel;
  status: CampaignStatus;
  audience: AudienceCriteria;
  smsTemplate: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  scheduledAt: string | null;
  trigger: TriggerConfig | null;
  recipientsTotal: number;
  recipientsSent: number;
  recipientsFailed: number;
  recipientsSkipped: number;
  creditsSpent: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CampaignRequest {
  name: string;
  kind: CampaignKind;
  channel: CampaignChannel;
  audience: AudienceCriteria;
  smsTemplate?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  scheduledAt?: string | null;
  trigger?: TriggerConfig | null;
}

export interface CampaignStats {
  active: number;
  scheduled: number;
  completedTotal: number;
  completedLast30Days: number;
  messagesSentLast30Days: number;
  smsCreditsAvailable: number;
}

export interface AudienceCustomer {
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  lastVisitDate: string | null;
  lastServiceName: string | null;
  eligibility: AudienceEligibility;
}

export interface AudienceEstimate {
  matched: number;
  optedOut: number;
  noConsent: number;
  noAddress: number;
  frequencyCapped: number;
  eligible: number;
  estimatedSmsSegments: number | null;
  estimatedCredits: number | null;
  sample: AudienceCustomer[];
}

export interface CampaignRecipient {
  id: string;
  customerId: string;
  channel: RecipientChannel;
  address: string;
  status: RecipientStatus;
  errorMessage: string | null;
  scheduledFor: string;
  sentAt: string | null;
}

export interface CampaignSettings {
  quietHoursStart: string;     // "HH:mm"
  quietHoursEnd: string;
  frequencyCapDays: number;
  smsFooter: string | null;
  emailFooter: string | null;
}

export interface TestSendRequest {
  channel: RecipientChannel;
  address: string;
  smsTemplate?: string;
  emailSubject?: string;
  emailBody?: string;
}
