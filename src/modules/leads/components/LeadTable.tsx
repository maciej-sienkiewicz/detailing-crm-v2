// src/modules/leads/components/LeadTable.tsx
import React, { useState, useRef, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { t } from '@/common/i18n';
import type { Lead } from '../types';
import { LeadSource, LeadStatus } from '../types';
import { useUpdateLeadStatus, useUpdateLeadValue } from '../hooks/useLeads';
import {
  formatCurrency,
  formatPhoneNumber,
  truncateEmail,
  formatRelativeTime,
} from '../utils/formatters';

// ============================================================================
// ANIMATIONS
// ============================================================================

const subtlePulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// ============================================================================
// TABLE STRUCTURE
// ============================================================================

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const Table = styled.table`
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.radii.lg};
  overflow: hidden;
`;

const TableHead = styled.thead`
  background: ${props => props.theme.colors.surfaceAlt};
`;

const TableHeaderCell = styled.th<{ $align?: 'left' | 'right' | 'center'; $width?: string }>`
  padding: ${props => props.theme.spacing.md};
  text-align: ${props => props.$align || 'left'};
  font-size: ${props => props.theme.fontSizes.xs};
  font-weight: 600;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  width: ${props => props.$width || 'auto'};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $isNew?: boolean; $requiresVerification?: boolean }>`
  border-bottom: 1px solid ${props => props.theme.colors.border};
  transition: background-color 0.15s ease;
  cursor: pointer;
  animation: ${fadeIn} 0.3s ease-out;

  ${props => props.$isNew && css`
    background: linear-gradient(90deg,
      rgba(239, 68, 68, 0.04) 0%,
      transparent 100%);
  `}

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};

    .actions-cell {
      opacity: 1;
    }
  }
`;

const TableCell = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.text};
  vertical-align: middle;
  text-align: ${props => props.$align || 'left'};
`;

// ============================================================================
// STATUS & INDICATOR COMPONENTS
// ============================================================================

const IndicatorCell = styled(TableCell)`
  width: 52px;
  padding-right: 0;
`;

const IndicatorWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PriorityDot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$active ? '#ef4444' : 'transparent'};
  flex-shrink: 0;

  ${props => props.$active && css`
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    animation: ${subtlePulse} 2s ease-in-out infinite;
  `}
`;

const SourceIcon = styled.div<{ $source: LeadSource }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${props => props.theme.radii.md};
  flex-shrink: 0;

  ${props => {
    switch (props.$source) {
      case LeadSource.PHONE:
        return css`
          background: #dcfce7;
          color: #16a34a;
        `;
      case LeadSource.EMAIL:
        return css`
          background: #dbeafe;
          color: #2563eb;
        `;
      default:
        return css`
          background: #f3e8ff;
          color: #7c3aed;
        `;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
  }
`;

// ============================================================================
// CONTACT CELL
// ============================================================================

const ContactCell = styled(TableCell)`
  min-width: 180px;
`;

const CellStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PrimaryText = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const SecondaryText = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
`;

// ============================================================================
// VALUE CELL (MONOSPACE)
// ============================================================================

const ValueCell = styled(TableCell)`
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: 500;
  font-feature-settings: 'tnum';
  white-space: nowrap;
`;

const ValueDisplay = styled.span<{ $isEditing?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${props => props.theme.radii.sm};
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    background: ${props => props.theme.colors.surfaceAlt};
  }
`;

const ValueInput = styled.input`
  width: 100px;
  padding: 4px 8px;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: 500;
  text-align: right;
  border: 2px solid var(--brand-primary);
  border-radius: ${props => props.theme.radii.sm};
  outline: none;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};

  &:focus {
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
  }
`;

// ============================================================================
// STATUS BADGE
// ============================================================================

const StatusWrapper = styled.div`
  position: relative;
`;

const StatusBadge = styled.button<{ $status: LeadStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: ${props => props.theme.radii.full};
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;

  ${props => {
    switch (props.$status) {
      case LeadStatus.PENDING:
        return css`
          background: #fef3c7;
          color: #92400e;
          border-color: #fcd34d;
        `;
      case LeadStatus.IN_PROGRESS:
        return css`
          background: #dbeafe;
          color: #1e40af;
          border-color: #93c5fd;
        `;
      case LeadStatus.CONVERTED:
        return css`
          background: #dcfce7;
          color: #166534;
          border-color: #86efac;
        `;
      case LeadStatus.ABANDONED:
        return css`
          background: #f3f4f6;
          color: #4b5563;
          border-color: #d1d5db;
        `;
      default:
        return '';
    }
  }}

  &:hover {
    filter: brightness(0.95);
    transform: scale(1.02);
  }
`;

const StatusDropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  min-width: 140px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  box-shadow: ${props => props.theme.shadows.lg};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.15s ease;
`;

const StatusOption = styled.button<{ $isActive: boolean }>`
  display: block;
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  text-align: left;
  font-size: ${props => props.theme.fontSizes.sm};
  border: none;
  background: ${props => props.$isActive ? props.theme.colors.surfaceAlt : 'transparent'};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: background 0.1s ease;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }

  &:first-child {
    border-radius: ${props => props.theme.radii.md} ${props => props.theme.radii.md} 0 0;
  }

  &:last-child {
    border-radius: 0 0 ${props => props.theme.radii.md} ${props => props.theme.radii.md};
  }
`;

// ============================================================================
// NOTE CELL
// ============================================================================

const NoteText = styled.span`
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.sm};
`;

// ============================================================================
// ACTIONS CELL
// ============================================================================

const ActionsCell = styled(TableCell)`
  width: 80px;
  text-align: right;
  opacity: 0;
  transition: opacity 0.15s ease;
`;

const ActionButton = styled.button`
  padding: 6px 10px;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  font-size: ${props => props.theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
  }
`;

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xxl};
  color: ${props => props.theme.colors.textMuted};
`;

const EmptyTitle = styled.p`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: 500;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const EmptyDescription = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
`;

// ============================================================================
// LOADING STATE
// ============================================================================

const LoadingRow = styled.tr`
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const LoadingCell = styled.td`
  padding: ${props => props.theme.spacing.md};
`;

const Skeleton = styled.div<{ $width?: string; $height?: string }>`
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '16px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
`;

// ============================================================================
// ICONS
// ============================================================================

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const ManualIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ============================================================================
// STATUS LABELS
// ============================================================================

const statusLabels: Record<LeadStatus, string> = {
  [LeadStatus.PENDING]: t.leads?.status?.pending || 'Nowy',
  [LeadStatus.IN_PROGRESS]: t.leads?.status?.inProgress || 'W kontakcie',
  [LeadStatus.CONVERTED]: t.leads?.status?.converted || 'Zrealizowany',
  [LeadStatus.ABANDONED]: t.leads?.status?.abandoned || 'Odpuszczony',
};

const allStatuses: LeadStatus[] = [LeadStatus.PENDING, LeadStatus.IN_PROGRESS, LeadStatus.CONVERTED, LeadStatus.ABANDONED];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getSourceIcon = (source: LeadSource) => {
  switch (source) {
    case LeadSource.PHONE:
      return <PhoneIcon />;
    case LeadSource.EMAIL:
      return <EmailIcon />;
    default:
      return <ManualIcon />;
  }
};

const formatContact = (lead: Lead): { primary: string; secondary?: string } => {
  if (lead.customerName) {
    const isPhone = !lead.contactIdentifier.includes('@');
    return {
      primary: lead.customerName,
      secondary: isPhone
        ? formatPhoneNumber(lead.contactIdentifier)
        : truncateEmail(lead.contactIdentifier, 30),
    };
  }

  const isPhone = !lead.contactIdentifier.includes('@');
  return {
    primary: isPhone
      ? formatPhoneNumber(lead.contactIdentifier)
      : truncateEmail(lead.contactIdentifier, 30),
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface LeadTableProps {
  leads: Lead[];
  isLoading?: boolean;
  onRowClick?: (lead: Lead) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads, isLoading, onRowClick }) => {
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState('');
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  const valueInputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const updateStatus = useUpdateLeadStatus();
  const updateValue = useUpdateLeadValue();

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing value
  useEffect(() => {
    if (editingValueId && valueInputRef.current) {
      valueInputRef.current.focus();
      valueInputRef.current.select();
    }
  }, [editingValueId]);

  const handleValueEdit = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingValueId(lead.id);
    setValueInput(String(lead.estimatedValue / 100));
  };

  const handleValueSave = (leadId: string) => {
    const newValue = Math.round(parseFloat(valueInput) * 100);
    if (!isNaN(newValue) && newValue >= 0) {
      updateValue.mutate({ id: leadId, estimatedValue: newValue });
    }
    setEditingValueId(null);
  };

  const handleValueKeyDown = (e: React.KeyboardEvent, leadId: string) => {
    if (e.key === 'Enter') {
      handleValueSave(leadId);
    } else if (e.key === 'Escape') {
      setEditingValueId(null);
    }
  };

  const handleStatusClick = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenStatusId(openStatusId === leadId ? null : leadId);
  };

  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    updateStatus.mutate({ id: leadId, status });
    setOpenStatusId(null);
  };

  const handleRowClick = (lead: Lead) => {
    if (editingValueId || openStatusId) return;
    onRowClick?.(lead);
  };

  // Loading state
  if (isLoading) {
    return (
      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell $width="52px"></TableHeaderCell>
              <TableHeaderCell>Kontakt</TableHeaderCell>
              <TableHeaderCell $align="right">Wartość</TableHeaderCell>
              <TableHeaderCell>Aktywność</TableHeaderCell>
              <TableHeaderCell>Notatka</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell $width="80px"></TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingRow key={i}>
                <LoadingCell><Skeleton $width="28px" $height="28px" /></LoadingCell>
                <LoadingCell><Skeleton $width="140px" /></LoadingCell>
                <LoadingCell><Skeleton $width="80px" /></LoadingCell>
                <LoadingCell><Skeleton $width="60px" /></LoadingCell>
                <LoadingCell><Skeleton $width="160px" /></LoadingCell>
                <LoadingCell><Skeleton $width="90px" $height="24px" /></LoadingCell>
                <LoadingCell><Skeleton $width="50px" /></LoadingCell>
              </LoadingRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    );
  }

  // Empty state
  if (leads.length === 0) {
    return (
      <EmptyState>
        <EmptyTitle>{t.leads?.empty?.title || 'Brak leadów'}</EmptyTitle>
        <EmptyDescription>
          {t.leads?.empty?.description || 'Nowe leady pojawią się tutaj automatycznie'}
        </EmptyDescription>
      </EmptyState>
    );
  }

  return (
    <TableWrapper>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell $width="52px"></TableHeaderCell>
            <TableHeaderCell>{t.leads?.fields?.contact || 'Kontakt'}</TableHeaderCell>
            <TableHeaderCell $align="right">{t.leads?.fields?.estimatedValue || 'Wartość'}</TableHeaderCell>
            <TableHeaderCell>Aktywność</TableHeaderCell>
            <TableHeaderCell>Notatka</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell $width="80px"></TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {leads.map((lead) => {
            const contact = formatContact(lead);
            const isNew = lead.requiresVerification && lead.status === LeadStatus.PENDING;

            return (
              <TableRow
                key={lead.id}
                $isNew={isNew}
                $requiresVerification={lead.requiresVerification}
                onClick={() => handleRowClick(lead)}
              >
                {/* Indicator */}
                <IndicatorCell>
                  <IndicatorWrapper>
                    <PriorityDot $active={isNew} />
                    <SourceIcon $source={lead.source}>
                      {getSourceIcon(lead.source)}
                    </SourceIcon>
                  </IndicatorWrapper>
                </IndicatorCell>

                {/* Contact */}
                <ContactCell>
                  <CellStack>
                    <PrimaryText>{contact.primary}</PrimaryText>
                    {contact.secondary && (
                      <SecondaryText>{contact.secondary}</SecondaryText>
                    )}
                  </CellStack>
                </ContactCell>

                {/* Value */}
                <ValueCell $align="right">
                  {editingValueId === lead.id ? (
                    <ValueInput
                      ref={valueInputRef}
                      type="number"
                      value={valueInput}
                      onChange={(e) => setValueInput(e.target.value)}
                      onBlur={() => handleValueSave(lead.id)}
                      onKeyDown={(e) => handleValueKeyDown(e, lead.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <ValueDisplay onClick={(e) => handleValueEdit(lead, e)}>
                      {formatCurrency(lead.estimatedValue)}
                    </ValueDisplay>
                  )}
                </ValueCell>

                {/* Last Activity */}
                <TableCell>
                  <SecondaryText>
                    {formatRelativeTime(lead.updatedAt || lead.createdAt)}
                  </SecondaryText>
                </TableCell>

                {/* Note */}
                <TableCell>
                  <NoteText title={lead.initialMessage}>
                    {lead.initialMessage || '—'}
                  </NoteText>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusWrapper ref={openStatusId === lead.id ? statusRef : null}>
                    <StatusBadge
                      $status={lead.status}
                      onClick={(e) => handleStatusClick(lead.id, e)}
                    >
                      {statusLabels[lead.status]}
                      <ChevronIcon />
                    </StatusBadge>
                    <StatusDropdown $isOpen={openStatusId === lead.id}>
                      {allStatuses.map((status) => (
                        <StatusOption
                          key={status}
                          $isActive={lead.status === status}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, status);
                          }}
                        >
                          {statusLabels[status]}
                        </StatusOption>
                      ))}
                    </StatusDropdown>
                  </StatusWrapper>
                </TableCell>

                {/* Actions */}
                <ActionsCell className="actions-cell">
                  <ActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick?.(lead);
                    }}
                  >
                    Edytuj
                  </ActionButton>
                </ActionsCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableWrapper>
  );
};
