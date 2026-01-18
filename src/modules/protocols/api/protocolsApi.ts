import axios from 'axios';
import { apiClient } from '../../../core/apiClient';
import type {
  ProtocolTemplate,
  ProtocolRule,
  VisitProtocol,
  CreateProtocolTemplateDto,
  UpdateProtocolTemplateDto,
  CreateProtocolRuleDto,
  SignProtocolDto,
} from '../types';

class ProtocolsApi {
  // Protocol Templates
  async getProtocolTemplates(): Promise<ProtocolTemplate[]> {
    const response = await apiClient.get<ProtocolTemplate[]>('/api/v1/protocol-templates');
    return response.data;
  }

  async getProtocolTemplate(id: string): Promise<ProtocolTemplate> {
    const response = await apiClient.get<ProtocolTemplate>(`/api/v1/protocol-templates/${id}`);
    return response.data;
  }

  async createProtocolTemplate(data: CreateProtocolTemplateDto, file?: File): Promise<ProtocolTemplate> {
    // Step 1: Create template and get presigned upload URL
    const response = await apiClient.post<ProtocolTemplate>('/api/v1/protocol-templates', data);
    const template = response.data;

    // Step 2: Upload file to S3 if provided
    // The templateUrl contains the presigned URL for uploading
    if (file && template.templateUrl) {
      await axios.put(template.templateUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });
    }

    // Step 3: Return the created template
    return template;
  }

  async updateProtocolTemplate(id: string, data: UpdateProtocolTemplateDto): Promise<ProtocolTemplate> {
    const response = await apiClient.patch<ProtocolTemplate>(`/api/v1/protocol-templates/${id}`, data);
    return response.data;
  }

  async deleteProtocolTemplate(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/protocol-templates/${id}`);
  }

  // Protocol Rules
  async getProtocolRules(): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>('/api/v1/protocol-rules');
    return response.data;
  }

  async getProtocolRulesByStage(stage: 'CHECK_IN' | 'CHECK_OUT'): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>(`/api/v1/protocol-rules?stage=${stage}`);
    return response.data;
  }

  async getProtocolRulesByService(serviceId: string): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>(`/api/v1/protocol-rules?serviceId=${serviceId}`);
    return response.data;
  }

  async createProtocolRule(data: CreateProtocolRuleDto): Promise<ProtocolRule> {
    const response = await apiClient.post<ProtocolRule>('/api/v1/protocol-rules', data);
    return response.data;
  }

  // Note: Backend does not support updating or deleting protocol rules
  // Create new rules instead of modifying existing ones

  // Visit Protocols
  async getVisitProtocols(visitId: string): Promise<VisitProtocol[]> {
    const response = await apiClient.get<VisitProtocol[]>(`/api/v1/visits/${visitId}/protocols`);
    return response.data;
  }

  async signVisitProtocol(visitId: string, protocolId: string, data: SignProtocolDto): Promise<VisitProtocol> {
    const response = await apiClient.post<VisitProtocol>(
      `/api/v1/visits/${visitId}/protocols/${protocolId}/sign`,
      data
    );
    return response.data;
  }

  async generateVisitProtocols(visitId: string, stage: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN'): Promise<VisitProtocol[]> {
    const response = await apiClient.post<VisitProtocol[]>(
      `/api/v1/visits/${visitId}/protocols/generate?stage=${stage}`
    );
    return response.data;
  }
}

export const protocolsApi = new ProtocolsApi();
