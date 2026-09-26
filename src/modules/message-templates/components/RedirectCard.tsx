import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Toggle } from '@/common/components/Toggle';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useSettingsDirty } from '@/modules/settings/components/shared/settingsChrome';
import { Button, Panel, ui } from '@/common/components/ui';
import type { RehearsalReport } from '../types';
import { sendConfirmMessage, sendPlan, summarizeReport, type SendPlan } from '../utils/rehearsalReport';
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

/*
 * Płaski panel, nie karta: jedyną wyniesioną powierzchnią tej sekcji jest tabela
 * szablonów (CLAUDE.md §2, „wyniesienie"). Stan włączony niesie odcień - bursztynową
 * obwódkę i tło nagłówka - bo odcień to znaczenie („przeczytaj"), a nie cień.
 */
const Card = styled(Panel)<{ $active: boolean }>`
  overflow: hidden;
  ${p => p.$active && css`border-color: ${ui.warnLine};`}
`;

const Head = styled.header<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${p => (p.$active ? ui.warnTint : 'transparent')};
`;

const IconWrap = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
  background: ${p => (p.$active ? 'rgba(217, 119, 6, 0.12)' : ui.brandTint)};
  color: ${p => (p.$active ? '#b45309' : ui.brandInk)};

  svg { width: 17px; height: 17px; }
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

const Body = styled.div`
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
`;

/**
 * Nazwa wiadomości, do której odnosi się problem („Podziękowanie po wizycie (SMS)").
 * To jest zwykła nazwa z ekranu szablonów, nie kod - stąd zwykły pogrubiony tekst
 * zamiast czcionki maszynowej, którą tu miał kiedyś surowy identyfikator backendu.
 */
const ProblemLabel = styled.strong`
  font-weight: ${p => p.theme.fontWeights.semibold};
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
              <ProblemLabel>{p.label}:</ProblemLabel> {p.detail}
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
  // Pytanie przed próbą generalną: `plan` to wynik suchego przebiegu (ile naprawdę
  // wyjdzie), null w `plan` = serwer nie powiedział, zdanie mówi wtedy ogólniej.
  const [confirmRun, setConfirmRun] = useState<{ plan: SendPlan | null } | null>(null);

  const enabled = settings?.enabled ?? false;
  const phone = phoneDraft ?? settings?.phone ?? '';
  const email = emailDraft ?? settings?.email ?? '';
  const dirty = phone.trim() !== (settings?.phone ?? '') || email.trim() !== (settings?.email ?? '');
  const canEnable = phone.trim().length > 0 && email.trim().length > 0;
  // Wpisany, niezapisany numer ginął bez słowa przy przejściu do innej sekcji -
  // rama ustawień pyta teraz przed wyjściem.
  useSettingsDirty(dirty);

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

  /*
   * „Wyślij wszystkie testowo" wysyłało od razu po kliknięciu: kilkanaście prawdziwych
   * SMS-ów (z kredytów studia) i e-maili, bez odwrotu. Teraz najpierw suchy przebieg
   * (ten sam, co „Sprawdź szablony"): przy błędach i tak nic by nie wyszło, więc
   * pokazujemy raport zamiast pytać; bez błędów pytamy, podając liczbę i adresy.
   */
  const askRun = async () => {
    let planned: RehearsalReport | undefined;
    try {
      planned = await planMutation.mutateAsync();
    } catch (e) {
      flash(true, errorMessage(e, 'Nie udało się sprawdzić szablonów.'));
      return;
    }
    if (planned && planned.errorCount > 0) {
      setReport(planned);
      return;
    }
    setConfirmRun({ plan: planned ? sendPlan(planned) : null });
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

      <Body>
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

          {/* Odcień bez wypełnienia: jedynym wypełnionym przyciskiem sekcji jest
              „Zapisz zmiany" w pasku szablonów (CLAUDE.md §2). */}
          <Button
            variant="tinted"
            size="md"
            disabled={!dirty || busy || (enabled && !canEnable)}
            onClick={() => void save(enabled)}
          >
            {updateMutation.isPending ? 'Zapisywanie…' : 'Zapisz dane'}
          </Button>
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
          <Button variant="outline" size="sm" disabled={busy} onClick={handlePlan}>
            {planMutation.isPending && !confirmRun ? 'Sprawdzanie…' : 'Sprawdź szablony'}
          </Button>
          <Button
            variant="tinted"
            size="sm"
            disabled={busy || !enabled}
            title={enabled ? undefined : 'Włącz najpierw przekierowanie'}
            onClick={() => void askRun()}
          >
            <Send aria-hidden="true" />
            {runMutation.isPending ? 'Wysyłanie…' : 'Wyślij wszystkie testowo'}
          </Button>
        </RehearsalRow>

        {report && <Report role="status">{describeReport(report)}</Report>}
      </Body>

      <ConfirmationModal
        isOpen={confirmRun !== null}
        title="Wysłać wszystkie szablony testowo?"
        message={sendConfirmMessage(confirmRun?.plan ?? null, settings?.phone ?? phone, settings?.email ?? email)}
        variant="warning"
        confirmText="Wyślij testowo"
        cancelText="Anuluj"
        onConfirm={() => void handleRun()}
        onCancel={() => setConfirmRun(null)}
      />
    </Card>
  );
};
