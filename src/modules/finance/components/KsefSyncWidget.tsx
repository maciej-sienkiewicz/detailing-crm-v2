import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useKsefSyncStatus, useTriggerKsefSync } from '../hooks/useKsef';
import { formatDate } from '../utils/formatters';
import type { KsefSyncStatusValue } from '../types';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Widget = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-wrap: wrap;
`;

const StatusDot = styled.span<{ $status: KsefSyncStatusValue }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${(p) => {
    switch (p.$status) {
      case 'SUCCESS':      return '#10b981';
      case 'RUNNING':      return '#3b82f6';
      case 'FAILED':       return '#ef4444';
      case 'NEVER_SYNCED': return '#94a3b8';
    }
  }};
`;

const StatusText = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${(p) => p.theme.colors.textSecondary};
  white-space: nowrap;
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Spacer = styled.div`
  flex: 1;
`;

const SyncBtn = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 6px;
  background: ${(p) => p.theme.colors.surface};
  color: ${(p) => (p.$loading ? p.theme.colors.textMuted : p.theme.colors.text)};
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.surfaceHover};
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &:disabled { opacity: 0.55; }
`;

const SpinnerIcon = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const syncStatusLabel = (status: KsefSyncStatusValue): string => {
  switch (status) {
    case 'SUCCESS':      return 'Synchronizacja OK';
    case 'RUNNING':      return 'Synchronizacja trwa…';
    case 'FAILED':       return 'Błąd synchronizacji';
    case 'NEVER_SYNCED': return 'Nigdy nie synchronizowano';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const KsefSyncWidget: React.FC = () => {
  const { syncStatus, isLoading } = useKsefSyncStatus();
  const triggerSync = useTriggerKsefSync();

  const handleSync = async () => {
    try {
      await triggerSync.mutateAsync();
    } catch {
      // error is visible via syncStatus.lastError
    }
  };

  if (isLoading || !syncStatus) {
    return (
      <Widget>
        <StatusDot $status="NEVER_SYNCED" />
        <StatusText>Ładowanie statusu synchronizacji…</StatusText>
      </Widget>
    );
  }

  return (
    <Widget>
      <StatusDot $status={triggerSync.isPending ? 'RUNNING' : syncStatus.syncStatus} />
      <StatusText>
        {triggerSync.isPending ? 'Synchronizacja trwa…' : syncStatusLabel(syncStatus.syncStatus)}
      </StatusText>
      {syncStatus.lastExpenseSync && !triggerSync.isPending && (
        <StatusText style={{ opacity: 0.6 }}>
          · ostatnia: {formatDate(syncStatus.lastExpenseSync)}
        </StatusText>
      )}
      {syncStatus.syncStatus === 'FAILED' && syncStatus.lastError && (
        <ErrorText title={syncStatus.lastError}>
          {syncStatus.lastError}
        </ErrorText>
      )}
      <Spacer />
      <SyncBtn
        onClick={handleSync}
        disabled={triggerSync.isPending}
        $loading={triggerSync.isPending}
        title="Synchronizuj faktury z KSeF teraz"
      >
        {triggerSync.isPending ? <SpinnerIcon /> : <RefreshIcon />}
        {triggerSync.isPending ? 'Synchronizuję…' : 'Synchronizuj teraz'}
      </SyncBtn>
    </Widget>
  );
};
