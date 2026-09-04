import React, { useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { Check, Clock, FileDown, FileText, MessageSquare, PenLine, Upload } from 'lucide-react';
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { SignaturePad, type SignaturePadHandle } from '@/modules/public-signing/components/SignaturePad';
import type { SmsSenderNameConfig } from '../types';
import {
  useSenderNameConfig,
  useUpdateSenderName,
  useUploadSenderNameAuthDoc,
  useSignSenderNameAuthDoc,
  useSenderNameDocumentUrl,
} from '../hooks';

/**
 * Nazwa nadawcy SMS - to, co klient widzi zamiast numeru telefonu, plus podpisane
 * upoważnienie, którego wymaga operator.
 *
 * Wcześniej była to cienka szara belka nad tabelą szablonów: studio, które nigdy
 * nie ustawiło nadawcy, mogło jej nie zauważyć i przez miesiące wysyłać SMS-y
 * z przypadkowego numeru. Dlatego dopóki nazwa nie jest ustawiona, karta stoi
 * otwarta i sama mówi, co trzeba zrobić; po zatwierdzeniu zwija się do jednej
 * linijki - konfiguracja kanału nie ma prawa zabierać uwagi codziennej pracy.
 *
 * Styl: wspólne pola formularza aplikacji (Form) i wspólny przycisk (SharedButton),
 * te same co w formularzach leadów, usług czy finansów.
 */

type Status = 'confirmed' | 'pending' | 'none';

const MAX_LENGTH = 11;

/**
 * Operator przyjmuje tylko litery bez ogonków, cyfry, spację, kropkę i myślnik.
 * Wielkość liter jest wyborem studia - „DetailBoost" to nie to samo co „DETAILBOOST",
 * a wcześniej pole na siłę podnosiło wszystko do wersalików.
 */
const sanitize = (value: string) => value.replace(/[^A-Za-z0-9 .-]/g, '');

const Card = styled.section<{ $attention: boolean }>`
  border: 1px solid ${p => (p.$attention ? '#fcd34d' : p.theme.colors.border)};
  border-radius: 14px;
  background: ${p => p.theme.colors.surface};
  overflow: hidden;

  ${p => p.$attention && css`
    box-shadow: 0 1px 3px rgba(180, 83, 9, 0.08), 0 6px 20px rgba(180, 83, 9, 0.06);
  `}
`;

const Head = styled.header<{ $attention: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${p => (p.$attention ? '#fffbeb' : p.theme.colors.surface)};
`;

const IconWrap = styled.div<{ $attention: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${p => (p.$attention ? 'rgba(217, 119, 6, 0.12)' : 'rgba(14, 165, 233, 0.1)')};
  color: ${p => (p.$attention ? '#b45309' : p.theme.colors.primary)};

  svg { width: 18px; height: 18px; }
`;

const Titles = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
  }

  p {
    margin: 3px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};
  }
`;

const SenderValue = styled.span`
  font-size: 13px;
  font-weight: ${p => p.theme.fontWeights.semibold};
  color: ${p => p.theme.colors.text};
  letter-spacing: 0.02em;
`;

const Badge = styled.span<{ $status: Status }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: ${p => p.theme.fontWeights.semibold};
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid transparent;

  svg { width: 12px; height: 12px; }

  ${p => p.$status === 'confirmed' && css`
    background: #ecfdf5;
    border-color: rgba(16, 185, 129, 0.3);
    color: #047857;
  `}
  ${p => p.$status === 'pending' && css`
    background: #fffbeb;
    border-color: rgba(245, 158, 11, 0.35);
    color: #92400e;
  `}
  ${p => p.$status === 'none' && css`
    background: #fef3c7;
    border-color: rgba(217, 119, 6, 0.35);
    color: #b45309;
  `}
`;

const Panel = styled.div`
  border-top: 1px solid ${p => p.theme.colors.border};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const NameRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const NameField = styled(FormField)`
  width: 240px;
  max-width: 100%;
`;

const Counter = styled.span<{ $warn: boolean }>`
  padding: 0 12px 0 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${p => (p.$warn ? p.theme.colors.error : p.theme.colors.textMuted)};
  white-space: nowrap;
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${p => p.theme.colors.textMuted};
`;

/** Upoważnienie: jedno zdanie o tym, co się stanie, i przycisk, który to robi. */
const AuthRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border-top: 1px dashed ${p => p.theme.colors.border};
  padding-top: 14px;
  font-size: 13px;
  color: ${p => p.theme.colors.textSecondary};

  .text { flex: 1; min-width: 220px; }
`;

/**
 * Podpis składany na miejscu. Treść upoważnienia składa serwer z danych, które
 * system już ma, więc na ekranie zostaje jedyna rzecz, której nie zna: podpis.
 */
const SignArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SignActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const AltRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: ${p => p.theme.colors.textMuted};
`;

const DocLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 12.5px;
  color: ${p => p.theme.colors.primary};
  cursor: pointer;

  svg { width: 13px; height: 13px; }
  &:hover { text-decoration: underline; }
`;

const Feedback = styled.div<{ $error: boolean }>`
  font-size: 12.5px;
  color: ${p => (p.$error ? '#991b1b' : '#047857')};
`;

const HiddenFile = styled.input`
  display: none;
`;

const statusOf = (cfg: SmsSenderNameConfig | null): Status =>
  cfg?.confirmed ? 'confirmed' : cfg?.senderName ? 'pending' : 'none';

const STATUS_LABEL: Record<Status, string> = {
  confirmed: 'Zatwierdzona',
  pending: 'Czeka na weryfikację',
  none: 'Wymaga konfiguracji',
};

const STATUS_ICON: Record<Status, React.ReactNode> = {
  confirmed: <Check />,
  pending: <Clock />,
  none: null,
};

export const SmsSenderNameCard: React.FC = () => {
  const { config, isLoading } = useSenderNameConfig();
  const updateMutation = useUpdateSenderName();
  const uploadMutation = useUploadSenderNameAuthDoc();
  const signMutation = useSignSenderNameAuthDoc();
  const docUrlMutation = useSenderNameDocumentUrl();

  const [open, setOpen] = useState(false);
  // null = nikt jeszcze nic nie wpisał, więc w polu stoi to, co przyszło z serwera.
  // Kopiowanie odpowiedzi do stanu efektem kasowałoby to, co użytkownik właśnie pisze,
  // przy każdym odświeżeniu konfiguracji.
  const [draft, setDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<SignaturePadHandle>(null);
  const [signing, setSigning] = useState(false);

  const savedName = config?.senderName ?? '';
  const name = draft ?? savedName;

  const status = isLoading ? 'none' : statusOf(config);
  const needsSetup = !isLoading && status === 'none';
  // Nieustawiony nadawca to zadanie do zrobienia, nie ustawienie do schowania -
  // karta otwiera się sama, dopóki nazwa nie zostanie zapisana.
  const expanded = open || needsSetup;

  const dirty = name.trim() !== savedName;
  const tooLong = name.length > MAX_LENGTH;

  const flash = (error: boolean, msg: string) => {
    setFeedback({ error, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSave = async () => {
    if (!dirty || tooLong || !name.trim()) return;
    try {
      await updateMutation.mutateAsync(name.trim());
      setDraft(null);
      flash(false, 'Zapisano. Nazwa czeka na weryfikację operatora.');
    } catch {
      flash(true, 'Nie udało się zapisać nazwy nadawcy.');
    }
  };

  const handleSign = async () => {
    const base64 = padRef.current?.toPngBase64();
    if (!base64 || padRef.current?.isEmpty()) {
      flash(true, 'Podpis jest pusty - narysuj go przed zapisaniem.');
      return;
    }
    try {
      await signMutation.mutateAsync(base64);
      padRef.current?.clear();
      setSigning(false);
      flash(false, 'Upoważnienie podpisane i zapisane.');
    } catch {
      flash(true, 'Nie udało się podpisać upoważnienia.');
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
    <Card $attention={needsSetup}>
      <Head $attention={needsSetup}>
        <IconWrap $attention={needsSetup}>
          <MessageSquare />
        </IconWrap>

        <Titles>
          <h3>
            Nazwa nadawcy SMS
            {savedName && <SenderValue>{savedName}</SenderValue>}
            {!isLoading && (
              <Badge $status={status}>
                {STATUS_ICON[status]}
                {STATUS_LABEL[status]}
              </Badge>
            )}
          </h3>
          <p>
            {needsSetup
              ? 'Dopóki nazwa nie jest ustawiona, SMS-y do klientów wychodzą z przypadkowego numeru - bez informacji, kto pisze.'
              : 'To ją klient widzi zamiast numeru telefonu przy każdym SMS-ie ze studia.'}
          </p>
        </Titles>

        {!needsSetup && (
          <SharedButton
            type="button"
            $variant="secondary"
            $size="sm"
            aria-expanded={expanded}
            onClick={() => setOpen(v => !v)}
          >
            {expanded ? 'Zwiń' : 'Zmień'}
          </SharedButton>
        )}
      </Head>

      {expanded && (
        <Panel>
          <NameRow>
            <NameField>
              <FieldLabel htmlFor="sms-sender-name">Nazwa nadawcy</FieldLabel>
              <InputShell $hasError={tooLong} $compact>
                <BareInput
                  id="sms-sender-name"
                  type="text"
                  value={name}
                  maxLength={MAX_LENGTH}
                  placeholder="np. DetailBoost"
                  autoComplete="off"
                  $compact
                  onChange={e => setDraft(sanitize(e.target.value))}
                />
                <Counter $warn={tooLong}>{name.length}/{MAX_LENGTH}</Counter>
              </InputShell>
            </NameField>

            <SharedButton
              type="button"
              $variant="primary"
              $size="sm"
              disabled={!dirty || tooLong || !name.trim() || updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz nazwę'}
            </SharedButton>
          </NameRow>

          <HelperText>
            Do {MAX_LENGTH} znaków: litery bez polskich ogonków, cyfry, spacja, kropka i myślnik.
            Wielkość liter zostaje taka, jaką wpiszesz.
          </HelperText>

          <AuthRow>
              <span className="text">
                Podpisz upoważnienie dla operatora SMS - treść złożymy z danych Twojej firmy
                i nazwy nadawcy, z dzisiejszą datą.
              </span>
              {!signing && (
                <SharedButton
                  type="button"
                  $variant="primary"
                  $size="sm"
                  disabled={!savedName || dirty}
                  title={
                    !savedName || dirty
                      ? 'Najpierw zapisz nazwę nadawcy - to jej dotyczy upoważnienie'
                      : undefined
                  }
                  onClick={() => setSigning(true)}
                >
                  <PenLine size={14} /> Podpisz na ekranie
                </SharedButton>
              )}
          </AuthRow>

          {signing && (
            <SignArea>
              <SignaturePad ref={padRef} />
              <SignActions>
                <SharedButton
                  type="button"
                  $variant="primary"
                  $size="sm"
                  disabled={signMutation.isPending}
                  onClick={handleSign}
                >
                  {signMutation.isPending ? 'Podpisywanie…' : 'Podpisz i zapisz'}
                </SharedButton>
                <SharedButton
                  type="button"
                  $variant="secondary"
                  $size="sm"
                  disabled={signMutation.isPending}
                  onClick={() => { padRef.current?.clear(); setSigning(false); }}
                >
                  Anuluj
                </SharedButton>
              </SignActions>
            </SignArea>
          )}

          <AltRow>
            Wolisz papierowo?
            <SharedButton type="button" $variant="ghost" $size="sm" onClick={handleDownloadTemplate}>
              <FileDown size={14} /> Pobierz wzór
            </SharedButton>
            <SharedButton
              type="button"
              $variant="ghost"
              $size="sm"
              disabled={uploadMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} /> {uploadMutation.isPending ? 'Wysyłanie…' : 'Wgraj podpisany skan'}
            </SharedButton>
          </AltRow>

          {config?.hasAuthDocument && (
            <DocLink type="button" onClick={handleViewDoc}>
              <FileText /> Podpisane upoważnienie: {config.authDocumentName ?? 'upoważnienie'}
            </DocLink>
          )}

          <HiddenFile
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFile}
          />

          {feedback && <Feedback $error={feedback.error}>{feedback.msg}</Feedback>}
        </Panel>
      )}
    </Card>
  );
};
