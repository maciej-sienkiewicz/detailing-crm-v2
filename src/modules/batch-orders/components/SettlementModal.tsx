// src/modules/batch-orders/components/SettlementModal.tsx
//
// Rozliczenie okresu. Zasada: przed kliknięciem widać DOKŁADNIE, co i za ile się
// rozlicza, a po kliknięciu - co się stało (także to, czego się nie udało zrobić).
//
// Co zniknęło i dlaczego:
//  - „Dodaj wpis do finansów": backend nigdy tej flagi nie obsłużył, a historia
//    i tak pokazywała „Bez wpisu finansowego". Obietnica bez pokrycia.
//  - Wybór trybu „Wszystkie / Tylko nowe" jako pierwsza rzecz w oknie: domyślnie
//    rozliczamy tylko to, co jeszcze nie było rozliczone, i mówimy to zdaniem.
//    Dołączenie rozliczonych wpisów to świadomy wyjątek pod linkiem.

import { useState } from 'react';
import styled from 'styled-components';
import { Check, Info, Lock } from 'lucide-react';
import { LockedSection } from '@/common/components/LockedSection';
import { useCapability } from '@/modules/subscription';
import { useToast } from '@/common/components/Toast';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { pluralPl } from '@/common/utils/plural';
import { useContractorEntries, useSettle, useSettlementHistory } from '../hooks/useBatchOrders';
import type { BatchContractor, SettlementMode } from '../types';
import { apiErrorMessage, entriesLabel, formatMoney, vehicleName } from '../utils/format';
import { formatDayShort, formatInstantDay, periodPhrase, type Period } from '../utils/period';

const Preview = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 16px;
    background: ${p => p.theme.colors.surfaceHover};
    border: 1px solid #eef2f7;
`;

const PreviewLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const PreviewAmount = styled.span`
    display: block;
    font-size: 30px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
`;

const PreviewMeta = styled.span`
    font-size: 13px;
    color: #64748b;
`;

const Lines = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const Line = styled.li`
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eef2f7;
    font-size: 13px;

    > span:nth-child(1) { color: #64748b; font-variant-numeric: tabular-nums; }
    > span:nth-child(2) { color: ${p => p.theme.colors.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    > span:nth-child(3) { font-weight: 600; font-variant-numeric: tabular-nums; color: ${p => p.theme.colors.text}; }
`;

const LinkBtn = styled.button`
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #0369a1;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
`;

const Note = styled.div<{ $tone: 'info' | 'warn' }>`
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
    ${p => p.$tone === 'info'
        ? 'background: #f0f9ff; border: 1px solid #bae6fd; color: #075985;'
        : 'background: #fffbeb; border: 1px solid #fcd34d; color: #92400e;'}

    > svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
`;

const EmailBlock = styled.div<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1.5px solid ${p => p.$active ? '#38bdf8' : p.theme.colors.border};
`;

const CheckLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    cursor: pointer;

    input { width: 18px; height: 18px; accent-color: #0284c7; flex-shrink: 0; }
`;

const EmailInput = styled.input<{ $invalid: boolean }>`
    margin-left: 28px;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${p => p.$invalid ? '#fca5a5' : p.theme.colors.border};
    border-radius: 10px;
    font-family: inherit;
    font-size: 16px;
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};

    &:focus { outline: none; border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }
    @media (min-width: 768px) { font-size: 14px; }
`;

const EmailHint = styled.span`
    margin-left: 28px;
    font-size: 12px;
    color: #64748b;
`;

const LockNote = styled.p`
    display: flex;
    gap: 8px;
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;

    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; }
`;

const ErrorBox = styled.div`
    padding: 12px 14px;
    border-radius: 12px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    font-size: 13px;
    color: #991b1b;
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREVIEW_LINES = 4;

interface Props {
    contractor: BatchContractor;
    period: Period;
    onClose: () => void;
}

export function SettlementModal({ contractor, period, onClose }: Props) {
    const { showSuccess, showToast } = useToast();
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const [mode, setMode] = useState<SettlementMode>('NEW_ONLY');
    const [expanded, setExpanded] = useState(false);
    // null = „nikt jeszcze nie zdecydował": domyślnie wysyłamy, gdy kontrahent ma adres.
    // Liczone przy renderze, bo uprawnienia potrafią doczytać się już po otwarciu okna -
    // stan startowy z `useState(() => comms.enabled…)` zostawał wtedy na zawsze `false`.
    const [emailChoice, setSendEmail] = useState<boolean | null>(null);
    const sendEmail = emailChoice ?? !!contractor.email;
    const [email, setEmail] = useState(contractor.email ?? '');
    const [error, setError] = useState('');

    const { data, isLoading } = useContractorEntries(
        contractor.id, period.from, period.to, mode === 'ALL' ? 'ALL' : 'OPEN',
    );
    const { data: history } = useSettlementHistory(contractor.id);
    const settle = useSettle(contractor.id);

    const entries = data?.entries ?? [];
    const summary = data?.summary;
    const settledBefore = data?.settledSummary.entryCount ?? 0;
    const corrections = entries.filter(e => e.isCorrection).length;
    const visibleLines = expanded ? entries : entries.slice(0, PREVIEW_LINES);

    // Czy zestawienie za ten okres poszło już e-mailem - przy „dołącz rozliczone"
    // kontrahent dostałby drugi raz te same pozycje.
    const previousEmail = (history ?? [])
        .filter(r => r.emailSent && r.periodFrom && r.periodTo && r.periodFrom <= period.to && r.periodTo >= period.from)
        .sort((a, b) => b.closedAt.localeCompare(a.closedAt))[0] ?? null;

    const emailOn = comms.enabled && sendEmail;
    const emailInvalid = emailOn && !EMAIL_RE.test(email.trim());
    const count = summary?.entryCount ?? 0;
    const canSettle = !isLoading && count > 0 && !emailInvalid && !settle.isPending;

    async function handleConfirm() {
        setError('');
        try {
            const result = await settle.mutateAsync({
                from: period.from,
                to: period.to,
                mode,
                sendEmail: emailOn,
                emailOverride: emailOn ? email.trim() : undefined,
            });
            const what = `${entriesLabel(result.closedEntryCount)} · ${formatMoney(result.totalGrossCents)}`;
            if (result.emailRequested && !result.emailSent) {
                // Rozliczenie jest zapisane - nie udała się tylko wysyłka. Mówimy to
                // wprost, zamiast zostawiać wrażenie, że kontrahent już ma zestawienie.
                showToast({
                    variant: 'warning',
                    title: 'Rozliczono, ale e-mail nie wyszedł',
                    message: `${what}. Pobierz zestawienie z historii rozliczeń i wyślij je ręcznie.`,
                    duration: 10000,
                });
            } else {
                showSuccess('Okres rozliczony', result.emailSent ? `${what} · zestawienie wysłane na ${email.trim()}` : what);
            }
            onClose();
        } catch (e) {
            setError(apiErrorMessage(e, 'Nie udało się rozliczyć okresu. Spróbuj ponownie.'));
        }
    }

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Rozlicz {periodPhrase(period)}</ModalTitle>
                    <ModalSubtitle>{contractor.name}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <ErrorBox role="alert">{error}</ErrorBox>}

                <Preview aria-busy={isLoading}>
                    <div>
                        <PreviewLabel>Rozliczasz</PreviewLabel>
                        <PreviewAmount>{isLoading ? '…' : formatMoney(summary?.totalGrossCents ?? 0)}</PreviewAmount>
                        <PreviewMeta>
                            {isLoading ? 'Wczytywanie wpisów…'
                                : count === 0 ? 'Nie ma wpisów do rozliczenia w tym okresie.'
                                    : `${entriesLabel(count)} · ${formatMoney(summary?.totalNetCents ?? 0)} netto`}
                        </PreviewMeta>
                    </div>
                    {entries.length > 0 && (
                        <Lines>
                            {visibleLines.map(e => (
                                <Line key={e.id}>
                                    <span>{formatDayShort(e.serviceDate)}</span>
                                    <span>
                                        {vehicleName(e)}{e.vehicleLicensePlate ? ` · ${e.vehicleLicensePlate}` : ''}
                                        {e.services[0] ? ` · ${e.services[0].name}` : ''}
                                        {e.isCorrection ? ' · korekta' : ''}
                                    </span>
                                    <span>{formatMoney(e.grossAmountCents)}</span>
                                </Line>
                            ))}
                        </Lines>
                    )}
                    {entries.length > PREVIEW_LINES && (
                        <LinkBtn type="button" onClick={() => setExpanded(v => !v)}>
                            {expanded ? 'Zwiń listę' : `Pokaż pozostałe ${entries.length - PREVIEW_LINES}`}
                        </LinkBtn>
                    )}
                </Preview>

                {corrections > 0 && (
                    <Note $tone="warn">
                        <Info />
                        <span>W zestawieniu są korekty wcześniej rozliczonych wpisów: {entriesLabel(corrections)}.</span>
                    </Note>
                )}

                {settledBefore > 0 && (
                    <Note $tone="info">
                        <Info />
                        <span>
                            {mode === 'NEW_ONLY'
                                ? <>{entriesLabel(settledBefore)} z tego okresu {pluralPl(settledBefore, 'został już rozliczony', 'zostały już rozliczone', 'zostało już rozliczonych')}{data?.lastSettledAt ? ` ${formatInstantDay(data.lastSettledAt)}` : ''}. {settledBefore === 1 ? 'Nie trafi' : 'Nie trafią'} do zestawienia drugi raz.{' '}
                                    <LinkBtn type="button" onClick={() => setMode('ALL')}>Dołącz je mimo to</LinkBtn></>
                                : <>Zestawienie obejmie też {entriesLabel(settledBefore)} rozliczone wcześniej.{' '}
                                    <LinkBtn type="button" onClick={() => setMode('NEW_ONLY')}>Pomiń je</LinkBtn></>}
                        </span>
                    </Note>
                )}

                <LockedSection
                    locked={!comms.enabled}
                    message="Wysyłka zestawienia e-mailem wymaga modułu Automatyzacja kontaktu z klientem."
                >
                    <EmailBlock $active={emailOn}>
                        <CheckLabel>
                            <input
                                type="checkbox"
                                checked={emailOn}
                                disabled={!comms.enabled}
                                onChange={e => setSendEmail(e.target.checked)}
                            />
                            Wyślij zestawienie PDF e-mailem
                        </CheckLabel>
                        {emailOn && (
                            <>
                                <EmailInput
                                    aria-label="Adres e-mail"
                                    type="email"
                                    value={email}
                                    $invalid={emailInvalid && email.length > 0}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="rozliczenia@firma.pl"
                                />
                                <EmailHint>
                                    {!contractor.email
                                        ? 'Adres zapiszemy w karcie kontrahenta.'
                                        : email.trim() === contractor.email ? 'Adres z karty kontrahenta.' : 'Wyślemy na ten adres tylko tym razem.'}
                                </EmailHint>
                            </>
                        )}
                        {emailOn && mode === 'ALL' && previousEmail && (
                            <Note $tone="warn">
                                <Info />
                                <span>
                                    Zestawienie za ten okres poszło już e-mailem {formatInstantDay(previousEmail.closedAt)}. Z rozliczonymi wpisami kontrahent dostanie te pozycje drugi raz.
                                </span>
                            </Note>
                        )}
                    </EmailBlock>
                </LockedSection>

                <LockNote>
                    <Lock />
                    Po rozliczeniu wpisy zostaną zablokowane. Poprawka wymaga odblokowania i trafia do kolejnego rozliczenia jako korekta.
                </LockNote>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={settle.isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleConfirm} disabled={!canSettle}>
                    <Check size={16} />
                    {settle.isPending
                        ? 'Rozliczanie…'
                        : count > 0 ? `Rozlicz ${entriesLabel(count)} · ${formatMoney(summary?.totalGrossCents ?? 0)}` : 'Rozlicz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
