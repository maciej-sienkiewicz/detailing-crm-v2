// src/modules/batch-orders/components/EntryDrawer.tsx
//
// Edytor wpisu jako panel boczny: tabela zostaje widoczna obok, a panel mówi, czego
// dotyczy (auto, tablica, data, status), zanim ktokolwiek zacznie pisać.
//
// Kolejność sekcji idzie za tym, po co się tu wchodzi: najpierw usługi i ceny (to
// zgłaszał biznes), potem zdjęcia, na końcu pojazd. Kliknięcie w kwotę w tabeli
// otwiera panel z kursorem w polu brutto.
//
// Rozliczony wpis jest zablokowany. Dawniej każdy zapis po cichu zdejmował z niego
// rozliczenie, więc poprawka literówki w uwagach wysyłała tę samą pracę do
// kontrahenta drugi raz. Teraz zmiana wymaga świadomego „Odblokuj do korekty".

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { Check, Download, Lock, RotateCcw, Trash2, Unlock, X } from 'lucide-react';
import { InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useModalViewport } from '@/common/hooks';
import { batchOrderApi } from '../api/batchOrderApi';
import {
    useCreateEntry, useDeleteEntry, useReopenEntry, useSettlementHistory, useUpdateEntry,
} from '../hooks/useBatchOrders';
import type { BatchOrderEntry } from '../types';
import {
    commonVatRate, emptyService, entryTotals, serviceToForm, toServiceItems, validateServices,
    type ServiceFormItem,
} from '../utils/entryForm';
import { apiErrorMessage, carsLabel, formatMoney, vatLabel, vehicleName } from '../utils/format';
import { formatDay, formatInstantDay, todayIso } from '../utils/period';
import { BatchOrderPhotoSection } from './BatchOrderPhotoSection';
import type { EntryFocus } from './EntriesTable';
import { ServicesEditor } from './ServicesEditor';
import { VehicleFields, type VehicleValues } from './VehicleFields';

// ─── Shell ────────────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideIn = keyframes`from { transform: translateX(32px); opacity: 0; } to { transform: none; opacity: 1; }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    background: rgba(15, 23, 42, 0.32);
    animation: ${fadeIn} 160ms ease;
`;

const Panel = styled.aside`
    display: flex;
    flex-direction: column;
    width: min(560px, 100%);
    height: 100%;
    background: ${p => p.theme.colors.surface};
    box-shadow: -16px 0 40px rgba(15, 23, 42, 0.14);
    animation: ${slideIn} 220ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const Header = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 16px 24px;
    border-bottom: 1px solid #eef2f7;

    @media (max-width: 639px) { padding: calc(14px + env(safe-area-inset-top)) 12px 14px 16px; }
`;

const HeaderText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const HeaderMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #64748b;
`;

const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${p => p.theme.colors.text};
`;

const Plate = styled.span`
    padding: 2px 8px;
    border-radius: 5px;
    background: #1e293b;
    color: #e2e8f0;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
`;

const StatusPill = styled.span<{ $tone: 'open' | 'settled' | 'correction' | 'new' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 10px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 12px;
    font-weight: 600;
    ${p => ({
        open: 'border: 1px solid #bae6fd; background: #f0f9ff; color: #075985;',
        new: 'border: 1px solid #bae6fd; background: #f0f9ff; color: #075985;',
        settled: 'border: 1px solid #86efac; background: #f0fdf4; color: #15803d;',
        correction: 'border: 1px solid #fcd34d; background: #fffbeb; color: #92400e;',
    })[p.$tone]}

    svg { width: 12px; height: 12px; }
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 10px;
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 18px; height: 18px; }
    &:hover { color: ${p => p.theme.colors.text}; }
    @media (hover: none) and (pointer: coarse) { width: 44px; height: 44px; }
`;

const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px 24px 28px;

    @media (max-width: 639px) { padding: 16px 16px 24px; }
`;

const Fieldset = styled.fieldset`
    min-width: 0;
    margin: 0;
    padding: 0;
    border: none;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionTitle = styled.h3`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};

    span { font-weight: 500; color: #64748b; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

const Totals = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: 12px;
    background: ${p => p.theme.colors.surfaceHover};
    border: 1px solid #eef2f7;
`;

const TotalsRow = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    font-variant-numeric: tabular-nums;
`;

const TotalsDivider = styled.div`
    height: 1px;
    margin: 4px 0;
    background: ${p => p.theme.colors.border};
`;

const TotalsGrand = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.theme.colors.text};

    strong { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
`;

const Banner = styled.div<{ $tone: 'amber' | 'error' }>`
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    ${p => p.$tone === 'amber'
        ? 'background: #fffbeb; border: 1px solid #fcd34d; color: #92400e;'
        : 'background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;'}
    font-size: 13px;
    line-height: 1.5;
`;

const BannerIcon = styled.div`
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #fef3c7;
    color: #92400e;

    svg { width: 17px; height: 17px; }
`;

const BannerBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;

    strong { font-size: 14px; color: #78350f; }
`;

const BannerAction = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 14px;
    border: 1px solid #f59e0b;
    border-radius: ${p => p.theme.radii.full};
    background: #fff;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    cursor: pointer;

    svg { width: 14px; height: 14px; }
    &:hover:not(:disabled) { background: #fffbeb; }
    &:disabled { opacity: 0.6; cursor: progress; }
`;

const Footer = styled.footer`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    border-top: 1px solid #eef2f7;
    background: ${p => p.theme.colors.surface};

    @media (max-width: 639px) { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
`;

const FooterGhost = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 44px;
    padding: 0 12px;
    border: none;
    border-radius: ${p => p.theme.radii.full};
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${p => p.$danger ? '#b91c1c' : p.theme.colors.textSecondary};
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:hover { background: ${p => p.$danger ? p.theme.colors.errorLight : p.theme.colors.surfaceAlt}; }
    @media (max-width: 639px) { padding: 0 8px; }
`;

const FooterSecondary = styled.button`
    margin-left: auto;
    height: 44px;
    padding: 0 18px;
    border: 1px solid #cbd5e1;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surface};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    cursor: pointer;

    &:hover { border-color: #94a3b8; }
`;

/* Otwarty edytor przejmuje okno, więc jego „Zapisz" jest na ten moment krokiem
   następnym i wolno mu być wypełnionym (CLAUDE.md §2, wyjątek edytora). */
const FooterPrimary = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 22px;
    border: none;
    border-radius: ${p => p.theme.radii.full};
    background: linear-gradient(135deg, #0284c7, #075985);
    box-shadow: 0 6px 16px rgba(3, 105, 161, 0.28);
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:disabled { opacity: 0.6; cursor: progress; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface FormState {
    vehicle: VehicleValues;
    services: ServiceFormItem[];
    notes: string;
}

function initialState(entry: BatchOrderEntry | null): FormState {
    return {
        vehicle: {
            serviceDate: entry?.serviceDate ?? todayIso(),
            make: entry?.vehicleMake ?? '',
            model: entry?.vehicleModel ?? '',
            plate: entry?.vehicleLicensePlate ?? '',
            vin: entry?.vehicleVin ?? '',
        },
        services: entry?.services.length ? entry.services.map(serviceToForm) : [emptyService()],
        notes: entry?.notes ?? '',
    };
}

interface Props {
    contractorId: string;
    contractorName: string;
    /** null = nowy wpis. */
    entry: BatchOrderEntry | null;
    focus?: EntryFocus;
    onClose: () => void;
}

export function EntryDrawer({ contractorId, contractorName, entry: initialEntry, focus, onClose }: Props) {
    const { showSuccess, showError } = useToast();
    // Po odblokowaniu panel zostaje otwarty na tym samym wpisie - już jako korekcie.
    const [entry, setEntry] = useState(initialEntry);
    const [initial] = useState(() => initialState(initialEntry));
    const [form, setForm] = useState<FormState>(initial);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState<'discard' | 'delete' | 'reopen' | null>(null);

    const createEntry = useCreateEntry(contractorId);
    const updateEntry = useUpdateEntry(contractorId);
    const deleteEntry = useDeleteEntry(contractorId);
    const reopenEntry = useReopenEntry(contractorId);

    const locked = !!entry?.isClosed;
    const { data: history } = useSettlementHistory(contractorId, locked);
    const settlement = locked && entry?.closeHistoryId
        ? history?.find(h => h.id === entry.closeHistoryId) ?? null
        : null;

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
    const totals = entryTotals(form.services);
    const vat = commonVatRate(form.services);

    const firstGrossRef = useRef<HTMLInputElement>(null);
    const photosRef = useRef<HTMLElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    function requestClose() {
        if (dirty && !locked) setConfirm('discard');
        else onClose();
    }

    // Escape, blokada przewijania tła i chowanie dolnych pasków na telefonie - te same
    // co w każdym oknie aplikacji. Póki otwarte jest okno potwierdzenia, Escape należy
    // do niego, a nie do panelu pod spodem.
    useModalViewport(true, overlayRef, confirm ? undefined : requestClose);

    useEffect(() => {
        if (focus === 'price' && !locked) {
            const el = firstGrossRef.current;
            el?.focus();
            el?.select();
        } else if (focus === 'photos') {
            photosRef.current?.scrollIntoView({ block: 'start' });
        }
        // Tylko przy otwarciu - późniejsze rendery nie mogą przestawiać kursora.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSave() {
        const problem = !form.vehicle.serviceDate ? 'Podaj datę wykonania.' : validateServices(form.services);
        if (problem) { setError(problem); return; }
        setSaving(true);
        setError('');
        const payload = {
            serviceDate: form.vehicle.serviceDate,
            vehicleMake: form.vehicle.make.trim() || undefined,
            vehicleModel: form.vehicle.model.trim() || undefined,
            vehicleLicensePlate: form.vehicle.plate.trim() || undefined,
            vehicleVin: form.vehicle.vin.trim().toUpperCase() || undefined,
            services: toServiceItems(form.services),
            notes: form.notes.trim() || undefined,
        };
        try {
            if (entry) {
                await updateEntry.mutateAsync({ entryId: entry.id, data: payload });
                showSuccess('Zapisano zmiany', `${vehicleName({ vehicleMake: payload.vehicleMake ?? null, vehicleModel: payload.vehicleModel ?? null })} za ${formatMoney(totals.grossCents)}.`);
            } else {
                await createEntry.mutateAsync(payload);
                showSuccess('Auto dodane', `Czeka na zestawienie dla ${contractorName}, ${formatMoney(totals.grossCents)}.`);
            }
            onClose();
        } catch (e) {
            setError(apiErrorMessage(e, 'Nie udało się zapisać auta. Spróbuj ponownie.'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!entry) return;
        try {
            await deleteEntry.mutateAsync(entry.id);
            showSuccess('Auto usunięte z listy');
            onClose();
        } catch (e) {
            setError(apiErrorMessage(e, 'Nie udało się usunąć auta.'));
        }
    }

    async function handleReopen() {
        if (!entry) return;
        try {
            const reopened = await reopenEntry.mutateAsync(entry.id);
            setEntry(reopened);
            showSuccess('Auto odblokowane do korekty', 'Po zapisie trafi do następnego zestawienia.');
            requestAnimationFrame(() => firstGrossRef.current?.focus());
        } catch (e) {
            setError(apiErrorMessage(e, 'Nie udało się odblokować auta.'));
        }
    }

    async function handleSnapshot() {
        if (!settlement) return;
        try {
            await batchOrderApi.downloadHistorySnapshot(settlement.id, contractorName);
        } catch {
            showError('Nie udało się pobrać zestawienia');
        }
    }

    const status = !entry ? 'new' : entry.isClosed ? 'settled' : entry.isCorrection ? 'correction' : 'open';

    return createPortal(
        <Overlay
            ref={overlayRef}
            onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <Panel role="dialog" aria-modal="true" aria-labelledby="entry-drawer-title">
                <Header>
                    <HeaderText>
                        <HeaderMeta>
                            {status === 'new' && <StatusPill $tone="new">Nowe auto</StatusPill>}
                            {status === 'open' && <StatusPill $tone="open">Czeka na zestawienie</StatusPill>}
                            {status === 'correction' && <StatusPill $tone="correction"><RotateCcw />Korekta</StatusPill>}
                            {status === 'settled' && (
                                <StatusPill $tone="settled">
                                    <Check />W zestawieniu{settlement ? ` z ${formatInstantDay(settlement.closedAt)}` : ''}
                                </StatusPill>
                            )}
                            {entry && <span>wykonane {formatDay(entry.serviceDate)}</span>}
                        </HeaderMeta>
                        <Title id="entry-drawer-title">
                            {entry ? vehicleName(entry) : 'Nowe auto'}
                            {entry?.vehicleLicensePlate && <Plate>{entry.vehicleLicensePlate}</Plate>}
                        </Title>
                        <HeaderMeta>{contractorName}</HeaderMeta>
                    </HeaderText>
                    <CloseBtn type="button" aria-label="Zamknij" onClick={requestClose}><X /></CloseBtn>
                </Header>

                <Body>
                    {error && (
                        <Banner $tone="error" role="alert">{error}</Banner>
                    )}

                    {locked && (
                        <Banner $tone="amber">
                            <BannerIcon><Lock /></BannerIcon>
                            <BannerBody>
                                <strong>To auto jest już w zestawieniu, więc jest zablokowane</strong>
                                <span>
                                    {settlement
                                        ? `Trafiło do zestawienia z ${formatInstantDay(settlement.closedAt)} (${carsLabel(settlement.entryCount)}, ${formatMoney(settlement.totalGrossCents)})${settlement.emailSent && settlement.emailRecipient ? `, wysłanego na ${settlement.emailRecipient}` : ''}. `
                                        : 'Trafiło już do zestawienia dla kontrahenta. '}
                                    Po odblokowaniu trafi do następnego zestawienia jako korekta. Utworzone już zestawienie się nie zmieni.
                                </span>
                                <BannerAction type="button" onClick={() => setConfirm('reopen')} disabled={reopenEntry.isPending}>
                                    <Unlock />Odblokuj do korekty
                                </BannerAction>
                            </BannerBody>
                        </Banner>
                    )}

                    {!locked && entry?.isCorrection && (
                        <Banner $tone="amber">
                            <BannerIcon><RotateCcw /></BannerIcon>
                            <BannerBody>
                                <strong>Korekta auta z wcześniejszego zestawienia</strong>
                                <span>Po zapisie trafi do następnego zestawienia z nową kwotą.</span>
                            </BannerBody>
                        </Banner>
                    )}

                    <Fieldset disabled={locked}>
                        <Section aria-labelledby="entry-services-title">
                            <SectionTitle id="entry-services-title">Usługi i ceny</SectionTitle>
                            <ServicesEditor
                                services={form.services}
                                onChange={services => setForm(f => ({ ...f, services }))}
                                disabled={locked}
                                firstGrossRef={firstGrossRef}
                            />
                            <Totals aria-live="polite">
                                <TotalsRow><span>Netto</span><span>{formatMoney(totals.netCents)}</span></TotalsRow>
                                <TotalsRow><span>VAT{vat !== null ? ` ${vatLabel(vat)}` : ''}</span><span>{formatMoney(totals.vatCents)}</span></TotalsRow>
                                <TotalsDivider />
                                <TotalsGrand><span>Razem brutto</span><strong>{formatMoney(totals.grossCents)}</strong></TotalsGrand>
                            </Totals>
                        </Section>
                    </Fieldset>

                    <Section ref={photosRef} aria-labelledby="entry-photos-title">
                        <SectionTitle id="entry-photos-title">
                            Zdjęcia{entry ? <span>{entry.photoCount}</span> : null}
                        </SectionTitle>
                        {entry
                            ? <BatchOrderPhotoSection entryId={entry.id} contractorId={contractorId} />
                            : <Hint>Zdjęcia dodasz po zapisaniu auta - otwórz je wtedy z listy.</Hint>}
                    </Section>

                    <Fieldset disabled={locked}>
                        <Section aria-labelledby="entry-vehicle-title">
                            <SectionTitle id="entry-vehicle-title">Pojazd i data</SectionTitle>
                            <VehicleFields
                                value={form.vehicle}
                                onChange={patch => setForm(f => ({ ...f, vehicle: { ...f.vehicle, ...patch } }))}
                                onError={setError}
                                disabled={locked}
                            />
                        </Section>

                        <Section aria-labelledby="entry-notes-title">
                            <SectionTitle id="entry-notes-title">Uwagi</SectionTitle>
                            <InputShellTextArea>
                                <BareTextArea
                                    aria-labelledby="entry-notes-title"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Np. rysa na zderzaku - bez korekty"
                                    style={{ minHeight: 72 }}
                                />
                            </InputShellTextArea>
                        </Section>
                    </Fieldset>
                </Body>

                <Footer>
                    {locked ? (
                        <>
                            {settlement && (
                                <FooterGhost type="button" onClick={handleSnapshot}>
                                    <Download />Pobierz zestawienie z {formatInstantDay(settlement.closedAt).slice(0, 5)}
                                </FooterGhost>
                            )}
                            <FooterSecondary type="button" onClick={onClose}>Zamknij</FooterSecondary>
                        </>
                    ) : (
                        <>
                            {entry && (
                                <FooterGhost type="button" $danger onClick={() => setConfirm('delete')}>
                                    <Trash2 />Usuń
                                </FooterGhost>
                            )}
                            <FooterSecondary type="button" onClick={requestClose}>Anuluj</FooterSecondary>
                            <FooterPrimary type="button" onClick={handleSave} disabled={saving}>
                                {saving ? 'Zapisywanie…' : entry ? 'Zapisz zmiany' : 'Dodaj auto'}
                            </FooterPrimary>
                        </>
                    )}
                </Footer>
            </Panel>

            <ConfirmationModal
                isOpen={confirm === 'discard'}
                title="Porzucić zmiany?"
                message="Masz niezapisane zmiany. Po zamknięciu przepadną."
                variant="warning"
                confirmText="Porzuć zmiany"
                cancelText="Wróć do edycji"
                onConfirm={onClose}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'delete'}
                title="Usunąć auto z listy?"
                message={entry ? `${vehicleName(entry)} z ${formatDay(entry.serviceDate)} zniknie z listy razem ze zdjęciami i nie trafi do zestawienia.` : ''}
                variant="danger"
                confirmText="Usuń auto"
                cancelText="Zostaw"
                onConfirm={handleDelete}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmationModal
                isOpen={confirm === 'reopen'}
                title="Odblokować auto do korekty?"
                message="Auto wróci na listę czekających i trafi do następnego zestawienia jako korekta. Zestawienie, które już powstało, zostaje bez zmian."
                variant="warning"
                confirmText="Odblokuj"
                cancelText="Zostaw zamknięte"
                onConfirm={handleReopen}
                onCancel={() => setConfirm(null)}
            />
        </Overlay>,
        document.body,
    );
}
