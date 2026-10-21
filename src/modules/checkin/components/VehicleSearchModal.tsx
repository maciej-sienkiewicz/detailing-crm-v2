// src/modules/checkin/components/VehicleSearchModal.tsx
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Motorbike } from 'lucide-react';
import { useDebounce } from '@/common/hooks';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    Select,
    FormErrorMsg,
} from '@/common/components/Form';
import {
    PickerSearch,
    PickerPane,
    PickerResults,
    PickerStatus,
    PickerSkeleton,
    PickerRow,
    PickerAvatar,
    PickerRowMain,
    PickerRowTitle,
    PickerRowSub,
    PickerRowMeta,
    PickerAddRow,
    PickerEmpty,
} from '@/common/components/PickerList';
import { vehicleApi } from '@/modules/vehicles/api/vehicleApi';
import { customerVehiclesQuery } from '@/modules/customers/api/customerVehiclesQuery';
import type { VehicleListItem } from '@/modules/vehicles/types';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { VehicleKindSwitch } from '@/modules/vehicles/components/VehicleKindSwitch';
import { DEFAULT_VEHICLE_KIND, type VehicleKind } from '@/modules/vehicles/vehicleKind';

// Tablica, rok i właściciel to osobne atrybuty, więc osobne elementy z odstępem,
// a nie ciąg sklejony kropką (CLAUDE.md §4).
const RowSubParts = ({ parts }: { parts: Array<string | number | null | undefined> }) => {
    const shown = parts.filter((p): p is string | number => p !== null && p !== undefined && p !== '');
    return (
        <PickerRowSub style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12 }}>
            {shown.length > 0 ? shown.map((p, i) => <span key={i}>{p}</span>) : '-'}
        </PickerRowSub>
    );
};

const CarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 17h14M6.5 17a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm14 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
        <path d="M3 17v-4.2a2 2 0 0 1 .34-1.11l1.9-2.85A2 2 0 0 1 6.9 8h10.2a2 2 0 0 1 1.66.89l1.9 2.85A2 2 0 0 1 21 12.8V17" />
        <path d="M4 12h16" />
    </svg>
);

// Na liście obok siebie stoją auta i motocykle klienta - ikona mówi, który jest który,
// zanim ktoś doczyta model. Brak rodzaju w danych to samochód.
const VehicleKindIcon = ({ kind }: { kind?: VehicleKind | null }) => (
    kind === 'MOTORCYCLE'
        ? <Motorbike strokeWidth={1.8} aria-hidden="true" data-kind="MOTORCYCLE" />
        : <CarIcon />
);

export interface SelectedVehicle {
    id?: string;
    /** Brak - samochód (źródło wyboru nie zna rodzaju). */
    kind?: VehicleKind;
    brand: string;
    model: string;
    yearOfProduction: number;
    licensePlate?: string;
    color?: string;
    isNew: boolean;
    /**
     * Customer ids already registered as owners of an existing vehicle. Lets the caller
     * notice that the visit's customer is not among them and offer to write them on.
     * Undefined when the source of the pick does not know the owners.
     */
    ownerCustomerIds?: string[];
}

interface VehicleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (vehicle: SelectedVehicle) => void;
    /** Customer whose own vehicles are offered first, before any search is typed. */
    customerId?: string;
    /** Id of the vehicle already attached to the record, marked as "Obecny" in the list. */
    currentVehicleId?: string;
    /** Present when the user is replacing a vehicle rather than picking the first one. */
    isReplacing?: boolean;
}

type VehicleMode = 'search' | 'new';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

const EMPTY_FORM: {
    kind: VehicleKind;
    brand: string;
    model: string;
    yearOfProduction: number;
    licensePlate: string;
    color: string;
} = {
    kind: DEFAULT_VEHICLE_KIND,
    brand: '',
    model: '',
    yearOfProduction: CURRENT_YEAR,
    licensePlate: '',
    color: '',
};

export const VehicleSearchModal = ({
    isOpen,
    onClose,
    onSelect,
    customerId,
    currentVehicleId,
    isReplacing = false,
}: VehicleSearchModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<VehicleMode>('search');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const debouncedQuery = useDebounce(searchQuery, 300);
    const hasQuery = debouncedQuery.trim().length > 0;

    const { data: vehicleResponse, isLoading, isFetching, isPlaceholderData } = useQuery({
        queryKey: ['vehicles', debouncedQuery],
        queryFn: ({ signal }) => vehicleApi.getVehicles({
            search: debouncedQuery,
            page: 1,
            limit: 50,
        }, signal),
        enabled: isOpen && mode === 'search' && hasQuery,
        // Keep the previous matches visible while the next query runs, so typing does not
        // strobe the list between results and an empty box.
        placeholderData: keepPreviousData,
    });

    // The car the customer already owns is by far the most likely pick, so it is offered
    // before anything is typed instead of hiding behind a search the user has to guess.
    const { data: customerVehicles = [], isLoading: isLoadingCustomerVehicles } = useQuery({
        ...customerVehiclesQuery(customerId ?? ''),
        enabled: isOpen && mode === 'search' && !!customerId,
    });

    // Every close path (footer, X, Escape, backdrop) runs through onClose, so clearing
    // here is enough to guarantee the next open starts from a blank search and form.
    const handleClose = () => {
        setSearchQuery('');
        setMode('search');
        setFormData(EMPTY_FORM);
        setErrors({});
        onClose();
    };

    const handleVehicleClick = (vehicle: VehicleListItem) => {
        onSelect({
            id: vehicle.id,
            kind: vehicle.kind,
            brand: vehicle.brand,
            model: vehicle.model,
            yearOfProduction: vehicle.yearOfProduction,
            licensePlate: vehicle.licensePlate || undefined,
            isNew: false,
            ownerCustomerIds: vehicle.owners.map(o => o.customerId),
        });
        handleClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.brand || formData.brand.trim().length < 2) {
            newErrors.brand = 'Marka musi mieć co najmniej 2 znaki';
        }
        if (!formData.model || formData.model.trim().length < 1) {
            newErrors.model = 'Model jest wymagany';
        }
        if (!formData.yearOfProduction || formData.yearOfProduction < 1900 || formData.yearOfProduction > CURRENT_YEAR + 1) {
            newErrors.yearOfProduction = `Rok produkcji musi być między 1900 a ${CURRENT_YEAR + 1}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;

        onSelect({
            kind: formData.kind,
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            yearOfProduction: formData.yearOfProduction,
            licensePlate: formData.licensePlate.trim() || undefined,
            color: formData.color.trim() || undefined,
            isNew: true,
        });
        handleClose();
    };

    const modalTitle = mode === 'new'
        ? 'Nowy pojazd'
        : (isReplacing ? 'Zmień pojazd' : 'Wybierz pojazd');
    const modalSubtitle = mode === 'new'
        ? 'Pojazd zapiszemy razem z wizytą.'
        : (isReplacing
            ? 'Wybierz inny pojazd dla tej wizyty lub dodaj nowy.'
            : 'Znajdź pojazd po marce, modelu lub numerze rejestracyjnym.');

    const vehicles = vehicleResponse?.data || [];
    // Before anything is typed the list shows the customer's own cars; after that it shows
    // the search. Either way it is one list in one region, so the window never resizes.
    const isStale = hasQuery && isPlaceholderData;
    const isLoadingList = hasQuery
        ? (isLoading || (isStale && vehicles.length === 0))
        : (!!customerId && isLoadingCustomerVehicles);

    const statusText = hasQuery
        ? (isLoadingList || isStale
            ? 'Wyszukiwanie…'
            : vehicles.length > 0
                ? `Znaleziono: ${vehicles.length}`
                : 'Nie znaleziono pojazdów')
        : (isLoadingList
            ? 'Wczytywanie pojazdów klienta…'
            : customerVehicles.length > 0
                ? 'Pojazdy tego klienta'
                : '');

    const renderSearchResults = () => {
        if (isLoadingList) {
            return <PickerSkeleton />;
        }

        if (!hasQuery) {
            if (customerVehicles.length > 0) {
                return customerVehicles.map((v) => (
                    <PickerRow
                        key={v.id}
                        type="button"
                        $selected={v.id === currentVehicleId}
                        onClick={() => {
                            onSelect({
                                id: v.id,
                                kind: v.kind,
                                brand: v.brand,
                                model: v.model,
                                yearOfProduction: v.year,
                                licensePlate: v.licensePlate || undefined,
                                isNew: false,
                                ownerCustomerIds: customerId ? [customerId] : undefined,
                            });
                            handleClose();
                        }}
                    >
                        <PickerAvatar><VehicleKindIcon kind={v.kind} /></PickerAvatar>
                        <PickerRowMain>
                            <PickerRowTitle>{v.brand} {v.model}</PickerRowTitle>
                            <RowSubParts parts={[v.licensePlate, v.year]} />
                        </PickerRowMain>
                        {v.id === currentVehicleId && <PickerRowMeta>Obecny</PickerRowMeta>}
                    </PickerRow>
                ));
            }
            return (
                <PickerEmpty
                    title="Zacznij pisać, aby wyszukać pojazd"
                    description="Wpisz markę, model lub numer rejestracyjny."
                />
            );
        }

        if (vehicles.length === 0) {
            return (
                <PickerEmpty
                    title="Nie znaleziono pojazdów"
                    description="Sprawdź pisownię albo dodaj pojazd jako nowy."
                />
            );
        }

        return vehicles.map((vehicle) => (
            <PickerRow
                key={vehicle.id}
                type="button"
                $selected={vehicle.id === currentVehicleId}
                onClick={() => handleVehicleClick(vehicle)}
            >
                <PickerAvatar><VehicleKindIcon kind={vehicle.kind} /></PickerAvatar>
                <PickerRowMain>
                    <PickerRowTitle>{vehicle.brand} {vehicle.model}</PickerRowTitle>
                    <RowSubParts
                        parts={[
                            vehicle.licensePlate,
                            vehicle.yearOfProduction,
                            vehicle.owners[0]?.customerName,
                        ]}
                    />
                </PickerRowMain>
                {vehicle.id === currentVehicleId && <PickerRowMeta>Obecny</PickerRowMeta>}
            </PickerRow>
        ));
    };

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="lg" stableHeight>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{modalTitle}</ModalTitle>
                    <ModalSubtitle>{modalSubtitle}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {mode === 'search' ? (
                    <>
                        <PickerSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Szukaj po marce, modelu lub numerze rejestracyjnym…"
                            autoFocus
                            loading={hasQuery && isFetching}
                        />

                        <PickerPane>
                            <PickerStatus>{statusText}</PickerStatus>
                            <PickerResults aria-busy={isFetching} $stale={isStale}>
                                {renderSearchResults()}
                            </PickerResults>
                        </PickerPane>

                        <PickerAddRow
                            label="Dodaj nowy pojazd"
                            onClick={() => setMode('new')}
                        />
                    </>
                ) : (
                    <>
                        <div>
                            <ModalSectionTitle>Dane wymagane</ModalSectionTitle>
                            <FormGrid>
                                {/* Nad marką, bo wybiera katalog obu pól; zmiana czyści markę i model. */}
                                <FormField $fullWidth>
                                    <VehicleKindSwitch
                                        value={formData.kind}
                                        onChange={(kind) => setFormData(prev => (
                                            prev.kind === kind ? prev : { ...prev, kind, brand: '', model: '' }
                                        ))}
                                        block={false}
                                    />
                                </FormField>

                                <FormField>
                                    <FieldLabel>Marka *</FieldLabel>
                                    <BrandSelect
                                        kind={formData.kind}
                                        value={formData.brand}
                                        onChange={(val) => setFormData({ ...formData, brand: val, model: '' })}
                                        onBlur={() => {}}
                                    />
                                    {errors.brand && <FormErrorMsg>{errors.brand}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel>Model *</FieldLabel>
                                    <ModelSelect
                                        kind={formData.kind}
                                        brand={formData.brand}
                                        value={formData.model}
                                        onChange={(val) => setFormData({ ...formData, model: val })}
                                        onBlur={() => {}}
                                    />
                                    {errors.model && <FormErrorMsg>{errors.model}</FormErrorMsg>}
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="vehicle-modal-year">Rok produkcji *</FieldLabel>
                                    <Select
                                        id="vehicle-modal-year"
                                        value={formData.yearOfProduction}
                                        onChange={(e) =>
                                            setFormData({ ...formData, yearOfProduction: parseInt(e.target.value) })
                                        }
                                    >
                                        {YEARS.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </Select>
                                    {errors.yearOfProduction && <FormErrorMsg>{errors.yearOfProduction}</FormErrorMsg>}
                                </FormField>
                            </FormGrid>
                        </div>

                        <div>
                            <ModalSectionTitle>Dane opcjonalne</ModalSectionTitle>
                            <FormGrid>
                                <FormField>
                                    <FieldLabel htmlFor="vehicle-modal-plate">Numer rejestracyjny</FieldLabel>
                                    <InputShell>
                                        <BareInput
                                            id="vehicle-modal-plate"
                                            value={formData.licensePlate}
                                            onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                                            placeholder="np. WA 12345"
                                        />
                                    </InputShell>
                                </FormField>

                                <FormField>
                                    <FieldLabel htmlFor="vehicle-modal-color">Kolor</FieldLabel>
                                    <InputShell>
                                        <BareInput
                                            id="vehicle-modal-color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            placeholder="np. Czarny metalik"
                                        />
                                    </InputShell>
                                </FormField>
                            </FormGrid>
                        </div>
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                {mode === 'search' ? (
                    <SharedButton $variant="secondary" onClick={handleClose}>
                        Anuluj
                    </SharedButton>
                ) : (
                    <>
                        <SharedButton $variant="secondary" onClick={() => setMode('search')}>
                            Wróć do wyszukiwania
                        </SharedButton>
                        <SharedButton $variant="primary" onClick={handleSubmitNew}>
                            Dodaj pojazd
                        </SharedButton>
                    </>
                )}
            </ModalFooter>
        </ModalShell>
    );
};
