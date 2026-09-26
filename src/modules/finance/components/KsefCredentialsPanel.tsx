// src/modules/finance/components/KsefCredentialsPanel.tsx
//
// Połączenie z KSeF: NIP + token API, a po zapisie sprawdzenie uprawnień tokenu.
//
// Wcześniej odłączenie pytało systemowym `window.confirm`, status był sklejony
// kropką („Połączono · NIP …"), błąd zapisu wisiał czerwonym blokiem nad formularzem
// aż do następnej zmiany pola, a nieudana weryfikacja tokenu nie mówiła nic -
// przycisk przestawał się kręcić i tyle. Teraz odłączenie idzie przez okno
// potwierdzenia jak każda nieodwracalna akcja, stan to plakietka, a każda nieudana
// operacja mówi o sobie toastem.

import React, { useState } from 'react';
import styled from 'styled-components';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, StatusPill, ui } from '@/common/components/ui';
import { useSettingsDirty } from '@/modules/settings/components/shared/settingsChrome';
import { toastUnhandledError } from '@/modules/subscription/utils/apiErrors';
import {
  useKsefCredentials,
  useSaveKsefCredentials,
  useDeleteKsefCredentials,
  useVerifyKsefToken,
} from '../hooks/useKsef';
import type { KsefTokenVerification } from '../types';

// ─── Layout ───────────────────────────────────────────────────────────────────

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 0;

  @media (max-width: 639px) {
    flex-direction: column;
    gap: 8px;
    padding: 16px 16px 0;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const PanelTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${ui.ink};
  margin: 0;
`;

const PanelSubtitle = styled.p`
  font-size: 13px;
  line-height: 1.5;
  color: ${ui.textMuted};
  margin: 0;
`;

const PanelBody = styled.div`
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 639px) {
    padding: 16px;
  }
`;

// ─── Form elements ────────────────────────────────────────────────────────────

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 639px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${ui.textSecondary};
`;

const Input = styled.input`
  padding: 9px 12px;
  min-height: 40px;
  font-size: 14px;
  border: 1px solid ${ui.line};
  border-radius: 8px;
  background: ${ui.surface};
  color: ${ui.ink};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${ui.brand};
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
  }
  &::placeholder { color: ${ui.textFaint}; }
`;

const ValueBox = styled.div<{ $mono?: boolean }>`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${ui.line};
  border-radius: 8px;
  background: ${ui.surfaceSoft};
  color: ${ui.textSecondary};
  font-family: ${p => (p.$mono ? ui.mono : 'inherit')};
  letter-spacing: ${p => (p.$mono ? '2px' : '0')};
  overflow-wrap: anywhere;
`;

const HelpText = styled.p`
  font-size: 12.5px;
  color: ${ui.textMuted};
  margin: 0;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

// ─── Token permissions block ──────────────────────────────────────────────────

const PermsBox = styled.div`
  border: 1px solid ${ui.line};
  border-radius: ${ui.radiusStrip};
  overflow: hidden;
`;

const PermsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: ${ui.surfaceSoft};
  border-bottom: 1px solid ${ui.line};
  flex-wrap: wrap;
`;

const PermsTitle = styled.div`
  font-size: 13.5px;
  font-weight: 700;
  color: ${ui.ink};
`;

const PermsChecked = styled.div`
  font-size: 12px;
  color: ${ui.textMuted};
`;

const PermsBody = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PermRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 13px;
  color: ${ui.ink};
`;

const PermIcon = styled.span<{ $state: 'ok' | 'missing' | 'unknown' }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: ${(p) =>
    p.$state === 'ok' ? '#16a34a' : p.$state === 'missing' ? '#dc2626' : ui.textFaint};
`;

const PermHint = styled.span`
  font-size: 12px;
  color: ${ui.textMuted};
`;

const Skeleton = styled.div`
  height: 80px;
  background: ${ui.surfaceAlt};
  border-radius: 8px;
`;

// ─── Token permissions checklist ──────────────────────────────────────────────

const formatCheckedAt = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const TokenPermissionsBlock: React.FC<{
  verification: KsefTokenVerification | null;
  isVerifying: boolean;
  onVerify: () => void;
}> = ({ verification, isVerifying, onVerify }) => {
  const checkedAt = formatCheckedAt(verification?.checkedAt ?? null);

  // Row state: before any verification (or when the list couldn't be read),
  // everything is "unknown"; we never show a false ✓ or ✗.
  const rowState = (granted: boolean): 'ok' | 'missing' | 'unknown' => {
    if (!verification || !verification.tokenValid || !verification.permissionsKnown) return 'unknown';
    return granted ? 'ok' : 'missing';
  };

  const rows: { label: string; state: 'ok' | 'missing' | 'unknown'; hint?: string }[] = [
    { label: 'Wystawianie faktur', state: rowState(verification?.canIssueInvoices ?? false) },
    { label: 'Przeglądanie faktur', state: rowState(verification?.canReadInvoices ?? false) },
    {
      label: 'Generowanie UPO',
      state: rowState(verification?.canGenerateUpo ?? false),
      hint: 'dostępne razem z uprawnieniem do wystawiania faktur',
    },
  ];

  const missingAny =
    !!verification?.tokenValid &&
    verification.permissionsKnown &&
    (!verification.canIssueInvoices || !verification.canReadInvoices);

  return (
    <PermsBox>
      <PermsHeader>
        <div>
          <PermsTitle>Uprawnienia tokenu</PermsTitle>
          {checkedAt && <PermsChecked>Ostatnia weryfikacja: {checkedAt}</PermsChecked>}
          {!verification && <PermsChecked>Uprawnienia nie zostały jeszcze sprawdzone.</PermsChecked>}
        </div>
        <Button variant="tinted" size="sm" onClick={onVerify} disabled={isVerifying}>
          {isVerifying ? 'Weryfikacja w KSeF…' : verification ? 'Sprawdź ponownie' : 'Sprawdź uprawnienia'}
        </Button>
      </PermsHeader>
      <PermsBody>
        {verification && !verification.tokenValid ? (
          <Notice tone="danger">
            {verification.errorMessage ??
              'KSeF odrzucił zapisany token. Sprawdź, czy token nie wygasł lub nie został odwołany, i zapisz nowy.'}
          </Notice>
        ) : (
          <>
            {rows.map((row) => (
              <PermRow key={row.label}>
                <PermIcon $state={row.state} aria-hidden="true">
                  {row.state === 'ok' ? '✓' : row.state === 'missing' ? '✕' : '?'}
                </PermIcon>
                {row.label}
                {row.hint && <PermHint>{row.hint}</PermHint>}
              </PermRow>
            ))}
            {verification?.tokenValid && !verification.permissionsKnown && (
              <Notice tone="warn">
                Token jest poprawny, ale nie udało się odczytać listy jego uprawnień. Spróbuj ponownie
                za chwilę.
              </Notice>
            )}
            {missingAny && (
              <Notice tone="warn">
                Token działa, ale nie ma wszystkich uprawnień. Wygeneruj nowy token w portalu KSeF,
                zaznaczając uprawnienia „Wystawianie faktur" i „Przeglądanie faktur", a następnie
                zapisz go tutaj ponownie.
              </Notice>
            )}
          </>
        )}
      </PermsBody>
    </PermsBox>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const KsefCredentialsPanel: React.FC = () => {
  const { credentials, isLoading } = useKsefCredentials();
  const saveCredentials   = useSaveKsefCredentials();
  const deleteCredentials = useDeleteKsefCredentials();
  const verifyToken       = useVerifyKsefToken();
  const { showSuccess, showError } = useToast();

  const [nip, setNip]         = useState('');
  const [token, setToken]     = useState('');
  const [editMode, setEditMode] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const isConfigured = !!credentials && !editMode;

  // Wpisany token (albo zmieniony NIP) ginął po cichu przy przejściu do innej
  // sekcji ustawień. Poza ramą ustawień hook nic nie robi.
  const dirty = !isConfigured && (token.trim() !== '' || nip.trim() !== (credentials?.nip ?? ''));
  useSettingsDirty(dirty);

  const verify = () => {
    verifyToken.mutate(undefined, {
      onError: (err) =>
        toastUnhandledError(showError, err, 'Nie udało się sprawdzić tokenu', 'KSeF nie odpowiedział. Spróbuj ponownie za chwilę.'),
    });
  };

  const handleSave = async () => {
    if (!nip.trim() || !token.trim()) return;
    try {
      await saveCredentials.mutateAsync({ nip: nip.trim(), ksefToken: token.trim() });
      setNip('');
      setToken('');
      setEditMode(false);
      showSuccess('Połączono z KSeF', 'Sprawdzamy teraz uprawnienia tokenu.');
      // Verify the freshly saved token right away, so the owner immediately sees
      // whether it carries the needed permissions (fire-and-forget; the
      // checklist below shows the progress and result).
      verify();
    } catch (err: unknown) {
      // Formularz zostaje wypełniony: poprawia się jedno pole, a nie wkleja token od nowa.
      toastUnhandledError(showError, err, 'Nie udało się zapisać konfiguracji KSeF', 'Spróbuj ponownie za chwilę.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await deleteCredentials.mutateAsync();
      setEditMode(false);
      showSuccess('Odłączono KSeF', 'Pobrane faktury zostają w systemie.');
    } catch (err: unknown) {
      toastUnhandledError(showError, err, 'Nie udało się odłączyć KSeF', 'Spróbuj ponownie za chwilę.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <PanelHeader>
          <HeaderLeft>
            <PanelTitle>Integracja z KSeF</PanelTitle>
            <PanelSubtitle>Wczytywanie konfiguracji…</PanelSubtitle>
          </HeaderLeft>
        </PanelHeader>
        <PanelBody>
          <Skeleton />
        </PanelBody>
      </Card>
    );
  }

  return (
    <Card>
      <PanelHeader>
        <HeaderLeft>
          <PanelTitle>Integracja z KSeF</PanelTitle>
          <PanelSubtitle>
            Podaj NIP firmy i token API, aby automatycznie pobierać faktury kosztowe z systemu Ministerstwa Finansów.
          </PanelSubtitle>
        </HeaderLeft>
        {/* Sam stan - NIP stoi niżej jako osobne pole, zamiast doklejony kropką do plakietki. */}
        {isConfigured && <StatusPill $tone="ok" $size="md">Połączono</StatusPill>}
      </PanelHeader>

      <PanelBody>
        {isConfigured ? (
          <>
            <FormRow>
              <FormGroup>
                <Label as="span">NIP firmy</Label>
                <ValueBox>{credentials.nip}</ValueBox>
              </FormGroup>
              <FormGroup>
                <Label as="span">Token KSeF</Label>
                <ValueBox $mono>{credentials.tokenMasked}</ValueBox>
                <HelpText>Token jest maskowany ze względów bezpieczeństwa.</HelpText>
              </FormGroup>
            </FormRow>

            <TokenPermissionsBlock
              verification={credentials.verification}
              isVerifying={verifyToken.isPending}
              onVerify={verify}
            />

            <BtnRow>
              <Button
                onClick={() => {
                  setNip(credentials.nip);
                  setEditMode(true);
                }}
              >
                Zmień konfigurację
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmDisconnect(true)}
                disabled={deleteCredentials.isPending}
              >
                {deleteCredentials.isPending ? 'Odłączanie…' : 'Odłącz KSeF'}
              </Button>
            </BtnRow>
          </>
        ) : (
          <>
            <FormRow>
              <FormGroup>
                <Label htmlFor="ksef-nip">NIP firmy</Label>
                <Input
                  id="ksef-nip"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  maxLength={10}
                />
                <HelpText>10-cyfrowy numer NIP bez spacji i kresek.</HelpText>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="ksef-token">Token API KSeF</Label>
                <Input
                  id="ksef-token"
                  type="password"
                  placeholder="Wklej token z systemu KSeF"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                />
                <HelpText>
                  Token znajdziesz w systemie KSeF Ministerstwa Finansów, zakładka API.
                </HelpText>
              </FormGroup>
            </FormRow>
            <BtnRow>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!nip.trim() || !token.trim() || saveCredentials.isPending}
              >
                {saveCredentials.isPending ? 'Zapisywanie…' : 'Zapisz konfigurację'}
              </Button>
              {editMode && (
                <Button onClick={() => { setEditMode(false); setNip(''); setToken(''); }}>
                  Anuluj
                </Button>
              )}
            </BtnRow>
          </>
        )}
      </PanelBody>

      <ConfirmationModal
        isOpen={confirmDisconnect}
        variant="danger"
        title="Odłączyć KSeF?"
        message="Nowe faktury kosztowe przestaną się pobierać, a faktury sprzedaży nie pójdą do KSeF automatycznie. Pobrane faktury zostają w systemie."
        confirmText="Odłącz KSeF"
        cancelText="Anuluj"
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </Card>
  );
};
