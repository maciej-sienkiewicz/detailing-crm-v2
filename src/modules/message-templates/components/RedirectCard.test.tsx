// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { RedirectCard } from './RedirectCard';
import type { CommunicationRedirectSettings, RehearsalReport } from '../types';

const updateMutate = vi.fn();
const planMutate = vi.fn();
const runMutate = vi.fn();
let settings: CommunicationRedirectSettings | null = null;
let loading = false;

vi.mock('../hooks/useCommunicationRedirect', () => ({
  useCommunicationRedirect: () => ({ settings, isLoading: loading }),
  useUpdateCommunicationRedirect: () => ({ mutateAsync: updateMutate, isPending: false }),
  usePlanRehearsal: () => ({ mutateAsync: planMutate, isPending: false }),
  useRunRehearsal: () => ({ mutateAsync: runMutate, isPending: false }),
}));

const off: CommunicationRedirectSettings = { enabled: false, phone: '', email: '', updatedAt: null };
const on: CommunicationRedirectSettings = { enabled: true, phone: '+48500100200', email: 'owner@studio.pl', updatedAt: '2026-09-03T10:00:00Z' };

const emptyReport = (over: Partial<RehearsalReport> = {}): RehearsalReport => ({
  generatedAt: '', redirectPhone: null, redirectEmail: null, sent: false, errorCount: 0, warningCount: 0, items: [], ...over,
});

const renderCard = () => render(
  <StyledThemeProvider theme={theme}>
    <RedirectCard />
  </StyledThemeProvider>
);

const toggle = () => screen.getByRole('switch', { name: /Przekieruj każdą wiadomość/ });

beforeEach(() => {
  vi.clearAllMocks();
  settings = off;
  loading = false;
  updateMutate.mockResolvedValue(on);
});

describe('RedirectCard', () => {
  it('when off it explains the switch and keeps the test-send button disabled', () => {
    renderCard();
    expect(screen.getByText(/Włącz na czas sprawdzania szablonów/)).toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Wyślij wszystkie testowo/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Sprawdź szablony/ })).toBeEnabled();
  });

  it('when on it says plainly that customers receive nothing and where messages go', () => {
    settings = on;
    renderCard();
    expect(toggle()).toBeChecked();
    expect(screen.getByText(/Klienci nie dostają teraz żadnych wiadomości/)).toBeInTheDocument();
    expect(screen.getByText(/\+48500100200/)).toBeInTheDocument();
    expect(screen.getByText(/owner@studio\.pl/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wyślij wszystkie testowo/ })).toBeEnabled();
  });

  it('refuses to switch on without both fields and never calls the API', async () => {
    renderCard();
    await userEvent.click(toggle());
    expect(await screen.findByText(/Najpierw wpisz numer telefonu i adres e-mail/)).toBeInTheDocument();
    expect(updateMutate).not.toHaveBeenCalled();
    expect(toggle()).not.toBeChecked();
  });

  it('switching on sends trimmed phone and email with enabled true', async () => {
    renderCard();
    await userEvent.type(screen.getByLabelText('Telefon na SMS-y'), '  500 100 200 ');
    await userEvent.type(screen.getByLabelText('E-mail na wiadomości'), ' Owner@Studio.pl ');
    await userEvent.click(toggle());
    await waitFor(() => expect(updateMutate).toHaveBeenCalledWith({ enabled: true, phone: '500 100 200', email: 'Owner@Studio.pl' }));
    expect(await screen.findByText(/Włączone\. Od teraz każda wiadomość/)).toBeInTheDocument();
  });

  it('switching off keeps the stored data and reports that customers get messages again', async () => {
    settings = on;
    updateMutate.mockResolvedValue({ ...on, enabled: false });
    renderCard();
    await userEvent.click(toggle());
    await waitFor(() => expect(updateMutate).toHaveBeenCalledWith({ enabled: false, phone: '+48500100200', email: 'owner@studio.pl' }));
    expect(await screen.findByText(/Wyłączone\. Wiadomości wychodzą do klientów/)).toBeInTheDocument();
  });

  it('shows the backend validation message when saving fails', async () => {
    settings = on;
    updateMutate.mockRejectedValue({ response: { data: { message: 'Numer telefonu „abc” nie wygląda na prawidłowy' } } });
    renderCard();
    await userEvent.clear(screen.getByLabelText('Telefon na SMS-y'));
    await userEvent.type(screen.getByLabelText('Telefon na SMS-y'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Zapisz dane' }));
    expect(await screen.findByText(/nie wygląda na prawidłowy/)).toBeInTheDocument();
  });

  it('the save button is disabled until something changed', async () => {
    settings = on;
    renderCard();
    const save = screen.getByRole('button', { name: 'Zapisz dane' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText('E-mail na wiadomości'), 'x');
    expect(save).toBeEnabled();
  });

  it('"Sprawdź szablony" shows the plan result without sending', async () => {
    planMutate.mockResolvedValue(emptyReport({
      items: [{ seq: 1, total: 1, kind: 'SMS_PRE_VISIT', channel: 'SMS', enabled: true, subject: null, body: 'x', segments: 1, findings: [], delivery: null }],
    }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /Sprawdź szablony/ }));
    expect(await screen.findByText(/Szablony są poprawne: 1 z 1/)).toBeInTheDocument();
    expect(runMutate).not.toHaveBeenCalled();
  });

  it('"Wyślij wszystkie testowo" shows the delivery summary', async () => {
    settings = on;
    runMutate.mockResolvedValue(emptyReport({
      sent: true, redirectPhone: '+48500100200', redirectEmail: 'owner@studio.pl',
      items: [{ seq: 1, total: 1, kind: 'SMS_PRE_VISIT', channel: 'SMS', enabled: true, subject: null, body: 'x', segments: 1, findings: [], delivery: { success: true, providerId: 'p', error: null } }],
    }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /Wyślij wszystkie testowo/ }));
    expect(await screen.findByText(/Wysłano 1 z 1 wiadomości na \+48500100200 i owner@studio\.pl/)).toBeInTheDocument();
  });

  it('a plan with errors lists the broken templates', async () => {
    planMutate.mockResolvedValue(emptyReport({
      errorCount: 1,
      items: [{ seq: 1, total: 1, kind: 'SMS_PRE_VISIT', channel: 'SMS', enabled: true, subject: null, body: '{{imie', segments: null,
        findings: [{ severity: 'ERROR', rule: 'orphan-braces', detail: '{{imie' }], delivery: null }],
    }));
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /Sprawdź szablony/ }));
    expect(await screen.findByText(/Nic nie wysłano: 1 błąd/)).toBeInTheDocument();
    expect(screen.getByText('SMS · SMS_PRE_VISIT')).toBeInTheDocument();
    expect(screen.getByText(/orphan-braces \(\{\{imie\)/)).toBeInTheDocument();
  });

  it('the backend refusal to run without a redirect is shown verbatim', async () => {
    settings = on;
    runMutate.mockRejectedValue({ response: { data: { message: 'Włącz najpierw przekierowanie wiadomości na swoje dane — bez niego wysyłka testowa nie ruszy' } } });
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /Wyślij wszystkie testowo/ }));
    expect(await screen.findByText(/Włącz najpierw przekierowanie/)).toBeInTheDocument();
  });
});
