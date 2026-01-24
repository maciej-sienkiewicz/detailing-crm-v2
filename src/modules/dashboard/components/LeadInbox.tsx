/**
 * Lead Inbox Component
 * Displays incoming calls with action buttons for accept, edit, and reject
 */

import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Phone, Check, X, Edit2 } from 'lucide-react';
import { t } from '@/common/i18n';
import { formatPhoneNumber } from '@/common/utils/formatters';
import type { IncomingCall } from '../types';

interface LeadInboxProps {
  calls: IncomingCall[];
  onAccept: (callId: string) => void;
  onEdit: (callId: string, data: { contactName?: string; note?: string }) => void;
  onReject: (callId: string) => void;
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const InboxContainer = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.lg};
  box-shadow: ${(props) => props.theme.shadows.md};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const InboxHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  padding-bottom: ${(props) => props.theme.spacing.md};
  border-bottom: 2px solid ${(props) => props.theme.colors.border};
`;

const InboxTitle = styled.h3`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
  margin: 0;
`;

const CallCount = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 ${(props) => props.theme.spacing.xs};
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  border-radius: ${(props) => props.theme.radii.full};
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
`;

const CallList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const CallCard = styled.div<{ $isNew?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.surface};
  transition: background-color ${(props) => props.theme.transitions.normal};

  ${(props) =>
    props.$isNew &&
    css`
      border-color: ${props.theme.colors.primary};
      animation: ${slideIn} 0.3s ease-out, ${pulse} 2s ease-in-out 0.3s infinite;
    `}

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const CallInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  flex: 1;
`;

const CallHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
`;

const PhoneIcon = styled(Phone)`
  width: 16px;
  height: 16px;
  color: ${(props) => props.theme.colors.primary};
  flex-shrink: 0;
`;

const ContactName = styled.div`
  font-size: ${(props) => props.theme.fontSizes.md};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  color: ${(props) => props.theme.colors.text};
`;

const PhoneNumber = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  color: ${(props) => props.theme.colors.textSecondary};
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
    monospace;
`;

const CallMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textMuted};
`;

const CallNote = styled.div`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  font-style: italic;
  margin-top: ${(props) => props.theme.spacing.xs};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  flex-wrap: wrap;

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    flex-wrap: nowrap;
  }
`;

const ActionButton = styled.button<{ $variant?: 'accept' | 'edit' | 'reject' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: ${(props) => props.theme.fontSizes.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${(props) => props.theme.transitions.fast};
  flex: 1;

  ${(props) => {
    switch (props.$variant) {
      case 'accept':
        return `
          background-color: ${props.theme.colors.success};
          color: white;
          border-color: ${props.theme.colors.success};

          &:hover:not(:disabled) {
            background-color: #15803d;
          }
        `;
      case 'reject':
        return `
          background-color: ${props.theme.colors.error};
          color: white;
          border-color: ${props.theme.colors.error};

          &:hover:not(:disabled) {
            background-color: #b91c1c;
          }
        `;
      case 'edit':
      default:
        return `
          background-color: ${props.theme.colors.surface};
          color: ${props.theme.colors.text};

          &:hover:not(:disabled) {
            background-color: ${props.theme.colors.surfaceAlt};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    flex: 0 0 auto;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.xxl};
  text-align: center;
  color: ${(props) => props.theme.colors.textMuted};
`;

const EmptyIcon = styled(Phone)`
  width: 48px;
  height: 48px;
  margin-bottom: ${(props) => props.theme.spacing.md};
  opacity: 0.3;
`;

const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'teraz';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  return `${diffDays} dni temu`;
};

export const LeadInbox = ({ calls, onAccept, onEdit, onReject }: LeadInboxProps) => {
  const [editingCallId, setEditingCallId] = useState<string | null>(null);

  const handleEdit = (callId: string) => {
    // TODO: Implement modal or inline editing
    // For now, just log the action
    console.log('Edit call:', callId);
    setEditingCallId(callId);
    // Example: onEdit(callId, { contactName: 'Updated Name' });
  };

  // Consider calls received in last 5 minutes as "new"
  const isNewCall = (timestamp: string): boolean => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    return diffMs < 5 * 60 * 1000;
  };

  return (
    <InboxContainer>
      <InboxHeader>
        <InboxTitle>{t.dashboard.calls.title}</InboxTitle>
        {calls.length > 0 && <CallCount>{calls.length}</CallCount>}
      </InboxHeader>

      {calls.length === 0 ? (
        <EmptyState>
          <EmptyIcon />
          <div>{t.dashboard.calls.empty}</div>
        </EmptyState>
      ) : (
        <CallList>
          {calls.map((call) => (
            <CallCard key={call.id} $isNew={isNewCall(call.timestamp)}>
              <CallInfo>
                <CallHeader>
                  <PhoneIcon />
                  <div>
                    {call.contactName && <ContactName>{call.contactName}</ContactName>}
                    <PhoneNumber>{formatPhoneNumber(call.phoneNumber)}</PhoneNumber>
                  </div>
                </CallHeader>
                <CallMeta>
                  <div>{formatRelativeTime(call.timestamp)}</div>
                </CallMeta>
                {call.note && <CallNote>{call.note}</CallNote>}
              </CallInfo>

              <ActionButtons>
                <ActionButton $variant="accept" onClick={() => onAccept(call.id)}>
                  <Check />
                  <span>{t.dashboard.calls.actions.accept}</span>
                </ActionButton>
                <ActionButton $variant="edit" onClick={() => handleEdit(call.id)}>
                  <Edit2 />
                  <span>{t.dashboard.calls.actions.edit}</span>
                </ActionButton>
                <ActionButton $variant="reject" onClick={() => onReject(call.id)}>
                  <X />
                  <span>{t.dashboard.calls.actions.reject}</span>
                </ActionButton>
              </ActionButtons>
            </CallCard>
          ))}
        </CallList>
      )}
    </InboxContainer>
  );
};
