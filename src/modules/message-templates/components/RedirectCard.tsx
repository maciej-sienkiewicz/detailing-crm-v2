import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { SharedButton } from '@/common/styles';
import type { RehearsalReport } from '../types';
import { summarizeReport } from '../utils/rehearsalReport';
import {
  useCommunicationRedirect,
  usePlanRehearsal,
  useRunRehearsal,
  useUpdateCommunicationRedirect,
} from '../hooks/useCommunicationRedirect';

/**
 * „Przekieruj każdą wiadomość mailową i SMS na moje dane".
 *
 * Studio, które właśnie napisało szablony, chce zobaczyć na własnym telefonie i skrzynce,
 * co dostałby klient przy prawdziwych rezerwacjach - i dopiero potem puścić to do ludzi.
 * Dopóki przełącznik jest włączony, żaden klient nie dostaje nic; dlatego karta w tym stanie
 * jest głośna (bursztyn, ikona ostrzeżenia, zdanie wprost), a w stanie wyłączonym cicha.
 *
 * Obok przełącznika jest próba generalna: jeden przycisk wysyła wszystkie szablony
 * z przykładowymi danymi na te same dane. Działa tylko przy włączonym przekierowaniu.
 */

const Card = styled.section<{ $active: boolean }>`
  border: 1px solid ${p => (p.$active ? '#fcd34d' : p.theme.colors.border)};
  border-radius: 14px;
  background: ${p => p.theme.colors.surface};
  overflow: hidden;

  ${p => p.$active && css`
    box-shadow: 0 1px 3px rgba(180, 83, 9, 0.08), 0 6px 20px rgba(180, 83, 9, 0.06);
  `}
`;

const Head = styled.header<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${p => (p.$active ? '#fffbeb' : p.theme.colors.surface)};
`;

const IconWrap = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${p => (p.$active ? 'rgba(217, 119, 6, 0.12)' : 'rgba(14, 165, 233, 0.1)')};
  color: ${p => (p.$active ? '#b45309' : p.theme.colors.primary)};

  svg { width: 18px; height: 18px; }
`;

const Titles = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
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

  strong { color: #b45309; }
`;

const Panel = styled.div`
  border-top: 1px solid ${p => p.theme.colors.border};
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Fields = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const Field = styled(FormField)`
  width: 240px;
  max-width: 100%;
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${p => p.theme.colors.textMuted};
`;

const Feedback = styled.div<{ $error: boolean }>`
  font-size: 12.5px;
  color: ${p => (p.$error ? '#991b1b' : '#047857')};
`;

const RehearsalRow = styled.div`
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

const Report = styled.div`
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  ul { margin: 0; padding-left: 18px; }
  li { margin: 2px 0; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    background: rgba(148, 163, 184, 0.15);
    padding: 1px 5px;
    border-radius: 4px;
  }
`;

const ReportLine = styled.div<{ $tone: 'ok' | 'warn' | 'error' }>`
  font-weight: ${p => p.theme.fontWeights.semibold};
  color: ${p => (p.$tone === 'error' ? '#991b1b' : p.$tone === 'warn' ? '#92400e' : '#047857')};
`;

const PHONE_HINT = 'np. +48 500 100 200';

function describeReport(report: RehearsalReport): React.ReactNode {
  const summary = summarizeReport(report);
  return (
    <>
      <ReportLine $tone={summary.tone}>{summary.headline}</ReportLine>
      {summary.problems.length > 0 && (
        <ul>
          {summary.problems.map(p => (
            <li key={p.key}>
              <code>{p.label}</code> {p.detail}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export const RedirectCard: React.FC = () => {
  const { settings, isLoading } = useCommunicationRedirect();
  const updateMutation = useUpdateCommunicationRedirect();
  const planMutation = usePlanRehearsal();
  const runMutation = useRunRehearsal();

  // null = nikt nic nie wpisał; w polach stoi to, co przyszło z serwera.
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; msg: string } | null>(null);
  const [report, setReport] = useState<RehearsalReport | null>(null);

  const enabled = settings?.enabled ?? false;
  const phone = phoneDraft ?? settings?.phone ?? '';
  const email = emailDraft ?? settings?.email ?? '';
  const dirty = phone.trim() !== (settings?.phone ?? '') || email.trim() !== (settings?.email ?? '');
  const canEnable = phone.trim().length > 0 && email.trim().length > 0;

  const flash = (error: boolean, msg: string) => {
    setFeedback({ error, msg });
    setTimeout(() => setFeedback(null), 6000);
  };

  const errorMessage = (e: unknown, fallback: string) => {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return msg || fallback;
  };

  const save = async (nextEnabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ enabled: nextEnabled, phone: phone.trim(), email: email.trim() });
      setPhoneDraft(null);
      setEmailDraft(null);
      flash(
        false,
        nextEnabled
          ? 'Włączone. Od teraz każda wiadomość do klienta trafia na Twoje dane.'
          : 'Wyłączone. Wiadomości wychodzą do klientów.'
      );
    } catch (e) {
      flash(true, errorMessage(e, 'Nie udało się zapisać ustawienia.'));
    }
  };

  const handleToggle = (next: boolean) => {
    if (next && !canEnable) {
      flash(true, 'Najpierw wpisz numer telefonu i adres e-mail, na które mają trafiać wiadomości.');
      return;
    }
    void save(next);
  };

  const handlePlan = async () => {
    try {
      setReport(await planMutation.mutateAsync());
    } catch (e) {
      flash(true, errorMessage(e, 'Nie udało się sprawdzić szablonów.'));
    }
  };

  const handleRun = async () => {
    try {
      setReport(await runMutation.mutateAsync());
    } catch (e) {
      flash(true, errorMessage(e, 'Nie udało się wysłać wiadomości testowych.'));
    }
  };

  const busy = updateMutation.isPending || planMutation.isPending || runMutation.isPending;

  return (
    <Card $active={enabled}>
      <Head $active={enabled}>
        <IconWrap $active={enabled}>
          {enabled ? <AlertTriangle /> : <ShieldCheck />}
        </IconWrap>

        <Titles>
          <h3>Przekieruj każdą wiadomość mailową i SMS na moje dane</h3>
          <p>
            {isLoading
              ? 'Wczytywanie…'
              : enabled
                ? <>
                    <strong>Klienci nie dostają teraz żadnych wiadomości.</strong> Wszystko, co wyszłoby do nich,
                    trafia na {settings?.phone} i {settings?.email}, z dopiskiem, dla kogo było. Wyłącz, gdy skończysz sprawdzać.
                  </>
                : 'Włącz na czas sprawdzania szablonów: każdy SMS i e-mail do klienta przyjdzie do Ciebie, z dopiskiem, dla kogo był. Po wyłączeniu wiadomości idą normalnie do klientów.'}
          </p>
        </Titles>

        <Toggle
          checked={enabled}
          onChange={handleToggle}
          disabled={isLoading || updateMutation.isPending}
          ariaLabel="Przekieruj każdą wiadomość mailową i SMS na moje dane"
        />
      </Head>

      <Panel>
        <Fields>
          <Field>
            <FieldLabel htmlFor="redirect-phone">Telefon na SMS-y</FieldLabel>
            <InputShell $compact>
              <BareInput
                id="redirect-phone"
                type="tel"
                value={phone}
                placeholder={PHONE_HINT}
                autoComplete="tel"
                $compact
                onChange={e => setPhoneDraft(e.target.value)}
              />
            </InputShell>
          </Field>

          <Field>
            <FieldLabel htmlFor="redirect-email">E-mail na wiadomości</FieldLabel>
            <InputShell $compact>
              <BareInput
                id="redirect-email"
                type="email"
                value={email}
                placeholder="np. biuro@twojestudio.pl"
                autoComplete="email"
                $compact
                onChange={e => setEmailDraft(e.target.value)}
              />
            </InputShell>
          </Field>

          <SharedButton
            type="button"
            $variant="primary"
            $size="sm"
            disabled={!dirty || busy || (enabled && !canEnable)}
            onClick={() => void save(enabled)}
          >
            {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz dane'}
          </SharedButton>
        </Fields>

        <HelperText>
          Numer w formacie polskim lub międzynarodowym. Przekierowanie dotyczy tylko wiadomości do klientów;
          maile systemowe do pracowników (reset hasła, zaproszenia) idą jak zwykle.
        </HelperText>

        {feedback && <Feedback $error={feedback.error}>{feedback.msg}</Feedback>}

        <RehearsalRow>
          <span className="text">
            Próba generalna: wysyła wszystkie szablony z przykładowymi danymi (Jan Kowalski, Audi RS6, jutro 10:00)
            na powyższe dane. Wymaga włączonego przekierowania; jeśli którykolwiek szablon ma błąd, nie wychodzi nic.
          </span>
          <SharedButton type="button" $variant="secondary" $size="sm" disabled={busy} onClick={handlePlan}>
            {planMutation.isPending ? 'Sprawdzanie…' : 'Sprawdź szablony'}
          </SharedButton>
          <SharedButton
            type="button"
            $variant="primary"
            $size="sm"
            disabled={busy || !enabled}
            title={enabled ? undefined : 'Włącz najpierw przekierowanie'}
            onClick={handleRun}
          >
            <Send size={14} aria-hidden="true" />
            {runMutation.isPending ? 'Wysyłanie…' : 'Wyślij wszystkie testowo'}
          </SharedButton>
        </RehearsalRow>

        {report && <Report role="status">{describeReport(report)}</Report>}
      </Panel>
    </Card>
  );
};
