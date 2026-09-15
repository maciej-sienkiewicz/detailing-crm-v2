import React from 'react';
import styled from 'styled-components';
import { useKsefSyncStatus } from '../hooks/useKsef';

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Ostrzeżenie o niekompletnej liście dokumentów - i nic poza tym.
 *
 * Wcześniej stał tu stały pasek statusu: zielona kropka, „Synchronizacja OK",
 * data ostatniego przebiegu i przycisk „Synchronizuj teraz". Trzy czwarte tego
 * paska to była obsługa systemu wstawiona w widok dokumentów, a po wyjęciu daty
 * i przycisku zostawał pusty pas z jednym słowem - chrom bez treści.
 *
 * Stan zdrowej synchronizacji nie jest informacją: nikt nie wchodzi na listę
 * faktur, żeby dowiedzieć się, że wszystko działa. Informacją jest dopiero jej
 * brak, bo wtedy lista, którą właśnie czytasz, może nie zawierać wszystkich
 * faktur - i to jedno zdanie ten komponent mówi. Przy zdrowym stanie nie
 * renderuje niczego, więc nad tabelą nie zostaje po nim ślad.
 */
const Banner = styled.div<{ $tone: 'warning' | 'danger' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  background: ${(p) => (p.$tone === 'danger' ? '#fef2f2' : '#fffbeb')};
  border-bottom: 1px solid ${(p) => (p.$tone === 'danger' ? '#fecaca' : '#fde68a')};
  color: ${(p) => (p.$tone === 'danger' ? '#991b1b' : '#92400e')};

  @media (max-width: 639px) {
    padding: 10px 14px;
  }
`;

const IconSlot = styled.span`
  display: flex;
  flex-shrink: 0;
  margin-top: 1px;
`;

const Message = styled.div`
  font-size: 12px;
  line-height: 1.45;
  min-width: 0;

  strong {
    font-weight: 600;
  }
`;

/** Treść błędu z KSeF: techniczna, więc w drugim planie i skrócona do jednej linii. */
const Detail = styled.span`
  display: block;
  margin-top: 2px;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const KsefSyncWidget: React.FC = () => {
  const { syncStatus, isLoading } = useKsefSyncStatus();

  // Cisza przy zdrowym stanie: OK, trwająca synchronizacja i jeszcze nieznany stan
  // nie zmieniają tego, co użytkownik ma zrobić z listą.
  if (isLoading || !syncStatus) return null;
  if (syncStatus.syncStatus === 'SUCCESS' || syncStatus.syncStatus === 'RUNNING') return null;

  const failed = syncStatus.syncStatus === 'FAILED';

  return (
    <Banner $tone={failed ? 'danger' : 'warning'} role="status">
      <IconSlot><AlertIcon /></IconSlot>
      <Message>
        {failed ? (
          <>
            <strong>Synchronizacja z KSeF nie powiodła się.</strong>{' '}
            Lista może nie zawierać najnowszych faktur.
            {syncStatus.lastError && (
              <Detail title={syncStatus.lastError}>{syncStatus.lastError}</Detail>
            )}
          </>
        ) : (
          <>
            <strong>Nie pobrano jeszcze faktur z KSeF.</strong>{' '}
            Widać tu wyłącznie dokumenty dodane w CRM - sprawdź dane dostępowe KSeF w Ustawieniach.
          </>
        )}
      </Message>
    </Banner>
  );
};
