import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { st as stBase } from '@/modules/statistics/components/StatisticsTheme';
import type { SmsSenderNameConfig } from '../types';
import {
  useSenderNameConfig,
  useUpdateSenderName,
  useUploadSenderNameAuthDoc,
  useSenderNameDocumentUrl,
} from '../hooks';

const st = {
  ...stBase,
  accentBlue:   '#0ea5e9',
  gradientBlue: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
  shadowBlue:   '0 0 0 3px rgba(14,165,233,0.14)',
} as const;

/**
 * Configuration of the alphanumeric sender name shown on outgoing SMS, plus the signed
 * authorization SMSAPI requires before it will accept one.
 *
 * This is channel configuration, not a message template — it lives next to the templates
 * screen only because that is where studios look for it today.
 */
// ─── Sender name card styled components ───────────────────────────────────────

const SenderCard = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.03);
`;

const SenderCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 12px;
`;

const SenderCardIconWrap = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, #0ea5e9, #0369a1);
  color: #fff;
`;

const SenderCardTitleGroup = styled.div`
  flex: 1;
  min-width: 0;
`;

const SenderCardTitle = styled.h3`
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SenderCardDesc = styled.p`
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
`;

const SenderStatusBadge = styled.span<{ $status: 'confirmed' | 'pending' | 'none' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  background: ${p =>
    p.$status === 'confirmed' ? 'rgba(16,185,129,0.12)' :
    p.$status === 'pending'   ? 'rgba(245,158,11,0.12)' :
                                'rgba(148,163,184,0.12)'};
  color: ${p =>
    p.$status === 'confirmed' ? '#059669' :
    p.$status === 'pending'   ? '#d97706' :
                                '#64748b'};
`;

const SenderCardBody = styled.div`
  padding: 0 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SenderDivider = styled.div`
  height: 1px;
  background: rgba(215, 218, 224, 0.85);
  margin: 0 18px;
`;

const SenderNameRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 14px;
`;

const SenderNameInputWrap = styled.div`
  flex: 1;
`;

const SenderNameLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
`;

const SenderNameInput = styled.input<{ $dirty: boolean }>`
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 11px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid ${p => p.$dirty ? st.accentBlue : '#e2e8f0'};
  border-radius: 9px;
  background: white;
  color: #0f172a;
  outline: none;
  letter-spacing: 0.3px;
  transition: border-color 180ms, box-shadow 180ms;
  font-family: inherit;

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
  &::placeholder { color: #94a3b8; font-weight: 400; }
`;

const SenderNameHint = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
`;

const SenderNameHintText = styled.span`
  font-size: 11px;
  color: #94a3b8;
`;

const SenderNameCharCount = styled.span<{ $warn: boolean }>`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${p => p.$warn ? '#ef4444' : '#94a3b8'};
  font-weight: ${p => p.$warn ? 700 : 400};
`;

const SenderSaveBtn = styled.button<{ $loading?: boolean }>`
  height: 38px;
  padding: 0 16px;
  background: ${p => p.$loading ? '#0284c7' : st.gradientBlue};
  color: white;
  border: none;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 150ms;
  flex-shrink: 0;

  &:hover:not(:disabled) { opacity: 0.88; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const SenderDocSection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
`;

const SenderDocTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SenderDocRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SenderDocInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
`;

const SenderDocFileName = styled.span`
  font-weight: 600;
  color: #334155;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SenderActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const SenderOutlineBtn = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  background: white;
  color: #334155;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  white-space: nowrap;
  font-family: inherit;
  transition: border-color 150ms, background 150ms;

  &:hover:not(:disabled) {
    border-color: ${st.accentBlue};
    color: ${st.accentBlue};
    background: rgba(14,165,233,0.04);
  }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const SenderUploadBtn = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  background: white;
  color: #334155;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: border-color 150ms, background 150ms;

  &:hover {
    border-color: ${st.accentBlue};
    color: ${st.accentBlue};
    background: rgba(14,165,233,0.04);
  }
`;

const SenderUploadInput = styled.input`
  display: none;
`;

const SenderFeedback = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: ${p => p.$type === 'success' ? '#f0fdf4' : '#fff1f2'};
  border: 1px solid ${p => p.$type === 'success' ? '#86efac' : '#fca5a5'};
  color: ${p => p.$type === 'success' ? '#166534' : '#991b1b'};
`;

// ─── SmsSenderNameCard ────────────────────────────────────────────────────────

export const SmsSenderNameCard: React.FC = () => {
  const { config, isLoading } = useSenderNameConfig();
  const updateMutation = useUpdateSenderName();
  const uploadMutation = useUploadSenderNameAuthDoc();
  const docUrlMutation = useSenderNameDocumentUrl();

  const [localName, setLocalName] = useState('');
  const [savedName, setSavedName]   = useState('');
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (config && !savedName && config.senderName !== null) {
      setLocalName(config.senderName ?? '');
      setSavedName(config.senderName ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const dirty     = localName !== savedName;
  const charCount = localName.length;
  const charWarn  = charCount > 11;

  const statusOf = (cfg: SmsSenderNameConfig | null): 'confirmed' | 'pending' | 'none' =>
    cfg?.confirmed ? 'confirmed' :
    cfg?.senderName ? 'pending' :
    'none';

  const statusLabel = (cfg: SmsSenderNameConfig | null) =>
    cfg?.confirmed ? 'Zatwierdzona' :
    cfg?.senderName ? 'Oczekuje na weryfikację' :
    'Nie skonfigurowana';

  const handleSave = async () => {
    if (!dirty || charWarn || !localName.trim()) return;
    try {
      await updateMutation.mutateAsync(localName.trim());
      setSavedName(localName.trim());
      setFeedback({ type: 'success', msg: 'Nazwa nadawcy została zapisana. Oczekuje na weryfikację SMSAPI.' });
      setTimeout(() => setFeedback(null), 5000);
    } catch {
      setFeedback({ type: 'error', msg: 'Nie udało się zapisać nazwy nadawcy.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await uploadMutation.mutateAsync(file);
      setFeedback({ type: 'success', msg: 'Upoważnienie zostało przesłane.' });
      setTimeout(() => setFeedback(null), 5000);
    } catch {
      setFeedback({ type: 'error', msg: 'Nie udało się przesłać pliku.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleViewDoc = async () => {
    try {
      const url = await docUrlMutation.mutateAsync();
      window.open(url, '_blank', 'noopener');
    } catch {
      setFeedback({ type: 'error', msg: 'Nie udało się pobrać linku do upoważnienia.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/api/v1/sms-campaigns/sender-name/template';
    link.setAttribute('download', 'upoważnienie-nadawcy-sms.docx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const status = isLoading ? 'none' : statusOf(config);

  return (
    <SenderCard>
      <SenderCardHeader>
        <SenderCardIconWrap>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="8" y1="10" x2="16" y2="10"/>
            <line x1="8" y1="14" x2="14" y2="14"/>
          </svg>
        </SenderCardIconWrap>
        <SenderCardTitleGroup>
          <SenderCardTitle>
            Nazwa nadawcy w SMS
            {!isLoading && (
              <SenderStatusBadge $status={status}>
                {status === 'confirmed' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {statusLabel(config)}
              </SenderStatusBadge>
            )}
          </SenderCardTitle>
          <SenderCardDesc>
            Ustaw własną nazwę firmy jako nadawcę SMS. Wymaga weryfikacji przez SMSAPI — prześlij podpisane upoważnienie.
          </SenderCardDesc>
        </SenderCardTitleGroup>
      </SenderCardHeader>

      <SenderDivider />

      <SenderCardBody>
        <SenderNameRow>
          <SenderNameInputWrap>
            <SenderNameLabel htmlFor="sms-sender-name">Nazwa nadawcy</SenderNameLabel>
            <SenderNameInput
              id="sms-sender-name"
              type="text"
              $dirty={dirty}
              value={localName}
              onChange={e => setLocalName(e.target.value.toUpperCase())}
              placeholder="np. MYSTUDIA"
              maxLength={11}
              disabled={updateMutation.isPending}
            />
            <SenderNameHint>
              <SenderNameHintText>Maks. 11 znaków, tylko litery i cyfry</SenderNameHintText>
              <SenderNameCharCount $warn={charWarn}>{charCount}&thinsp;/&thinsp;11</SenderNameCharCount>
            </SenderNameHint>
          </SenderNameInputWrap>
          {dirty && (
            <SenderSaveBtn
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending || charWarn || !localName.trim()}
              $loading={updateMutation.isPending}
              style={{ marginBottom: 19 }}
            >
              {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz'}
            </SenderSaveBtn>
          )}
        </SenderNameRow>

        <SenderDocSection>
          <SenderDocTitle>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Upoważnienie do stosowania nazwy nadawcy
          </SenderDocTitle>
          <SenderDocRows>
            {config?.hasAuthDocument && config.authDocumentName && (
              <SenderDocInfoRow>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <SenderDocFileName>{config.authDocumentName}</SenderDocFileName>
              </SenderDocInfoRow>
            )}
            <SenderActionRow>
              <SenderOutlineBtn
                type="button"
                onClick={handleDownloadTemplate}
                title="Pobierz szablon upoważnienia do wypełnienia i podpisania"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Pobierz szablon
              </SenderOutlineBtn>

              <SenderUploadBtn htmlFor="sms-auth-upload" title="Prześlij podpisane upoważnienie">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {config?.hasAuthDocument ? 'Zmień upoważnienie' : 'Prześlij upoważnienie'}
                <SenderUploadInput
                  id="sms-auth-upload"
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                />
              </SenderUploadBtn>

              {config?.hasAuthDocument && (
                <SenderOutlineBtn
                  type="button"
                  onClick={handleViewDoc}
                  disabled={docUrlMutation.isPending}
                  $loading={docUrlMutation.isPending}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Podejrzyj
                </SenderOutlineBtn>
              )}
            </SenderActionRow>
          </SenderDocRows>
        </SenderDocSection>

        {feedback && (
          <SenderFeedback $type={feedback.type}>
            {feedback.type === 'success'
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            }
            {feedback.msg}
          </SenderFeedback>
        )}
      </SenderCardBody>
    </SenderCard>
  );
};
