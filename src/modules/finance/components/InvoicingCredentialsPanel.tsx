import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
  useInvoicingCredentials,
  useInvoicingProviders,
  useSaveCredentials,
  useDeleteCredentials,
} from '../hooks/useInvoicing';

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
  background: ${st.bgCard};
  border: 1px solid ${st.border};
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
  border-bottom: 1px solid ${st.border};
  background: ${st.bgCardAlt};
`;

const PanelTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
  margin: 0;
`;

const PanelSubtitle = styled.p`
  font-size: 12px;
  color: ${st.textMuted};
  margin: 2px 0 0;
`;

const PanelBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

// ─── Connected badge ──────────────────────────────────────────────────────────

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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
`;

// ─── Form elements ────────────────────────────────────────────────────────────

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${st.textSecondary};
`;

const Select = styled.select`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${st.border};
  border-radius: 8px;
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: 0 0 0 3px ${st.accentBlueDim};
  }
`;

const Input = styled.input`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${st.border};
  border-radius: 8px;
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: 0 0 0 3px ${st.accentBlueDim};
  }

  &::placeholder { color: ${st.textMuted}; }
`;

const MaskedKeyBox = styled.div`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid ${st.border};
  border-radius: 8px;
  background: ${st.bgCardAlt};
  color: ${st.textSecondary};
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  letter-spacing: 2px;
`;

const HelpText = styled.p`
  font-size: 12px;
  color: ${st.textMuted};
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

  &:hover {
    background: ${st.accentRedDim};
    border-color: ${st.accentRed};
  }
`;

const SecondaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${st.bg};
    border-color: ${st.borderHover};
    color: ${st.text};
  }
`;

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  display: inline-block;
`;

// ─── Error / Success ──────────────────────────────────────────────────────────

const ErrorMsg = styled.div`
  padding: 10px 14px;
  background: ${st.accentRedDim};
  border: 1px solid ${st.accentRed}33;
  border-radius: 8px;
  font-size: 13px;
  color: ${st.accentRed};
  font-weight: 500;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const InvoicingCredentialsPanel: React.FC = () => {
  const { credentials, isLoading: credLoading } = useInvoicingCredentials();
  const { providers, isLoading: provsLoading } = useInvoicingProviders();
  const saveCredentials = useSaveCredentials();
  const deleteCredentials = useDeleteCredentials();

  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConfigured = !!credentials && !editMode;
  const isLoading = credLoading || provsLoading;

  const handleSave = async () => {
    if (!provider || !apiKey.trim()) return;
    setErrorMsg(null);
    try {
      await saveCredentials.mutateAsync({ provider, apiKey: apiKey.trim() });
      setApiKey('');
      setProvider('');
      setEditMode(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Błąd zapisu konfiguracji';
      setErrorMsg(msg);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Czy na pewno chcesz rozłączyć integrację z systemem fakturowania?')) return;
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
          <div>
            <PanelTitle>Integracja z systemem fakturowania</PanelTitle>
            <PanelSubtitle>Ładowanie konfiguracji…</PanelSubtitle>
          </div>
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
        <div>
          <PanelTitle>Integracja z systemem fakturowania</PanelTitle>
          <PanelSubtitle>
            Połącz z inFakt, wFirma, iFirma lub Fakturownia, aby automatycznie wystawiać faktury
          </PanelSubtitle>
        </div>
        {isConfigured && (
          <ConnectedBadge>
            <GreenDot />
            Połączono: {credentials.providerLabel}
          </ConnectedBadge>
        )}
      </PanelHeader>

      <PanelBody>
        {errorMsg && <ErrorMsg>{errorMsg}</ErrorMsg>}

        {isConfigured ? (
          <>
            <FormGroup>
              <Label>Dostawca</Label>
              <MaskedKeyBox style={{ fontFamily: 'inherit', letterSpacing: 0 }}>
                {credentials.providerLabel}
              </MaskedKeyBox>
            </FormGroup>
            <FormGroup>
              <Label>Klucz API</Label>
              <MaskedKeyBox>{credentials.apiKeyMasked}</MaskedKeyBox>
              <HelpText>Klucz jest maskowany ze względów bezpieczeństwa.</HelpText>
            </FormGroup>
            <BtnRow>
              <SecondaryBtn onClick={() => { setProvider(credentials.provider); setEditMode(true); }}>
                Zmień konfigurację
              </SecondaryBtn>
              <DangerBtn
                onClick={handleDisconnect}
                disabled={deleteCredentials.isPending}
              >
                {deleteCredentials.isPending && <Spinner />}
                Rozłącz integrację
              </DangerBtn>
            </BtnRow>
          </>
        ) : (
          <>
            <FormGroup>
              <Label>Dostawca faktur</Label>
              <Select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="">— Wybierz dostawcę —</option>
                {providers
                  .filter((p) => p.supported)
                  .map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.displayName}
                    </option>
                  ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Klucz API / Token</Label>
              <Input
                type="password"
                placeholder="Wklej klucz API…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <HelpText>
                Klucz API znajdziesz w ustawieniach swojego konta u wybranego dostawcy.
              </HelpText>
            </FormGroup>
            <BtnRow>
              <PrimaryBtn
                onClick={handleSave}
                disabled={!provider || !apiKey.trim() || saveCredentials.isPending}
                $loading={saveCredentials.isPending}
              >
                {saveCredentials.isPending && <Spinner />}
                Zapisz konfigurację
              </PrimaryBtn>
              {editMode && (
                <SecondaryBtn onClick={() => setEditMode(false)}>Anuluj</SecondaryBtn>
              )}
            </BtnRow>
          </>
        )}
      </PanelBody>
    </Panel>
  );
};
