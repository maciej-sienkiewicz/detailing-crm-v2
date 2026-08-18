import React, { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { SmsSenderNameConfig } from '../types';
import {
  useSenderNameConfig,
  useUpdateSenderName,
  useUploadSenderNameAuthDoc,
  useSenderNameDocumentUrl,
} from '../hooks';

/**
 * Sender name shown on outgoing SMS, plus the signed authorization SMSAPI requires.
 *
 * This is channel configuration, not a message template, so it stays collapsed to a
 * single line and only unfolds when someone actually wants to change it.
 */

type Status = 'confirmed' | 'pending' | 'none';

const Strip = styled.div`
  border: 1px solid ${st.border};
  border-radius: 10px;
  background: ${st.bgCard};
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: ${st.textSecondary};
  flex-wrap: wrap;
`;

const Term = styled.span`
  color: ${st.textMuted};
`;

const Value = styled.span`
  font-weight: 600;
  color: ${st.text};
`;

const Badge = styled.span<{ $status: Status }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${st.border};
  background: ${st.bgCardAlt};
  color: ${st.textMuted};

  ${p => p.$status === 'confirmed' && css`
    background: ${st.accentGreenDim};
    border-color: rgba(16, 185, 129, 0.3);
    color: #047857;
  `}
  ${p => p.$status === 'pending' && css`
    background: ${st.accentAmberDim};
    border-color: rgba(245, 158, 11, 0.35);
    color: #92400E;
  `}
`;

const LinkButton = styled.button`
  margin-left: auto;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${st.accentBlue};
  cursor: pointer;
  padding: 2px 0;

  &:hover { text-decoration: underline; }
`;

const Panel = styled.div`
  border-top: 1px solid ${st.border};
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Hint = styled.p`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${st.textSecondary};
  max-width: 68ch;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${st.textMuted};
`;

const NameInput = styled.input<{ $warn: boolean }>`
  width: 190px;
  padding: 8px 11px;
  border: 1px solid ${p => (p.$warn ? st.accentRed : st.border)};
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${st.text};
  background: ${st.bgInput};

  &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const Counter = styled.span<{ $warn: boolean }>`
  font-size: 11.5px;
  color: ${p => (p.$warn ? st.accentRed : st.textMuted)};
  font-variant-numeric: tabular-nums;
  padding-bottom: 9px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 13px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid ${st.border};
  background: ${st.bgCard};
  color: ${st.textSecondary};

  &:hover:not(:disabled) { border-color: ${st.borderHover}; color: ${st.text}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${p => p.$primary && css`
    background: ${st.accentBlue};
    border-color: ${st.accentBlue};
    color: #fff;
    &:hover:not(:disabled) { filter: brightness(0.95); color: #fff; }
  `}
`;

const Links = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12.5px;
`;

const TextLink = styled.button`
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  color: ${st.accentBlue};
  cursor: pointer;
  padding: 0;

  &:hover { text-decoration: underline; }
`;

const Feedback = styled.div<{ $error: boolean }>`
  font-size: 12.5px;
  color: ${p => (p.$error ? '#991B1B' : '#047857')};
`;

const HiddenFile = styled.input`
  display: none;
`;

const statusOf = (cfg: SmsSenderNameConfig | null): Status =>
  cfg?.confirmed ? 'confirmed' : cfg?.senderName ? 'pending' : 'none';

const STATUS_LABEL: Record<Status, string> = {
  confirmed: 'Zatwierdzona',
  pending: 'Czeka na weryfikację',
  none: 'Nie ustawiona',
};

export const SmsSenderNameCard: React.FC = () => {
  const { config, isLoading } = useSenderNameConfig();
  const updateMutation = useUpdateSenderName();
  const uploadMutation = useUploadSenderNameAuthDoc();
  const docUrlMutation = useSenderNameDocumentUrl();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [feedback, setFeedback] = useState<{ error: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setName(config.senderName ?? '');
      setSavedName(config.senderName ?? '');
    }
  }, [config]);

  const dirty = name !== savedName;
  const tooLong = name.length > 11;
  const status = isLoading ? 'none' : statusOf(config);

  const flash = (error: boolean, msg: string) => {
    setFeedback({ error, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSave = async () => {
    if (!dirty || tooLong || !name.trim()) return;
    try {
      await updateMutation.mutateAsync(name.trim());
      setSavedName(name.trim());
      flash(false, 'Zapisano. Nazwa czeka na weryfikację SMSAPI.');
    } catch {
      flash(true, 'Nie udało się zapisać nazwy nadawcy.');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await uploadMutation.mutateAsync(file);
      flash(false, 'Upoważnienie zostało przesłane.');
    } catch {
      flash(true, 'Nie udało się przesłać pliku.');
    }
  };

  const handleViewDoc = async () => {
    try {
      window.open(await docUrlMutation.mutateAsync(), '_blank', 'noopener');
    } catch {
      flash(true, 'Nie udało się pobrać linku do upoważnienia.');
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

  return (
    <Strip>
      <SummaryRow>
        <Term>Nadawca SMS</Term>
        <Value>{savedName || '-'}</Value>
        {!isLoading && <Badge $status={status}>{STATUS_LABEL[status]}</Badge>}
        <LinkButton type="button" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? 'Zwiń' : savedName ? 'Zmień' : 'Ustaw'}
        </LinkButton>
      </SummaryRow>

      {open && (
        <Panel>
          <Hint>
            Do 11 znaków wyświetlanych zamiast numeru telefonu. Operator wymaga podpisanego
            upoważnienia; do czasu jego weryfikacji SMS-y wychodzą z numeru domyślnego.
          </Hint>

          <Row>
            <Field>
              <Label htmlFor="sms-sender-name">Nazwa nadawcy</Label>
              <NameInput
                id="sms-sender-name"
                type="text"
                value={name}
                maxLength={16}
                placeholder="np. MYSTUDIO"
                $warn={tooLong}
                onChange={e => setName(e.target.value.toUpperCase())}
              />
            </Field>
            <Counter $warn={tooLong}>{name.length}/11</Counter>
            <Button
              type="button"
              $primary
              disabled={!dirty || tooLong || !name.trim() || updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </Row>

          <Links>
            <TextLink type="button" onClick={handleDownloadTemplate}>Pobierz wzór upoważnienia</TextLink>
            <TextLink type="button" onClick={() => fileRef.current?.click()}>
              {uploadMutation.isPending ? 'Wysyłanie...' : 'Wgraj podpisane upoważnienie'}
            </TextLink>
            {config?.hasAuthDocument && (
              <TextLink type="button" onClick={handleViewDoc}>
                Podgląd: {config.authDocumentName ?? 'upoważnienie'}
              </TextLink>
            )}
          </Links>

          <HiddenFile
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFile}
          />

          {feedback && <Feedback $error={feedback.error}>{feedback.msg}</Feedback>}
        </Panel>
      )}
    </Strip>
  );
};
