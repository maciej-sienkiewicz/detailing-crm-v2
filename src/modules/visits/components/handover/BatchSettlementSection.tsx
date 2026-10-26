import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import {
    PickerAddRow, PickerAvatar, PickerEmpty, PickerResults, PickerRow, PickerRowMain, PickerRowSub, PickerRowTitle,
    PickerSearch, initialsOf,
} from '@/common/components/PickerList';
import { isPiiMasked } from '@/common/pii';
import { useToast } from '@/common/components/Toast';
import { useContractors, useCreateContractor } from '@/modules/batch-orders/hooks/useBatchOrders';
import { ContractorFormModal } from '@/modules/batch-orders/components/ContractorFormModal';
import type { ContractorRequest } from '@/modules/batch-orders/types';
import {
    DecisionField as Field, DecisionStack as Stack, DecisionTitle as FieldTitle, GhostAction, Pill, PillRow, SectionProblems,
} from './HandoverKit';
import { PricesSection } from './PricesSection';
import type { PriceControls } from './SettlementSection';
import type { HandoverProblem, HandoverState, SettlementMode } from '../../types/handover';
import type { Visit } from '../../types';

/*
 * Zlecenie zbiorcze przy wydaniu: auto floty przyjęte i wydane normalną wizytą trafia na
 * listę kontrahenta, a fakturę za cały okres studio wystawia przy rozliczeniu. Przy wydaniu
 * nie powstaje więc ani paragon, ani faktura, ani ruch w kasie - zostają tylko dwie
 * decyzje: do kogo dopisać auto i za ile.
 */

const Explain = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

/**
 * Lista wyników w kolumnie rozliczenia: przewija się w sobie, więc przy stu kontrahentach
 * podsumowanie obok i przycisk wydania zostają na miejscu.
 */
const Results = styled(PickerResults)`
    flex: none;
    max-height: 288px;
`;

const Loading = styled.span`
    font-size: 13.5px;
    color: ${ui.textSecondary};
`;

interface SettlementModeFieldProps {
    value: SettlementMode;
    onChange: (mode: SettlementMode) => void;
}

/**
 * Pierwsze pytanie rozliczenia: płaci teraz czy na koniec okresu. Osobne pole nad
 * dokumentem, a nie czwarta pigułka obok „Paragon / Faktura / Inny dokument” - to inne
 * pytanie, a czwarta pigułka myliła się tam już raz (patrz paymentOptions).
 */
export const SettlementModeField = ({ value, onChange }: SettlementModeFieldProps) => (
    <Field id="handover-settlement-mode">
        <FieldTitle>Rozliczenie</FieldTitle>
        <PillRow role="group" aria-label="Rozliczenie">
            <Pill type="button" $selected={value === 'IMMEDIATE'} aria-pressed={value === 'IMMEDIATE'} onClick={() => onChange('IMMEDIATE')}>
                Teraz
            </Pill>
            <Pill type="button" $selected={value === 'BATCH'} aria-pressed={value === 'BATCH'} onClick={() => onChange('BATCH')}>
                Zlecenie zbiorcze
            </Pill>
        </PillRow>
    </Field>
);

/** Dane nowego kontrahenta z karty klienta wizyty - bez zamaskowanych pól (brak prawa do danych osobowych). */
const prefillFrom = (visit: Visit): ContractorRequest => {
    // isPiiMasked zawęża typ do `never` po stronie „nie zamaskowane” - stąd jawny string.
    const safe = (value: string | null | undefined): string =>
        !value || isPiiMasked(value) ? '' : String(value).trim();
    const customer = visit.customer;
    const person = [safe(customer.firstName), safe(customer.lastName)].filter(Boolean).join(' ');
    const address = customer.companyAddress;
    const addressLine = address
        ? [address.street, [address.postalCode, address.city].filter(Boolean).join(' ')]
            .map(part => part?.trim())
            .filter(Boolean)
            .join(', ')
        : '';
    return {
        name: safe(customer.companyName) || person,
        taxId: safe(customer.companyNip) || undefined,
        address: addressLine || undefined,
        contactPersonName: customer.companyName && person ? person : undefined,
        email: safe(customer.email) || undefined,
        phone: safe(customer.phone) || undefined,
    };
};

interface BatchSettlementSectionProps {
    visit: Visit;
    state: HandoverState;
    patch: (changes: Partial<HandoverState>) => void;
    problemsIn: (section: HandoverProblem['section']) => HandoverProblem[];
    priceControls: PriceControls;
    fmt: (grosz: number) => string;
}

export const BatchSettlementSection = ({ visit, state, patch, problemsIn, priceControls, fmt }: BatchSettlementSectionProps) => {
    const { data: contractors = [], isLoading } = useContractors();
    const createContractor = useCreateContractor();
    const { showSuccess } = useToast();
    const [query, setQuery] = useState('');
    const [isCreating, setCreating] = useState(false);
    // Wybór zwija listę do jednego wiersza; „Zmień” otwiera wyszukiwanie z powrotem.
    // Podpowiedź z poprzedniej wizyty klienta przychodzi już wybrana, więc też zwinięta.
    const [isSearching, setSearching] = useState(false);

    const active = useMemo(() => contractors.filter(c => c.isActive), [contractors]);
    const selected = active.find(c => c.id === state.batchContractorId) ?? null;
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return active;
        // NIP wpisany z kreskami albo bez - porównanie po samych cyfrach.
        const digits = q.replace(/\D/g, '');
        return active.filter(c =>
            c.name.toLowerCase().includes(q) || (!!digits && (c.taxId ?? '').replace(/\D/g, '').includes(digits)));
    }, [active, query]);

    const choose = (id: string) => {
        patch({ batchContractorId: id });
        setSearching(false);
        setQuery('');
    };

    const save = async (data: ContractorRequest) => {
        const created = await createContractor.mutateAsync(data);
        choose(created.id);
        showSuccess('Dodano kontrahenta', `Auto trafi na listę kontrahenta ${created.name}.`);
    };

    const subOf = (c: { taxId: string | null; address: string | null }) =>
        c.taxId ? `NIP ${c.taxId}` : c.address ?? 'Bez NIP';

    return (
        <Stack>
            <Field id="handover-contractor">
                <FieldTitle>Kontrahent</FieldTitle>
                <Explain>
                    Auto trafi na listę kontrahenta w zleceniach zbiorczych. Teraz nie powstaje paragon ani faktura.
                    Fakturę za cały okres wystawisz przy rozliczeniu kontrahenta.
                </Explain>
                {isLoading ? (
                    <Loading>Wczytywanie kontrahentów…</Loading>
                ) : selected && !isSearching ? (
                    <PickerRow as="div" $selected>
                        <PickerAvatar aria-hidden="true">{initialsOf(selected.name)}</PickerAvatar>
                        <PickerRowMain>
                            <PickerRowTitle>{selected.name}</PickerRowTitle>
                            <PickerRowSub>{subOf(selected)}</PickerRowSub>
                        </PickerRowMain>
                        <GhostAction type="button" onClick={() => setSearching(true)}>Zmień</GhostAction>
                    </PickerRow>
                ) : (
                    <>
                        <PickerSearch
                            value={query}
                            onChange={setQuery}
                            placeholder="Szukaj kontrahenta po nazwie albo NIP"
                            aria-label="Szukaj kontrahenta"
                            autoFocus={isSearching}
                        />
                        <Results role="listbox" aria-label="Kontrahenci">
                            {matches.map(c => (
                                <PickerRow
                                    key={c.id}
                                    type="button"
                                    role="option"
                                    aria-selected={c.id === state.batchContractorId}
                                    $selected={c.id === state.batchContractorId}
                                    onClick={() => choose(c.id)}
                                >
                                    <PickerAvatar aria-hidden="true">{initialsOf(c.name)}</PickerAvatar>
                                    <PickerRowMain>
                                        <PickerRowTitle>{c.name}</PickerRowTitle>
                                        <PickerRowSub>{subOf(c)}</PickerRowSub>
                                    </PickerRowMain>
                                </PickerRow>
                            ))}
                            {matches.length === 0 && (
                                <PickerEmpty
                                    title={active.length === 0 ? 'Nie masz jeszcze kontrahentów' : 'Brak takiego kontrahenta'}
                                    description="Dodaj go z danych klienta tej wizyty."
                                />
                            )}
                        </Results>
                        <PickerAddRow
                            label="Dodaj kontrahenta z danych klienta"
                            hint="Nazwa, NIP i adres z karty klienta, do sprawdzenia przed zapisem"
                            onClick={() => setCreating(true)}
                        />
                    </>
                )}
                <SectionProblems problems={problemsIn('contractor')} />
            </Field>

            <Field>
                <FieldTitle>Ceny usług</FieldTitle>
                <PricesSection
                    prices={state.prices}
                    onChange={priceControls.changePrice}
                    onReset={priceControls.resetPrices}
                    discount={priceControls.discount}
                    totalGross={priceControls.totalGross}
                    problems={problemsIn('prices')}
                    fmt={fmt}
                />
            </Field>

            {isCreating && (
                <ContractorFormModal
                    prefill={prefillFrom(visit)}
                    onSave={save}
                    onClose={() => setCreating(false)}
                />
            )}
        </Stack>
    );
};
