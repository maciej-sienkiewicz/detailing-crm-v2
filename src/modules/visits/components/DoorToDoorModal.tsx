import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { Toggle } from '@/common/components/Toggle';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { useEmployees } from '@/modules/employees/hooks';
import type { DoorToDoorInfo } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const Input = styled.input`
    padding: 8px 11px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const TextArea = styled.textarea`
    padding: 8px 11px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
    resize: none;
    height: 64px;
    font-family: inherit;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    background: #fff;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;

    @media (max-width: 480px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #0ea5e9;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #f1f5f9;
    margin: 4px 0;
`;

// ─── Confirm phase ────────────────────────────────────────────────────────────

/* "Prowadź" zostaje, ale przy adresie dostarczenia, a nie na osobnym ekranie
   "potwierdzenia" - nawigacja to właściwość adresu, nie krok procesu. */
const NavButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 20px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid #0ea5e9;
    background: #0ea5e9;
    color: #fff;
    transition: all 160ms ease;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    svg { width: 17px; height: 17px; }

    &:hover {
        background: #0284c7;
        border-color: #0284c7;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.38);
        transform: translateY(-1px);
    }
`;


// ─── Dodane przy przebudowie ──────────────────────────────────────────────────

const EnableRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    margin-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
`;

const EnableText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const EnableTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const EnableHint = styled.span`
    font-size: 12px;
    color: #64748b;
`;

const SectionHeadRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
`;

/* "Odwieźcie tam, skąd wzięliście" to najczęstszy wariant po odbiorze z domu -
   bez tego trzeba było przepisywać ten sam adres ręcznie. */
const CopyBtn = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #0284c7;
    cursor: pointer;

    &:hover { color: #0369a1; }
    &:disabled { color: #cbd5e1; cursor: default; }
`;

const FieldError = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: #dc2626;
`;

const Select = styled.select`
    padding: 8px 11px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const DisabledNote = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface DoorToDoorModalProps {
    isOpen: boolean;
    initialData?: DoorToDoorInfo;
    /** Adres klienta z kartoteki: podpowiedź dla miejsca odbioru. */
    customerAddress?: { city?: string | null; street?: string | null };
    onClose: () => void;
    onConfirm: (data: DoorToDoorInfo) => void;
}

const EMPTY: DoorToDoorInfo = {
    enabled: true,
    pickupAddress: { city: '', street: '' },
    deliveryAddress: { city: '', street: '' },
    notes: '',
    driverId: null,
    driverName: null,
    scheduledAt: null,
};

/** Adres jest albo kompletny, albo pusty - samo miasto nikogo nie dowiezie. */
const addressState = (a: { city: string; street: string }) => {
    const city = a.city.trim();
    const street = a.street.trim();
    if (!city && !street) return 'empty' as const;
    if (city && street) return 'complete' as const;
    return 'partial' as const;
};

export const DoorToDoorModal = ({
    isOpen, initialData, customerAddress, onClose, onConfirm,
}: DoorToDoorModalProps) => {
    /* Okno montuje się dopiero przy otwarciu (patrz VisitDetailView), więc stan
       startowy bierzemy z propsów przy pierwszym renderze. Wcześniej komponent
       wisiał zamontowany przez cały czas i `useState(() => initialData ?? EMPTY)`
       zapamiętywał wartość z pierwszego renderu - gdy wizyta doładowała się
       później, formularz nigdy nie zobaczył jej danych. */
    const [data, setData] = useState<DoorToDoorInfo>(() => ({
        ...EMPTY,
        ...initialData,
        pickupAddress: initialData?.pickupAddress?.city || initialData?.pickupAddress?.street
            ? initialData.pickupAddress
            : { city: customerAddress?.city ?? '', street: customerAddress?.street ?? '' },
    }));
    const [touched, setTouched] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /* Lista kierowców = pracownicy studia. Jeden strzał na 100 pozycji: studio
       detailingowe nie ma tylu ludzi, żeby potrzebna była paginacja w tym oknie. */
    const { employees } = useEmployees({ search: '', page: 1, limit: 100 });

    const update = (patch: Partial<DoorToDoorInfo>) => setData(d => ({ ...d, ...patch }));

    const pickupState = addressState(data.pickupAddress);
    const deliveryState = addressState(data.deliveryAddress);

    const errors = useMemo(() => {
        if (!data.enabled) return {};
        return {
            pickup: pickupState === 'partial' ? 'Podaj miasto i ulicę albo zostaw puste' : null,
            delivery: deliveryState === 'partial' ? 'Podaj miasto i ulicę albo zostaw puste'
                : deliveryState === 'empty' ? 'Podaj adres dostarczenia' : null,
        };
    }, [data.enabled, pickupState, deliveryState]);

    const hasErrors = Boolean(errors.pickup || errors.delivery);

    const copyPickupToDelivery = () =>
        update({ deliveryAddress: { ...data.pickupAddress } });

    const handleSave = async () => {
        setTouched(true);
        if (hasErrors) return;
        setIsSaving(true);
        try {
            /* onConfirm zapisuje. Wcześniej wywoływało się je PRZED pokazaniem
               ekranu "potwierdzenia", więc przycisk "Potwierdź" zapisywał, a
               ekran po nim tylko udawał, że o coś jeszcze pyta. */
            await onConfirm(data);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const driverOptions = employees.map(e => ({ id: e.id, label: e.fullName }));

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Door to Door</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Section>
                    {/* Klient potrafi zrezygnować z dowozu - dotąd nie było jak
                        tego odnotować: EMPTY.enabled było na sztywno true, a zapis
                        i tak wymuszał true. */}
                    <EnableRow>
                        <EnableText>
                            <EnableTitle>Dowóz i odbiór pojazdu</EnableTitle>
                            <EnableHint>
                                {data.enabled ? 'Usługa zlecona dla tej wizyty' : 'Usługa wyłączona'}
                            </EnableHint>
                        </EnableText>
                        <Toggle
                            size="sm"
                            checked={data.enabled}
                            onChange={v => update({ enabled: v })}
                            ariaLabel="Usługa Door to Door"
                        />
                    </EnableRow>

                    {!data.enabled ? (
                        <DisabledNote>
                            Adresy i termin zostaną zachowane, ale wizyta nie będzie
                            oznaczona jako Door to Door.
                        </DisabledNote>
                    ) : (
                        <>
                            <div>
                                <SectionHeader>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="10" r="3" />
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                    </svg>
                                    Miejsce odbioru
                                </SectionHeader>
                                {/* Adres odbioru był polem TYLKO DO ODCZYTU pokazującym "-".
                                    Gdy wizyta nie powstała jako Door to Door, nie dało się go
                                    w ogóle wpisać - a prośba "odwieźcie mi auto" pada
                                    najczęściej właśnie w trakcie realizacji. */}
                                <TwoCol>
                                    <FieldGroup>
                                        <Label>Miasto</Label>
                                        <Input
                                            value={data.pickupAddress.city}
                                            onChange={e => update({ pickupAddress: { ...data.pickupAddress, city: e.target.value } })}
                                            placeholder="np. Warszawa"
                                        />
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Ulica i numer</Label>
                                        <Input
                                            value={data.pickupAddress.street}
                                            onChange={e => update({ pickupAddress: { ...data.pickupAddress, street: e.target.value } })}
                                            placeholder="np. ul. Kowalska 12"
                                        />
                                    </FieldGroup>
                                </TwoCol>
                                {touched && errors.pickup && <FieldError>{errors.pickup}</FieldError>}
                            </div>

                            <Divider />

                            <div>
                                <SectionHeadRow>
                                    <SectionHeader>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                        Miejsce dostarczenia
                                    </SectionHeader>
                                    <CopyBtn
                                        type="button"
                                        onClick={copyPickupToDelivery}
                                        disabled={pickupState !== 'complete'}
                                    >
                                        Taki sam jak odbiór
                                    </CopyBtn>
                                </SectionHeadRow>
                                <TwoCol>
                                    <FieldGroup>
                                        <Label>Miasto</Label>
                                        <Input
                                            value={data.deliveryAddress.city}
                                            onChange={e => update({ deliveryAddress: { ...data.deliveryAddress, city: e.target.value } })}
                                            placeholder="np. Warszawa"
                                        />
                                    </FieldGroup>
                                    <FieldGroup>
                                        <Label>Ulica i numer</Label>
                                        <Input
                                            value={data.deliveryAddress.street}
                                            onChange={e => update({ deliveryAddress: { ...data.deliveryAddress, street: e.target.value } })}
                                            placeholder="np. ul. Kowalska 12"
                                        />
                                    </FieldGroup>
                                </TwoCol>
                                {touched && errors.delivery && <FieldError>{errors.delivery}</FieldError>}
                                {deliveryState === 'complete' && (
                                    <NavButton
                                        type="button"
                                        onClick={() => {
                                            const addr = `${data.deliveryAddress.street}, ${data.deliveryAddress.city}`;
                                            window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, '_blank', 'noopener');
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="3 11 22 2 13 21 11 13 3 11" />
                                        </svg>
                                        Prowadź
                                    </NavButton>
                                )}
                            </div>

                            <Divider />

                            <TwoCol>
                                <FieldGroup>
                                    <Label>Kierowca</Label>
                                    <Select
                                        value={data.driverId ?? ''}
                                        onChange={e => {
                                            const id = e.target.value || null;
                                            update({
                                                driverId: id,
                                                driverName: driverOptions.find(d => d.id === id)?.label ?? null,
                                            });
                                        }}
                                    >
                                        <option value="">Nieprzypisany</option>
                                        {driverOptions.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </Select>
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Termin dostarczenia</Label>
                                    <DateTimePicker
                                        value={data.scheduledAt ?? ''}
                                        onChange={v => update({ scheduledAt: v || null })}
                                        showTime
                                        placeholder="Wybierz datę i godzinę"
                                    />
                                </FieldGroup>
                            </TwoCol>

                            <FieldGroup>
                                <Label>Uwagi</Label>
                                <TextArea
                                    value={data.notes}
                                    onChange={e => update({ notes: e.target.value })}
                                    placeholder="np. kod do bramy, piętro, kontakt na miejscu"
                                />
                            </FieldGroup>
                        </>
                    )}
                </Section>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Zapisuję...' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
