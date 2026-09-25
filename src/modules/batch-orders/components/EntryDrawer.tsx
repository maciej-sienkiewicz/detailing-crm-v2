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
import styled from 'styled-components';
import { Check, ChevronDown, Download, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react';
import { InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { Button, DrawerBody, DrawerFooterSpacer, SideDrawer, StatusPill } from '@/common/components/ui';
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

// ─── Nagłówek i sekcje ─────────────────────────────────────────────────────────

/**
 * Nazwa auta w nagłówku jest przyciskiem: prowadzi do sekcji „Pojazd i data". Przy
 * edycji ta sekcja stoi pod usługami i zdjęciami, a to po nazwę auta sięga się
 * odruchowo, gdy trzeba poprawić markę czy tablicę.
 */
const TitleBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0 -6px;
    padding: 2px 6px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;

    > svg { width: 16px; height: 16px; color: #94a3b8; transition: color ${p => p.theme.transitions.fast}; }
    &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
    &:hover > svg { color: #0369a1; }
    &:focus-visible { outline: 2px solid #38bdf8; outline-offset: 1px; }
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
    /* Przewinięcie do sekcji zostawia oddech nad jej tytułem. */
    scroll-margin-top: 16px;
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
    const vehicleRef = useRef<HTMLElement>(null);

    function scrollToVehicle(behavior: ScrollBehavior = 'smooth') {
        vehicleRef.current?.scrollIntoView({ block: 'start', behavior });
    }

    function requestClose() {
        if (dirty && !locked) setConfirm('discard');
        else onClose();
    }

    useEffect(() => {
        if (focus === 'price' && !locked) {
            const el = firstGrossRef.current;
            el?.focus();
            el?.select();
        } else if (focus === 'photos') {
            photosRef.current?.scrollIntoView({ block: 'start' });
        } else if (focus === 'vehicle') {
            scrollToVehicle('auto');
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

    // Sekcje jako elementy, bo nowe auto i edycja układają je w innej kolejności.
    const servicesSection = (
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
    );

    const photosSection = entry && (
        <Section ref={photosRef} aria-labelledby="entry-photos-title">
            <SectionTitle id="entry-photos-title">
                Zdjęcia<span>{entry.photoCount}</span>
            </SectionTitle>
            <BatchOrderPhotoSection entryId={entry.id} contractorId={contractorId} />
        </Section>
    );

    const vehicleSection = (
        <Fieldset disabled={locked}>
            <Section ref={vehicleRef} aria-labelledby="entry-vehicle-title">
                <SectionTitle id="entry-vehicle-title">Pojazd i data</SectionTitle>
                <VehicleFields
                    value={form.vehicle}
                    onChange={patch => setForm(f => ({ ...f, vehicle: { ...f.vehicle, ...patch } }))}
                    onError={setError}
                    disabled={locked}
                />
            </Section>
        </Fieldset>
    );

    const notesSection = (
        <Fieldset disabled={locked}>
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
    );

    return (
        <SideDrawer
            onClose={requestClose}
            // Póki otwarte jest okno potwierdzenia, Escape należy do niego, a nie do panelu.
            escapeEnabled={!confirm}
            titleId="entry-drawer-title"
            status={(
                <>
                    {status === 'new' && <StatusPill $tone="info">Nowe auto</StatusPill>}
                    {status === 'open' && <StatusPill $tone="info">Czeka na zestawienie</StatusPill>}
                    {status === 'correction' && <StatusPill $tone="warn"><RotateCcw />Korekta</StatusPill>}
                    {status === 'settled' && (
                        <StatusPill $tone="ok">
                            <Check />W zestawieniu{settlement ? ` z ${formatInstantDay(settlement.closedAt)}` : ''}
                        </StatusPill>
                    )}
                    {entry && <span>wykonane {formatDay(entry.serviceDate)}</span>}
                </>
            )}
            title={entry ? (
                <TitleBtn type="button" onClick={() => scrollToVehicle()} title="Przejdź do danych pojazdu">
                    {vehicleName(entry)}
                    {entry.vehicleLicensePlate && <Plate>{entry.vehicleLicensePlate}</Plate>}
                    <ChevronDown aria-hidden="true" />
                </TitleBtn>
            ) : 'Nowe auto'}
            subtitle={contractorName}
            footer={(
                <>
                    {locked ? (
                        <>
                            {settlement && (
                                <Button variant="ghost" size="lg" onClick={handleSnapshot}>
                                    <Download />Pobierz zestawienie z {formatInstantDay(settlement.closedAt).slice(0, 5)}
                                </Button>
                            )}
                            <DrawerFooterSpacer />
                            <Button size="lg" onClick={onClose}>Zamknij</Button>
                        </>
                    ) : (
                        <>
                            {entry && (
                                <Button variant="danger" size="lg" onClick={() => setConfirm('delete')}>
                                    <Trash2 />Usuń
                                </Button>
                            )}
                            <DrawerFooterSpacer />
                            <Button size="lg" onClick={requestClose}>Anuluj</Button>
                            {/* Otwarty edytor przejmuje okno, więc jego „Zapisz" jest na ten moment
                                krokiem następnym i wolno mu być wypełnionym (CLAUDE.md §2). */}
                            <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
                                {saving ? 'Zapisywanie…' : entry ? 'Zapisz zmiany' : 'Dodaj auto'}
                            </Button>
                        </>
                    )}
                </>
            )}
            overlays={(
                <>
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
                </>
            )}
        >
            <DrawerBody>
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

                {entry ? (
                    <>
                        {servicesSection}
                        {photosSection}
                        {vehicleSection}
                        {notesSection}
                    </>
                ) : (
                    // Nowe auto: najpierw KTÓRE auto, potem co przy nim zrobiono -
                    // w tej kolejności pracownik ma to przed oczami przy aucie.
                    // Zdjęć przy nowym aucie jeszcze nie ma (dodaje się je po zapisie).
                    <>
                        {vehicleSection}
                        {servicesSection}
                        {notesSection}
                    </>
                )}
            </DrawerBody>
        </SideDrawer>
    );
}
