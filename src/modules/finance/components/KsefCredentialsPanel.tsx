import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useKsefCredentials,
  useSaveKsefCredentials,
  useDeleteKsefCredentials,
  useVerifyKsefToken,
} from '../hooks/useKsef';
import type { KsefTokenVerification } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
  animation: ${fadeIn} 0.2s ease-out;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};

  @media (max-width: 639px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
`;

const PanelTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text};
  margin: 0;
`;

const PanelSubtitle = styled.p`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 0;
`;

const PanelBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 639px) {
    padding: 16px;
  }
`;

// ─── Status badge ─────────────────────────────────────────────────────────────

const ConnectedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #059669;
`;

const GreenDot = styled.span`
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #10b981;
`;

// ─── Form elements ────────────────────────────────────────────────────────────

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  color: ${(p) => p.theme.colors.textSecondary};
`;

const Input = styled.input<{ $invalid?: boolean }>`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => (p.$invalid ? st.accentRed : p.theme.colors.border)};
  border-radius: 8px;
  background: ${(p) => (p.$invalid ? st.accentRedDim : p.theme.colors.surface)};
  color: ${(p) => p.theme.colors.text};
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${(p) => (p.$invalid ? st.accentRed : st.accentBlue)};
    box-shadow: 0 0 0 3px ${(p) => (p.$invalid ? `${st.accentRed}22` : st.accentBlueDim)};
  }
  &::placeholder { color: ${(p) => p.theme.colors.textMuted}; }
`;

const MaskedBox = styled.div`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  color: ${(p) => p.theme.colors.textSecondary};
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  letter-spacing: 2px;
`;

const HelpText = styled.p`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 0;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const PrimaryBtn = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: background 0.15s ease, transform 0.1s ease;
  &:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.55; }
`;

const DangerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  color: ${st.accentRed};
  border: 1px solid ${st.accentRed}66;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover { background: ${st.accentRedDim}; border-color: ${st.accentRed}; }
  &:disabled { opacity: 0.55; }
`;

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    background: ${(p) => p.theme.colors.surfaceAlt};
    border-color: ${st.borderHover};
    color: ${(p) => p.theme.colors.text};
  }
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
`;

// ─── Token permissions block ──────────────────────────────────────────────────

const PermsBox = styled.div`
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
`;

const PermsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: ${(p) => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  flex-wrap: wrap;
`;

const PermsTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text};
`;

const PermsChecked = styled.div`
  font-size: 11.5px;
  color: ${(p) => p.theme.colors.textMuted};
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
  gap: 10px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.text};
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
    p.$state === 'ok' ? '#10b981' : p.$state === 'missing' ? st.accentRed : '#94a3b8'};
`;

const PermHint = styled.span`
  font-size: 11.5px;
  color: ${(p) => p.theme.colors.textMuted};
`;

const PermsFootnote = styled.div`
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  font-size: 12.5px;
  color: #b45309;
  line-height: 1.5;
`;

const VerifyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 600;
  background: transparent;
  color: ${st.accentBlue};
  border: 1px solid ${st.accentBlue}55;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover:not(:disabled) { background: ${st.accentBlueDim}; border-color: ${st.accentBlue}; }
  &:disabled { opacity: 0.6; cursor: default; }
`;

const BlueSpinner = styled.span`
  width: 12px;
  height: 12px;
  border: 2px solid ${st.accentBlue}44;
  border-top-color: ${st.accentBlue};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
`;

// ─── Error message ────────────────────────────────────────────────────────────

const ErrorMsg = styled.div`
  padding: 10px 14px;
  background: ${st.accentRedDim};
  border: 1px solid ${st.accentRed}33;
  border-radius: 8px;
  font-size: 13px;
  color: ${st.accentRed};
  font-weight: 500;
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
  const verifyButton = (
    <VerifyBtn onClick={onVerify} disabled={isVerifying}>
      {isVerifying && <BlueSpinner />}
      {isVerifying ? 'Weryfikacja w KSeF...' : verification ? 'Sprawdź ponownie' : 'Sprawdź uprawnienia'}
    </VerifyBtn>
  );

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
        {verifyButton}
      </PermsHeader>
      <PermsBody>
        {verification && !verification.tokenValid ? (
          <ErrorMsg>
            {verification.errorMessage ??
              'KSeF odrzucił zapisany token. Sprawdź, czy token nie wygasł lub nie został odwołany, i zapisz nowy.'}
          </ErrorMsg>
        ) : (
          <>
            {rows.map((row) => (
              <PermRow key={row.label}>
                <PermIcon $state={row.state}>
                  {row.state === 'ok' ? '✓' : row.state === 'missing' ? '✕' : '?'}
                </PermIcon>
                {row.label}
                {row.hint && <PermHint>{row.hint}</PermHint>}
              </PermRow>
            ))}
            {verification?.tokenValid && !verification.permissionsKnown && (
              <PermsFootnote>
                Token jest poprawny, ale nie udało się odczytać listy jego uprawnień. Spróbuj ponownie
                za chwilę.
              </PermsFootnote>
            )}
            {missingAny && (
              <PermsFootnote>
                Token działa, ale nie ma wszystkich uprawnień. Wygeneruj nowy token w portalu KSeF,
                zaznaczając uprawnienia „Wystawianie faktur" i „Przeglądanie faktur", a następnie
                zapisz go tutaj ponownie.
              </PermsFootnote>
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

  const [nip, setNip]         = useState('');
  const [token, setToken]     = useState('');
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConfigured = !!credentials && !editMode;

  const handleSave = async () => {
    if (!nip.trim() || !token.trim()) return;
    setErrorMsg(null);
    try {
      await saveCredentials.mutateAsync({ nip: nip.trim(), ksefToken: token.trim() });
      setNip('');
      setToken('');
      setEditMode(false);
      // Verify the freshly saved token right away, so the owner immediately sees
      // whether it carries the needed permissions (fire-and-forget; the
      // checklist below shows the progress and result).
      verifyToken.mutate();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Błąd zapisu konfiguracji KSeF';
      setErrorMsg(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Czy na pewno chcesz odłączyć integrację z KSeF? Faktury zostaną zachowane.')) return;
    setErrorMsg(null);
    try {
      await deleteCredentials.mutateAsync();
      setEditMode(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Błąd usuwania konfiguracji';
      setErrorMsg(msg);
    }
  };

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader>
          <HeaderLeft>
            <PanelTitle>Integracja z KSeF</PanelTitle>
            <PanelSubtitle>Ładowanie konfiguracji...</PanelSubtitle>
          </HeaderLeft>
        </PanelHeader>
        <PanelBody>
          <div style={{ height: 80, background: st.bgCardAlt, borderRadius: 8 }} />
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <HeaderLeft>
          <PanelTitle>Integracja z KSeF</PanelTitle>
          <PanelSubtitle>
            Podaj NIP firmy i token API, aby automatycznie pobierać faktury kosztowe z systemu Ministerstwa Finansów.
          </PanelSubtitle>
        </HeaderLeft>
        {isConfigured && (
          <ConnectedBadge>
            <GreenDot />
            Połączono · NIP {credentials.nip}
          </ConnectedBadge>
        )}
      </PanelHeader>

      <PanelBody>
        {errorMsg && <ErrorMsg>{errorMsg}</ErrorMsg>}

        {isConfigured ? (
          <>
            <FormRow>
              <FormGroup>
                <Label>NIP firmy</Label>
                <MaskedBox style={{ fontFamily: 'inherit', letterSpacing: 0 }}>
                  {credentials.nip}
                </MaskedBox>
              </FormGroup>
              <FormGroup>
                <Label>Token KSeF</Label>
                <MaskedBox>{credentials.tokenMasked}</MaskedBox>
                <HelpText>Token jest maskowany ze względów bezpieczeństwa.</HelpText>
              </FormGroup>
            </FormRow>

            <TokenPermissionsBlock
              verification={credentials.verification}
              isVerifying={verifyToken.isPending}
              onVerify={() => verifyToken.mutate()}
            />

            <BtnRow>
              <SecondaryBtn
                onClick={() => {
                  setNip(credentials.nip);
                  setEditMode(true);
                  setErrorMsg(null);
                }}
              >
                Zmień konfigurację
              </SecondaryBtn>
              <DangerBtn
                onClick={handleDisconnect}
                disabled={deleteCredentials.isPending}
              >
                {deleteCredentials.isPending && <Spinner />}
                Odłącz KSeF
              </DangerBtn>
            </BtnRow>
          </>
        ) : (
          <>
            <FormRow>
              <FormGroup>
                <Label>NIP firmy</Label>
                <Input
                  type="text"
                  placeholder="1234567890"
                  value={nip}
                  onChange={(e) => { setNip(e.target.value); setErrorMsg(null); }}
                  maxLength={10}
                />
                <HelpText>10-cyfrowy numer NIP bez spacji i kresek.</HelpText>
              </FormGroup>
              <FormGroup>
                <Label>Token API KSeF</Label>
                <Input
                  type="password"
                  placeholder="Wklej token z systemu KSeF..."
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setErrorMsg(null); }}
                  autoComplete="off"
                />
                <HelpText>
                  Token znajdziesz w systemie KSeF Ministerstwa Finansów, zakładka API.
                </HelpText>
              </FormGroup>
            </FormRow>
            <BtnRow>
              <PrimaryBtn
                onClick={handleSave}
                disabled={!nip.trim() || !token.trim() || saveCredentials.isPending}
                $loading={saveCredentials.isPending}
              >
                {saveCredentials.isPending && <Spinner />}
                {saveCredentials.isPending ? 'Zapisywanie...' : 'Zapisz konfigurację'}
              </PrimaryBtn>
              {editMode && (
                <SecondaryBtn onClick={() => { setEditMode(false); setErrorMsg(null); }}>
                  Anuluj
                </SecondaryBtn>
              )}
            </BtnRow>
          </>
        )}
      </PanelBody>
    </Panel>
  );
};
