export type ProtocolStage = 'CHECK_IN' | 'CHECK_OUT';
export type ProtocolTriggerType = 'GLOBAL_ALWAYS' | 'SERVICE_SPECIFIC';

export interface ProtocolTemplate {
  id: string;
  name: string;
  description?: string;
  templateUrl?: string; // URL to the PDF template
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProtocolRule {
  id: string;
  protocolTemplateId: string;
  protocolTemplate?: ProtocolTemplate; // Populated in responses
  triggerType: ProtocolTriggerType;
  stage: ProtocolStage;
  serviceId?: string; // Only if triggerType is SERVICE_SPECIFIC
  serviceName?: string; // Populated in responses
  isMandatory: boolean;
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
  isMandatory: boolean;
  isSigned: boolean;
  signedAt?: string;
  signedBy?: string;
  signatureUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProtocolTemplateDto {
  name: string;
  description?: string;
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
  serviceId?: string;
  isMandatory: boolean;
  displayOrder?: number;
}

export interface SignProtocolDto {
  signatureUrl: string;
  signedBy: string;
  notes?: string;
}
