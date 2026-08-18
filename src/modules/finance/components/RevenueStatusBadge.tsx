import React from 'react';
import styled from 'styled-components';
import type { KsefRevenueStatus } from '../types';

const Badge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg};
  white-space: nowrap;
`;

const STATUS: Record<KsefRevenueStatus, { label: string; bg: string; fg: string; title?: string }> = {
  PENDING:      { label: 'Oczekuje',      bg: '#f1f5f9', fg: '#475569' },
  SENDING:      { label: 'Wysyłanie...',  bg: '#eff6ff', fg: '#1d4ed8' },
  SUBMITTED:    { label: 'Przetwarzanie', bg: '#eff6ff', fg: '#1d4ed8', title: 'Przyjęta do sesji KSeF, oczekuje na numer' },
  ACCEPTED:     { label: 'W KSeF',        bg: '#f0fdf4', fg: '#15803d' },
  REJECTED:     { label: 'Odrzucona',     bg: '#fef2f2', fg: '#dc2626' },
  QUEUED_RETRY: { label: 'Offline24',     bg: '#fffbeb', fg: '#b45309', title: 'KSeF niedostępny: faktura zostanie dosłana automatycznie' },
};

/** Status wysyłki faktury do KSeF, używany w szczegółach faktury. */
export const RevenueStatusBadge: React.FC<{ status: KsefRevenueStatus }> = ({ status }) => {
  const cfg = STATUS[status];
  return <Badge $bg={cfg.bg} $fg={cfg.fg} title={cfg.title}>{cfg.label}</Badge>;
};
