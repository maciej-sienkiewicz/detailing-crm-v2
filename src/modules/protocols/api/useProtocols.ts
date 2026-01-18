import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolsApi } from './protocolsApi';
import type {
  CreateProtocolTemplateDto,
  UpdateProtocolTemplateDto,
  CreateProtocolRuleDto,
  SignProtocolDto,
} from '../types';

// Query Keys
export const protocolQueryKeys = {
  all: ['protocols'] as const,
  templates: () => [...protocolQueryKeys.all, 'templates'] as const,
  template: (id: string) => [...protocolQueryKeys.templates(), id] as const,
  rules: () => [...protocolQueryKeys.all, 'rules'] as const,
  rule: (id: string) => [...protocolQueryKeys.rules(), id] as const,
  rulesByStage: (stage: string) => [...protocolQueryKeys.rules(), 'stage', stage] as const,
  rulesByService: (serviceId: string) => [...protocolQueryKeys.rules(), 'service', serviceId] as const,
  visitProtocols: (visitId: string) => [...protocolQueryKeys.all, 'visit', visitId] as const,
};

// Protocol Templates Hooks
export function useProtocolTemplates() {
  return useQuery({
    queryKey: protocolQueryKeys.templates(),
    queryFn: () => protocolsApi.getProtocolTemplates(),
  });
}

export function useProtocolTemplate(id: string) {
  return useQuery({
    queryKey: protocolQueryKeys.template(id),
    queryFn: () => protocolsApi.getProtocolTemplate(id),
    enabled: !!id,
  });
}

export function useCreateProtocolTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, file }: { data: CreateProtocolTemplateDto; file?: File }) =>
      protocolsApi.createProtocolTemplate(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.templates() });
    },
  });
}

export function useUpdateProtocolTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProtocolTemplateDto }) =>
      protocolsApi.updateProtocolTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.templates() });
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.template(variables.id) });
    },
  });
}

export function useDeleteProtocolTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => protocolsApi.deleteProtocolTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.templates() });
    },
  });
}

// Protocol Rules Hooks
export function useProtocolRules() {
  return useQuery({
    queryKey: protocolQueryKeys.rules(),
    queryFn: () => protocolsApi.getProtocolRules(),
  });
}

export function useProtocolRulesByStage(stage: 'CHECK_IN' | 'CHECK_OUT') {
  return useQuery({
    queryKey: protocolQueryKeys.rulesByStage(stage),
    queryFn: () => protocolsApi.getProtocolRulesByStage(stage),
  });
}

export function useProtocolRulesByService(serviceId: string) {
  return useQuery({
    queryKey: protocolQueryKeys.rulesByService(serviceId),
    queryFn: () => protocolsApi.getProtocolRulesByService(serviceId),
    enabled: !!serviceId,
  });
}

export function useCreateProtocolRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProtocolRuleDto) => protocolsApi.createProtocolRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.rules() });
    },
  });
}

// Note: Backend does not support updating, deleting, or reordering protocol rules
// Create new rules instead of modifying existing ones

// Visit Protocols Hooks
export function useVisitProtocols(visitId: string) {
  return useQuery({
    queryKey: protocolQueryKeys.visitProtocols(visitId),
    queryFn: () => protocolsApi.getVisitProtocols(visitId),
    enabled: !!visitId,
  });
}

export function useSignVisitProtocol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, protocolId, data }: { visitId: string; protocolId: string; data: SignProtocolDto }) =>
      protocolsApi.signVisitProtocol(visitId, protocolId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.visitProtocols(variables.visitId) });
    },
  });
}

export function useGenerateVisitProtocols() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, stage }: { visitId: string; stage?: 'CHECK_IN' | 'CHECK_OUT' }) =>
      protocolsApi.generateVisitProtocols(visitId, stage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: protocolQueryKeys.visitProtocols(variables.visitId) });
    },
  });
}
