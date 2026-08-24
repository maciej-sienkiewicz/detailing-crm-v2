import axios from 'axios';
import { apiClient } from '../../../core/apiClient';
import type {
  ProtocolTemplate,
  ProtocolTemplateVerification,
  ProtocolRule,
  VisitProtocol,
  CreateProtocolTemplateDto,
  UpdateProtocolTemplateDto,
  CreateProtocolRuleDto,
  SignProtocolDto,
} from '../types';

export interface CreateProtocolTemplateResult {
  template: ProtocolTemplate;
  /** Wynik weryfikacji pól: obecny, gdy plik został wgrany. */
  verification?: ProtocolTemplateVerification;
}

class ProtocolsApi {
  // Protocol Templates
  async getProtocolTemplates(): Promise<ProtocolTemplate[]> {
    const response = await apiClient.get<ProtocolTemplate[]>('/v1/protocol-templates');
    return response.data;
  }

  async getProtocolTemplate(id: string): Promise<ProtocolTemplate> {
    const response = await apiClient.get<ProtocolTemplate>(`/v1/protocol-templates/${id}`);
    return response.data;
  }

  async createProtocolTemplate(data: CreateProtocolTemplateDto, file?: File): Promise<CreateProtocolTemplateResult> {
    // Step 1: Create template and get presigned upload URL (format-aware)
    const response = await apiClient.post<ProtocolTemplate>('/v1/protocol-templates', data);
    const template = response.data;

    if (!file || !template.templateUrl) {
      return { template };
    }

    // Step 2: Upload file to S3. The presigned URL is signed for the declared
    // content type, so send the canonical one for the chosen format.
    const contentType = data.fileFormat === 'HTML' ? 'text/html' : 'application/pdf';
    try {
      await axios.put(template.templateUrl, file, {
        headers: {
          'Content-Type': contentType,
        },
      });
    } catch (uploadError) {
      // CRITICAL: If upload fails, delete the template to prevent orphaned records
      // This is a temporary frontend solution. Ideally, backend should handle this
      // via a two-phase commit (uploadConfirmed flag + cleanup job).
      try {
        await this.deleteProtocolTemplate(template.id);
      } catch {
        // TODO: handled error silently
      }
      // Re-throw the original upload error
      throw new Error(`Upload pliku nie powiódł się: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    // Step 3: Verify the uploaded file contains every field required by the
    // visit pipeline. The verdict (VERIFIED/REJECTED) is persisted backend-side.
    const verification = await this.verifyProtocolTemplate(template.id);
    return {
      template: { ...template, verificationStatus: verification.verificationStatus },
      verification,
    };
  }

  async verifyProtocolTemplate(id: string): Promise<ProtocolTemplateVerification> {
    const response = await apiClient.post<ProtocolTemplateVerification>(
      `/v1/protocol-templates/${id}/verify`
    );
    return response.data;
  }

  async updateProtocolTemplate(id: string, data: UpdateProtocolTemplateDto): Promise<ProtocolTemplate> {
    const response = await apiClient.patch<ProtocolTemplate>(`/v1/protocol-templates/${id}`, data);
    return response.data;
  }

  async deleteProtocolTemplate(id: string): Promise<void> {
    await apiClient.delete(`/v1/protocol-templates/${id}`);
  }

  // Protocol Rules
  async getProtocolRules(): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>('/v1/protocol-rules');
    return response.data;
  }

  async getProtocolRulesByStage(stage: 'CHECK_IN' | 'CHECK_OUT'): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>(`/v1/protocol-rules?stage=${stage}`);
    return response.data;
  }

  async getProtocolRulesByService(serviceId: string): Promise<ProtocolRule[]> {
    const response = await apiClient.get<ProtocolRule[]>(`/v1/protocol-rules?serviceId=${serviceId}`);
    return response.data;
  }

  async createProtocolRule(data: CreateProtocolRuleDto): Promise<ProtocolRule> {
    const response = await apiClient.post<ProtocolRule>('/v1/protocol-rules', data);
    return response.data;
  }

  async updateProtocolRule(id: string, data: Partial<CreateProtocolRuleDto>): Promise<ProtocolRule> {
    const response = await apiClient.patch<ProtocolRule>(`/v1/protocol-rules/${id}`, data);
    return response.data;
  }

  async deleteProtocolRule(id: string): Promise<void> {
    await apiClient.delete(`/v1/protocol-rules/${id}`);
  }

  // Visit Protocols
  async getVisitProtocols(visitId: string): Promise<VisitProtocol[]> {
    const response = await apiClient.get<VisitProtocol[]>(`/v1/visits/${visitId}/protocols`);
    return response.data;
  }

  async signVisitProtocol(visitId: string, protocolId: string, data: SignProtocolDto): Promise<VisitProtocol> {
    const response = await apiClient.post<VisitProtocol>(
      `/v1/visits/${visitId}/protocols/${protocolId}/sign`,
      data
    );
    return response.data;
  }

  /**
   * Zgodność stanu wizualnego przy wydaniu: odpowiedź pracownika trafia na
   * protokół, zanim dokument pojedzie do podpisu — klient ma zobaczyć na ekranie
   * dokładnie to, co zostało zaznaczone.
   */
  async setVisualCondition(
    visitId: string,
    protocolId: string,
    payload: { conditionMatch: boolean; remarks?: string | null }
  ): Promise<VisitProtocol> {
    const response = await apiClient.post<VisitProtocol>(
      `/v1/visits/${visitId}/protocols/${protocolId}/visual-condition`,
      payload
    );
    return response.data;
  }

  async generateVisitProtocols(visitId: string, stage: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN'): Promise<VisitProtocol[]> {
    const response = await apiClient.post<VisitProtocol[]>(
      `/v1/visits/${visitId}/protocols/generate?stage=${stage}`
    );
    return response.data;
  }
}

export const protocolsApi = new ProtocolsApi();
