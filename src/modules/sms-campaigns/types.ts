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
  messageTemplate: string;  // may contain {{imie}}, {{data}}, {{godzina}}, {{studio}}
}

export interface SmsAutomationConfig {
  preVisit: SmsAutomationRule;
  postVisit: SmsAutomationRule;
  bookingConfirmation: SmsAutomationRule;
  rescheduleConfirmation: SmsAutomationRule;
}

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
