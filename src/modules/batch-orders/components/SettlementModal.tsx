// src/modules/batch-orders/components/SettlementModal.tsx
//
// Tworzenie zestawienia: PDF z listą aut i sumą do zapłaty dla kontrahenta. Dawniej
// „Rozlicz okres" - słowo, które nic nie mówiło osobie widzącej ekran pierwszy raz.
// Zasada: przed kliknięciem widać DOKŁADNIE, które auta i za ile trafią do
// zestawienia, a po kliknięciu - co się stało (także to, czego się nie udało zrobić).
//
// Co zniknęło i dlaczego:
//  - „Dodaj wpis do finansów": backend nigdy tej flagi nie obsłużył, a historia
//    i tak pokazywała „Bez wpisu finansowego". Obietnica bez pokrycia.
//  - Link „Dołącz je mimo to": dołączał auta z wcześniejszych zestawień, a historia
//    liczyła je potem dwa razy. Oba sposoby są poprawne biznesowo (decyzja z 23.10.2026:
//    „nowy, poprawiony plik za cały okres" albo „tylko kolejne auta po rozliczonym
//    etapie"), więc gdy w okresie są rozliczone auta, okno daje dwie jawne opcje
//    z kwotami, a pełne zestawienie oznacza poprzednie jako zastąpione.
//  - Pole „wyślij e-mailem" przy wyłączonej wiadomości: zaznaczało się samo, a serwer
//    i tak niczego nie wysyłał. Teraz okno mówi, że wysyłka jest wyłączona i gdzie ją włączyć.

import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { isValidEmail } from '@/common/utils/validators';
import { useContractorEntries, useSettle, useSettlementHistory } from '../hooks/useBatchOrders';
import { useMessageDefaults } from '@/modules/message-templates/hooks/useMessageDefaults';
import type { BatchContractor, SettlementMode } from '../types';
import { carsLabel, formatMoney, grossForCars, vehicleName } from '../utils/format';
import { formatDayShort, formatInstantDay, periodIn, periodPhrase, type Period } from '../utils/period';
import { problemDetail } from '@/core/problem';

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
    display: block;
    margin-top: 2px;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

const Lines = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

/* Data, auto (z usługą w drugiej linii) i kwota - trzy kolumny zamiast jednego
   ciągu „BMW X5 · WX 4821K · Korekta" (CLAUDE.md §4). */
const Line = styled.li`
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px solid #eef2f7;
    font-size: 13px;

    > span:nth-child(1) { color: #64748b; font-variant-numeric: tabular-nums; }
    > span:nth-child(3) { font-weight: 600; font-variant-numeric: tabular-nums; color: ${p => p.theme.colors.text}; }
`;

const LineCar = styled.span`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    > span:first-child { display: flex; gap: 8px; color: ${p => p.theme.colors.text}; }
    > span:last-child { font-size: 12px; color: #64748b; }
    b { font-weight: 600; }
    em { font-style: normal; font-weight: 600; color: #92400e; }
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
        ? 'background: rgba(3, 105, 161, 0.06); border: 1px solid rgba(3, 105, 161, 0.25); color: #075985;'
        : 'background: #fffbeb; border: 1px solid #fcd34d; color: #92400e;'}

    > svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
`;

const EmailBlock = styled.div<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1.5px solid ${p => p.$active ? 'rgba(3, 105, 161, 0.35)' : p.theme.colors.border};
`;

const CheckLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    cursor: pointer;

    input { width: 18px; height: 18px; accent-color: #0369a1; flex-shrink: 0; }
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

    &:focus { outline: none; border-color: rgba(3, 105, 161, 0.35); box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.15); }
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

/* Dwa sposoby zestawienia, gdy w okresie są już rozliczone auta. Karty wyboru bez
   wypełnienia - jedynym wypełnionym elementem okna zostaje „Utwórz zestawienie". */
const ModeGroup = styled.fieldset`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;

    legend {
        padding: 0;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 600;
        color: ${p => p.theme.colors.text};
    }
`;

const ModeOption = styled.label<{ $selected: boolean }>`
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    gap: 4px 10px;
    align-items: baseline;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1.5px solid ${p => p.$selected ? 'rgba(3, 105, 161, 0.55)' : p.theme.colors.border};
    background: ${p => p.$selected ? 'rgba(3, 105, 161, 0.05)' : 'transparent'};
    cursor: pointer;

    input { margin: 0; accent-color: #0369a1; align-self: center; }
    b { font-size: 14px; color: ${p => p.theme.colors.text}; }
    > span:last-of-type { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; color: ${p => p.theme.colors.text}; }
    small { grid-column: 2 / -1; font-size: 12.5px; line-height: 1.45; color: #64748b; }
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
    const messageDefaults = useMessageDefaults();
    // Wiadomość wyłączona w ustawieniach: serwer jej nie wyśle, więc okno nie udaje, że może.
    const templateOff = comms.enabled && messageDefaults.emailEnabled('batchOrderClose') === false;
    // Domyślnie zaznaczone tylko z poprawnym adresem w karcie - błędny adres zaznaczał
    // pole i blokował „Utwórz zestawienie" bez słowa wyjaśnienia. Dalej „Domyślnie zaznacz"
    // z ustawień (bez dostępu do nich: zaznaczone, jak dotąd).
    const cardEmailValid = !!contractor.email && isValidEmail(contractor.email);
    const sendEmail = !templateOff
        && (emailChoice ?? (cardEmailValid && (messageDefaults.email('batchOrderClose') ?? true)));
    const [email, setEmail] = useState(contractor.email ?? '');
    const [error, setError] = useState('');

    const { data, isLoading } = useContractorEntries(
        contractor.id, period.from, period.to, mode === 'ALL' ? 'ALL' : 'OPEN',
    );
    const { data: history } = useSettlementHistory(contractor.id);
    const settle = useSettle(contractor.id);

    const entries = data?.entries ?? [];
    const summary = data?.summary;
    const openSummary = data?.openSummary;
    const settledSummary = data?.settledSummary;
    const settledBefore = settledSummary?.entryCount ?? 0;
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
    const lastSettled = data?.lastSettledAt ? ` z ${formatInstantDay(data.lastSettledAt)}` : '';

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
            const what = `${carsLabel(result.closedEntryCount)} na ${formatMoney(result.totalGrossCents)}`;
            const title = result.documentNumber ? `Zestawienie ${result.documentNumber} utworzone` : 'Zestawienie utworzone';
            if (result.emailRequested && !result.emailSent) {
                // Zestawienie jest zapisane - nie udała się tylko wysyłka. Mówimy to
                // wprost, z przyczyną od serwera, zamiast zostawiać wrażenie, że kontrahent już je ma.
                showToast({
                    variant: 'warning',
                    title: `${title}, ale e-mail nie wyszedł`,
                    message: `${result.emailError ?? 'Wysyłka się nie udała.'} Zestawienie obejmuje ${what}. Pobierz je z historii zestawień i wyślij ręcznie.`,
                    duration: 12000,
                });
            } else {
                showSuccess(
                    title,
                    result.emailSent
                        ? `Obejmuje ${what}. Wysłaliśmy je na ${email.trim()}.`
                        : `Obejmuje ${what}. PDF znajdziesz w historii zestawień.`,
                );
            }
            onClose();
        } catch (e) {
            setError(problemDetail(e, 'Nie udało się utworzyć zestawienia. Spróbuj ponownie.'));
        }
    }

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Nowe zestawienie: {periodPhrase(period)}</ModalTitle>
                    <ModalSubtitle>{contractor.name}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <ErrorBox role="alert">{error}</ErrorBox>}

                <Preview aria-busy={isLoading}>
                    <div>
                        <PreviewLabel>Suma do zapłaty w zestawieniu</PreviewLabel>
                        <PreviewAmount>{isLoading ? '\u00a0' : formatMoney(summary?.totalGrossCents ?? 0)}</PreviewAmount>
                        <PreviewMeta>
                            {isLoading ? 'Wczytywanie aut…'
                                : count === 0 ? `Żadne auto nie czeka na zestawienie ${periodIn(period)}.`
                                    : `${grossForCars(count, summary?.totalNetCents ?? 0)} ${emailOn
                                        ? 'PDF wyślemy kontrahentowi e-mailem.'
                                        : 'PDF pobierzesz z historii zestawień i przekażesz kontrahentowi sam.'}`}
                        </PreviewMeta>
                    </div>
                    {entries.length > 0 && (
                        <Lines>
                            {visibleLines.map(e => (
                                <Line key={e.id}>
                                    <span>{formatDayShort(e.serviceDate)}</span>
                                    <LineCar>
                                        <span>
                                            <b>{vehicleName(e)}</b>
                                            {e.vehicleLicensePlate && <span>{e.vehicleLicensePlate}</span>}
                                            {e.isCorrection && <em>korekta</em>}
                                        </span>
                                        {e.services[0] && (
                                            <span>
                                                {e.services[0].name}
                                                {e.services.length > 1 ? ` i ${e.services.length - 1} ${pluralPl(e.services.length - 1, 'inna', 'inne', 'innych')}` : ''}
                                            </span>
                                        )}
                                    </LineCar>
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

                {settledBefore > 0 && openSummary && settledSummary && (
                    <ModeGroup>
                        <legend>
                            {carsLabel(settledBefore)} z tego okresu {pluralPl(settledBefore, 'jest', 'są', 'jest')} już w zestawieniu{lastSettled}. Co wysłać?
                        </legend>
                        <ModeOption $selected={mode === 'NEW_ONLY'}>
                            <input type="radio" name="settlement-mode" checked={mode === 'NEW_ONLY'} onChange={() => setMode('NEW_ONLY')} />
                            <b>Tylko nowe auta</b>
                            <span>{carsLabel(openSummary.entryCount)}, {formatMoney(openSummary.totalGrossCents)}</span>
                            <small>Auta z wcześniejszego zestawienia zostają w nim. Dobre, gdy rozliczasz kolejny etap.</small>
                        </ModeOption>
                        <ModeOption $selected={mode === 'ALL'}>
                            <input type="radio" name="settlement-mode" checked={mode === 'ALL'} onChange={() => setMode('ALL')} />
                            <b>Pełne zestawienie za okres</b>
                            <span>
                                {carsLabel(openSummary.entryCount + settledSummary.entryCount)}, {formatMoney(openSummary.totalGrossCents + settledSummary.totalGrossCents)}
                            </span>
                            <small>Nowy, poprawiony plik ze wszystkimi autami okresu. Zastąpi wcześniejsze zestawienie w historii.</small>
                        </ModeOption>
                    </ModeGroup>
                )}

                {corrections > 0 && (
                    <Note $tone="warn">
                        <Info />
                        <span>
                            Korekty aut z wcześniejszych zestawień: {carsLabel(corrections)}. Idą pełną kwotą po poprawce, a w PDF są oznaczone jako korekta.
                        </span>
                    </Note>
                )}

                <LockedSection
                    locked={!comms.enabled}
                    message="Wysyłka zestawienia e-mailem wymaga modułu Automatyzacja kontaktu z klientem."
                >
                    <EmailBlock $active={emailOn}>
                        {templateOff ? (
                            <Note $tone="info">
                                <Info />
                                <span>
                                    Wysyłka zestawień e-mailem jest wyłączona. Włączysz ją w{' '}
                                    <Link to="/settings?tab=templates">Ustawieniach, w Wiadomościach do klientów</Link>.
                                    {' '}Zestawienie zapiszemy, a PDF pobierzesz z historii.
                                </span>
                            </Note>
                        ) : (
                        <CheckLabel>
                            <input
                                type="checkbox"
                                checked={emailOn}
                                disabled={!comms.enabled}
                                onChange={e => setSendEmail(e.target.checked)}
                            />
                            Wyślij zestawienie kontrahentowi e-mailem
                        </CheckLabel>
                        )}
                        {emailOn && (
                            <>
                                <EmailInput
                                    aria-label="Adres e-mail"
                                    type="email"
                                    value={email}
                                    $invalid={emailInvalid && email.length > 0}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="ksiegowosc@firma.pl"
                                />
                                <EmailHint role={emailInvalid ? 'alert' : undefined}>
                                    {emailInvalid
                                        ? 'Ten adres jest niepoprawny. Popraw go albo odznacz wysyłkę.'
                                        : !contractor.email
                                            ? 'Adres zapiszemy w karcie kontrahenta.'
                                            : email.trim() === contractor.email ? 'Adres z karty kontrahenta.' : 'Wyślemy na ten adres tylko tym razem.'}
                                </EmailHint>
                            </>
                        )}
                        {emailOn && mode === 'ALL' && previousEmail && (
                            <Note $tone="warn">
                                <Info />
                                <span>
                                    Zestawienie za ten okres poszło już e-mailem {formatInstantDay(previousEmail.closedAt)}. Kontrahent dostanie drugi plik za ten sam okres, ze wszystkimi autami. Uprzedź go, że nowy zastępuje poprzedni.
                                </span>
                            </Note>
                        )}
                    </EmailBlock>
                </LockedSection>

                <LockNote>
                    <Lock />
                    Auta z zestawienia zostaną zamknięte, żeby nie trafiły do kolejnego drugi raz. Poprawkę zrobisz przyciskiem „Popraw auto” w oknie auta.
                </LockNote>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={settle.isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleConfirm} disabled={!canSettle}>
                    <Check size={16} />
                    {settle.isPending ? 'Tworzenie…' : 'Utwórz zestawienie'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
