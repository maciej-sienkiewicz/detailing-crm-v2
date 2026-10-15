import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSenderNameConfig,
  updateSenderName,
  signSenderNameAuthDoc,
  uploadSenderNameAuthDoc,
  fetchSenderNameDocumentUrl,
} from '../api/smsSettingsApi';

const SENDER_NAME_KEY = ['sms-sender-name'] as const;

export function useSenderNameConfig() {
  const { data, isLoading } = useQuery({
    queryKey: SENDER_NAME_KEY,
    queryFn: fetchSenderNameConfig,
  });
  return { config: data ?? null, isLoading };
}

export function useUpdateSenderName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateSenderName(name),
    onSuccess: (updated) => qc.setQueryData(SENDER_NAME_KEY, updated),
  });
}

export function useSignSenderNameAuthDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signatureImageBase64: string) => signSenderNameAuthDoc(signatureImageBase64),
    onSuccess: (updated) => qc.setQueryData(SENDER_NAME_KEY, updated),
  });
}

export function useUploadSenderNameAuthDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadSenderNameAuthDoc(file),
    onSuccess: (updated) => qc.setQueryData(SENDER_NAME_KEY, updated),
  });
}

export function useSenderNameDocumentUrl() {
  return useMutation({
    mutationFn: () => fetchSenderNameDocumentUrl(),
  });
}
