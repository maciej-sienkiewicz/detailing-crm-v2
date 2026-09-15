import React from 'react';
import styled from 'styled-components';
import { useKsefSyncStatus } from '../hooks/useKsef';
import type { KsefSyncStatusValue } from '../types';

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Pasek stanu synchronizacji z KSeF nad listą dokumentów.
 *
 * Mówi wyłącznie o tym, czy lista jest kompletna. Data ostatniej synchronizacji
 * i ręczne „Synchronizuj teraz" zniknęły świadomie: synchronizacja chodzi
 * automatycznie, więc obie rzeczy były obsługą systemu wstawioną w widok
 * dokumentów - nie odpowiadały na żadne pytanie księgowej, a zabierały uwagę
 * i miejsce nad tabelą. Zostaje sygnał, który faktycznie zmienia decyzję:
 * kiedy synchronizacja się nie udała, na liście może brakować faktur.
 */
const Widget = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-wrap: wrap;

  /* Telefon: stan integracji to sprawa obsługi systemu, nie przeglądania
     dokumentów - pasek znika i oddaje miejsce liście. */
  @media (max-width: 639px) {
    display: none;
  }
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const syncStatusLabel = (status: KsefSyncStatusValue): string => {
  switch (status) {
    case 'SUCCESS':      return 'Synchronizacja OK';
    case 'RUNNING':      return 'Synchronizacja trwa...';
    case 'FAILED':       return 'Błąd synchronizacji';
    case 'NEVER_SYNCED': return 'Nigdy nie synchronizowano';
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const KsefSyncWidget: React.FC = () => {
  const { syncStatus, isLoading } = useKsefSyncStatus();

  if (isLoading || !syncStatus) {
    return (
      <Widget>
        <StatusDot $status="NEVER_SYNCED" />
        <StatusText>Ładowanie statusu synchronizacji...</StatusText>
      </Widget>
    );
  }

  return (
    <Widget>
      <StatusDot $status={syncStatus.syncStatus} />
      <StatusText>{syncStatusLabel(syncStatus.syncStatus)}</StatusText>
      {syncStatus.syncStatus === 'FAILED' && syncStatus.lastError && (
        <ErrorText title={syncStatus.lastError}>
          {syncStatus.lastError}
        </ErrorText>
      )}
    </Widget>
  );
};
