export type ProtocolStage = 'CHECK_IN' | 'CHECK_OUT';
export type ProtocolTriggerType = 'GLOBAL_ALWAYS' | 'SERVICE_SPECIFIC' | 'CUSTOMER_CONSENT_REQUIRED';

export type ProtocolTemplateFormat = 'PDF' | 'HTML';
export type ProtocolTemplateVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface ProtocolTemplate {
  id: string;
  name: string;
  description?: string;
  templateUrl?: string; // URL to the template file (PDF or HTML)
  fileFormat: ProtocolTemplateFormat;
  /** Systemowy szablon domyślny: przywracany automatycznie, gdy studio nie ma żadnego szablonu przyjęcia. */
  isDefault: boolean;
  verificationStatus: ProtocolTemplateVerificationStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Wynik weryfikacji pól szablonu (POST /protocol-templates/{id}/verify). */
export interface ProtocolTemplateVerification {
  templateId: string;
  fileFormat: ProtocolTemplateFormat;
  verificationStatus: ProtocolTemplateVerificationStatus;
  requiredFields: string[];
  foundFields: string[];
  missingFields: string[];
  optionalFieldsFound: string[];
  problems: string[];
}

export interface ProtocolRule {
  id: string;
  protocolTemplateId: string;
  protocolTemplate?: ProtocolTemplate; // Populated in responses
  triggerType: ProtocolTriggerType;
  stage: ProtocolStage;
  serviceIds: string[]; // List of service IDs (only if triggerType is SERVICE_SPECIFIC)
  serviceNames: string[]; // Populated in responses with service names
  consentDefinitionId?: string; // Only for CUSTOMER_CONSENT_REQUIRED rules
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VisitProtocol {
  id: string;
  visitId: string;
  protocolTemplateId: string;
  protocolTemplate?: ProtocolTemplate;
  stage: ProtocolStage;
  isSigned: boolean;
  signedAt?: string;
  signedBy?: string;
  filledPdfUrl?: string; // URL to the filled PDF with visit data
  signatureUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProtocolTemplateDto {
  name: string;
  description?: string;
  /** Format pliku szablonu: 'PDF' (domyślny) lub 'HTML'. */
  fileFormat?: ProtocolTemplateFormat;
}

export interface UpdateProtocolTemplateDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateProtocolRuleDto {
  protocolTemplateId: string;
  triggerType: ProtocolTriggerType;
  stage: ProtocolStage;
  serviceIds?: string[]; // List of service IDs (only if triggerType is SERVICE_SPECIFIC)
  consentDefinitionId?: string; // Only for CUSTOMER_CONSENT_REQUIRED rules
  displayOrder?: number;
}

export interface SignProtocolDto {
  signatureUrl: string;
  signedBy: string;
  notes?: string;
}
