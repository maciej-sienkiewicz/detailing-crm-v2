// src/modules/leads/components/LeadInbox.tsx
import React, { useState, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { t } from '@/common/i18n';
import type { Lead, LeadStatus } from '../types';
import { LeadSource } from '../types';
import {
  formatCurrency,
  formatContactIdentifier,
  formatRelativeTime,
} from '../utils/formatters';
import { useUpdateLeadStatus, useUpdateLeadValue } from '../hooks/useLeads';

// Icons
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// Animations
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
`;

const LeadCard = styled.div<{ $requiresVerification: boolean; $isNew: boolean }>`
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.$requiresVerification ? '#fca5a5' : props.theme.colors.border};
  border-radius: ${props => props.theme.radii.lg};
  padding: ${props => props.theme.spacing.md};
  transition: all ${props => props.theme.transitions.normal};
  animation: ${fadeIn} 0.3s ease-out;

  ${props => props.$requiresVerification && css`
    background: linear-gradient(to right, #fef2f2, ${props.theme.colors.surface});
    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.1);
  `}

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
    transform: translateY(-2px);
  }

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
  }
`;

const SourceIconWrapper = styled.div<{ $source: LeadSource }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${props => props.theme.radii.md};
  flex-shrink: 0;

  ${props => {
    switch (props.$source) {
      case LeadSource.PHONE:
        return css`
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #16a34a;
        `;
      case LeadSource.EMAIL:
        return css`
          background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
          color: #0284c7;
        `;
      default:
        return css`
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          color: #7c3aed;
        `;
    }
  }}
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ContactIdentifier = styled.span`
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: ${props => props.theme.fontWeights.semibold};
  color: ${props => props.theme.colors.text};
`;

const CustomerName = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const InitialMessage = styled.p`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textMuted};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 400px;
`;

const BadgeContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
  align-items: center;
  margin-left: auto;

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    margin-left: 0;
    margin-top: ${props => props.theme.spacing.sm};
  }
`;

const NewBadge = styled.span<{ $animate: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: ${props => props.theme.fontWeights.bold};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #dc2626;
  color: white;
  border-radius: ${props => props.theme.radii.full};

  ${props => props.$animate && css`
    animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  `}
`;

const ValueBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.bold};
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-radius: ${props => props.theme.radii.md};
  border: 1px solid #fcd34d;
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};

  &:hover {
    transform: scale(1.05);
    box-shadow: ${props => props.theme.shadows.sm};
  }
`;

const StatusDropdown = styled.div`
  position: relative;
  display: inline-block;
`;

const StatusButton = styled.button<{ $status: LeadStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  border-radius: ${props => props.theme.radii.md};
  border: 1px solid transparent;
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};

  ${props => {
    switch (props.$status) {
      case 'IN_PROGRESS':
        return css`
          background: #dbeafe;
          color: #1e40af;
          border-color: #93c5fd;
        `;
      case 'CONVERTED':
        return css`
          background: #dcfce7;
          color: #166534;
          border-color: #86efac;
        `;
      case 'ABANDONED':
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
  }
`;

const StatusMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  box-shadow: ${props => props.theme.shadows.lg};
  z-index: 100;
  min-width: 150px;
  display: ${props => props.$isOpen ? 'block' : 'none'};
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
  transition: background ${props => props.theme.transitions.fast};

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

const Timestamp = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
  white-space: nowrap;
`;

const MobileRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.sm};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    display: none;
  }
`;

const DesktopActions = styled.div`
  display: none;

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const ValueEditInput = styled.input`
  width: 100px;
  padding: 6px 10px;
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  border: 2px solid var(--brand-primary);
  border-radius: ${props => props.theme.radii.md};
  text-align: right;
  outline: none;

  &:focus {
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xxl};
  color: ${props => props.theme.colors.textMuted};
`;

// Status labels
const statusLabels: Record<LeadStatus, string> = {
  IN_PROGRESS: 'W kontakcie',
  CONVERTED: 'Zrealizowany',
  ABANDONED: 'Odpuszczony',
};

const sourceLabels: Record<LeadSource, string> = {
  PHONE: 'Telefon',
  EMAIL: 'E-mail',
  MANUAL: 'Ręczne',
};

interface LeadInboxProps {
  leads: Lead[];
  isLoading?: boolean;
  onLeadClick?: (lead: Lead) => void;
}

interface LeadCardItemProps {
  lead: Lead;
  onLeadClick?: (lead: Lead) => void;
}

const LeadCardItem: React.FC<LeadCardItemProps> = ({ lead, onLeadClick }) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState('');

  const updateStatus = useUpdateLeadStatus();
  const updateValue = useUpdateLeadValue();

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatusMenuOpen(false);
    updateStatus.mutate({ id: lead.id, status: newStatus });
  };

  const handleValueEdit = () => {
    setValueInput(String(lead.estimatedValue / 100));
    setEditingValue(true);
  };

  const handleValueSave = () => {
    const newValue = Math.round(parseFloat(valueInput) * 100);
    if (!isNaN(newValue) && newValue >= 0) {
      updateValue.mutate({ id: lead.id, estimatedValue: newValue });
    }
    setEditingValue(false);
  };

  const handleValueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValueSave();
    } else if (e.key === 'Escape') {
      setEditingValue(false);
    }
  };

  const SourceIcon = {
    [LeadSource.PHONE]: PhoneIcon,
    [LeadSource.EMAIL]: EmailIcon,
    [LeadSource.MANUAL]: ManualIcon,
  }[lead.source];

  const formattedContact = formatContactIdentifier(lead.contactIdentifier);
  const formattedValue = formatCurrency(lead.estimatedValue);
  const relativeTime = formatRelativeTime(lead.createdAt);

  // Determine if animation should be active
  const shouldAnimate = lead.requiresVerification;

  return (
    <LeadCard
      $requiresVerification={lead.requiresVerification}
      $isNew={lead.requiresVerification}
      onClick={() => onLeadClick?.(lead)}
    >
      <SourceIconWrapper $source={lead.source} title={sourceLabels[lead.source]}>
        <SourceIcon />
      </SourceIconWrapper>

      <MainContent>
        <TopRow>
          <ContactInfo>
            <ContactIdentifier>{formattedContact}</ContactIdentifier>
            {lead.customerName && <CustomerName>{lead.customerName}</CustomerName>}
          </ContactInfo>

          <DesktopActions>
            {lead.requiresVerification && (
              <NewBadge $animate={shouldAnimate}>NOWY</NewBadge>
            )}

            {editingValue ? (
              <ValueEditInput
                type="number"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onBlur={handleValueSave}
                onKeyDown={handleValueKeyDown}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <ValueBadge
                onClick={(e) => {
                  e.stopPropagation();
                  handleValueEdit();
                }}
                title={t.leads?.actions?.editValue || 'Zmień wycenę'}
              >
                {formattedValue}
                <EditIcon />
              </ValueBadge>
            )}

            <StatusDropdown onClick={(e) => e.stopPropagation()}>
              <StatusButton
                $status={lead.status}
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
              >
                {statusLabels[lead.status]}
                <ChevronDownIcon />
              </StatusButton>
              <StatusMenu $isOpen={statusMenuOpen}>
                {(['IN_PROGRESS', 'CONVERTED', 'ABANDONED'] as LeadStatus[]).map(
                  (status) => (
                    <StatusOption
                      key={status}
                      $isActive={status === lead.status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {statusLabels[status]}
                    </StatusOption>
                  )
                )}
              </StatusMenu>
            </StatusDropdown>

            <Timestamp>{relativeTime}</Timestamp>
          </DesktopActions>
        </TopRow>

        {lead.initialMessage && <InitialMessage>{lead.initialMessage}</InitialMessage>}
      </MainContent>

      {/* Mobile-only row */}
      <MobileRow onClick={(e) => e.stopPropagation()}>
        <BadgeContainer>
          {lead.requiresVerification && (
            <NewBadge $animate={shouldAnimate}>NOWY</NewBadge>
          )}
          <ValueBadge onClick={handleValueEdit}>{formattedValue}</ValueBadge>
        </BadgeContainer>

        <StatusDropdown>
          <StatusButton
            $status={lead.status}
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
          >
            {statusLabels[lead.status]}
            <ChevronDownIcon />
          </StatusButton>
          <StatusMenu $isOpen={statusMenuOpen}>
            {(['IN_PROGRESS', 'CONVERTED', 'ABANDONED'] as LeadStatus[]).map(
              (status) => (
                <StatusOption
                  key={status}
                  $isActive={status === lead.status}
                  onClick={() => handleStatusChange(status)}
                >
                  {statusLabels[status]}
                </StatusOption>
              )
            )}
          </StatusMenu>
        </StatusDropdown>

        <Timestamp>{relativeTime}</Timestamp>
      </MobileRow>
    </LeadCard>
  );
};

/**
 * LeadInbox component displays a list of leads sorted by priority
 * - requiresVerification: true leads are pinned to the top
 * - Others sorted by createdAt descending
 */
export const LeadInbox: React.FC<LeadInboxProps> = ({ leads, isLoading, onLeadClick }) => {
  // Sort leads: requiresVerification first, then by createdAt descending
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      // Pin requiresVerification: true to top
      if (a.requiresVerification !== b.requiresVerification) {
        return a.requiresVerification ? -1 : 1;
      }
      // Then sort by createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads]);

  if (isLoading) {
    return (
      <Container>
        {[1, 2, 3].map((i) => (
          <LeadCard key={i} $requiresVerification={false} $isNew={false}>
            <SourceIconWrapper $source={LeadSource.MANUAL}>
              <ManualIcon />
            </SourceIconWrapper>
            <MainContent>
              <ContactIdentifier style={{ width: '150px', height: '20px', background: '#e5e7eb', borderRadius: '4px' }} />
              <InitialMessage style={{ width: '200px', height: '16px', background: '#e5e7eb', borderRadius: '4px', marginTop: '4px' }} />
            </MainContent>
          </LeadCard>
        ))}
      </Container>
    );
  }

  if (sortedLeads.length === 0) {
    return (
      <EmptyState>
        <p>Brak leadów do wyświetlenia</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          Nowe leady pojawią się tutaj automatycznie
        </p>
      </EmptyState>
    );
  }

  return (
    <Container>
      {sortedLeads.map((lead) => (
        <LeadCardItem key={lead.id} lead={lead} onLeadClick={onLeadClick} />
      ))}
    </Container>
  );
};
