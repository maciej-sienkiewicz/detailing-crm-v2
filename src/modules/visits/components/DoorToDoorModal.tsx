import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { House, MapPin } from 'lucide-react';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { BareInput, BareTextArea, FieldLabel, InputShell, InputShellTextArea } from '@/common/components/Form';
import { Button, Notice, SectionTitle, ui } from '@/common/components/ui';
import { Toggle } from '@/common/components/Toggle';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { instantToLocalDateTime } from '@/common/utils';
import { useEmployees } from '@/modules/employees/hooks';
import type { DoorToDoorInfo } from '../types';

// ─── Styl ─────────────────────────────────────────────────────────────────────
//
// Ten sam język co karta wizyty: nagłówki sekcji zwykłym pismem 15px zamiast
// błękitnych wersalików 11px, etykiety pól 13px, podsumowanie trasy jako
// komunikat, jedno wypełnienie („Zapisz") w stopce.

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;

    @media (max-width: 480px) { grid-template-columns: minmax(0, 1fr); }
`;

const Leg = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const LegHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;

    h3 { display: flex; align-items: center; gap: 8px; }
    h3 svg { width: 16px; height: 16px; color: ${ui.brandInk}; }
`;

const EnableRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};
`;

const EnableText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const FieldError = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${ui.dangerInk};
`;

const NativeSelect = styled.select`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};
    outline: none;
    cursor: pointer;
`;

const DisabledNote = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
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
        /* Backend przechowuje termin jako instant UTC, a picker pracuje na czasie
           ściennym - bez tej zamiany zapisana 20:15 wracałaby jako 18:15. */
        scheduledAt: instantToLocalDateTime(initialData?.scheduledAt),
    }));
    const [touched, setTouched] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    /* Lista kierowców = pracownicy studia. Jeden strzał na 100 pozycji: studio
       detailingowe nie ma tylu ludzi, żeby potrzebna była paginacja w tym oknie. */
    const { employees } = useEmployees({ search: '', page: 1, limit: 100 });

    const update = (patch: Partial<DoorToDoorInfo>) => setData(d => ({ ...d, ...patch }));

    const pickupState = addressState(data.pickupAddress);
    const deliveryState = addressState(data.deliveryAddress);

    /* Door to Door to JEDEN LUB DWA odcinki, nie zawsze oba. Klient może chcieć
       tylko odbioru ("zabierzcie auto sprzed domu, wrócę po nie sam") albo tylko
       dostarczenia ("przywiozę je rano, odwieźcie do biura"). Wymóg adresu
       dostarczenia blokował ten pierwszy przypadek - stąd zasada: przy włączonej
       usłudze musi być kompletny CO NAJMNIEJ JEDEN adres. */
    const errors = useMemo(() => {
        if (!data.enabled) return {};
        const noLeg = pickupState === 'empty' && deliveryState === 'empty';
        return {
            pickup: pickupState === 'partial' ? 'Podaj miasto i ulicę albo zostaw puste' : null,
            delivery: deliveryState === 'partial' ? 'Podaj miasto i ulicę albo zostaw puste' : null,
            form: noLeg
                ? 'Podaj adres odbioru, adres dostarczenia albo oba - inaczej nie ma czego przewozić.'
                : null,
        };
    }, [data.enabled, pickupState, deliveryState]);

    const hasErrors = Boolean(errors.pickup || errors.delivery || errors.form);

    const routeSummary =
        pickupState === 'complete' && deliveryState === 'complete'
            ? 'Odbieramy pojazd i odwozimy go po realizacji.'
            : pickupState === 'complete'
                ? 'Odbieramy pojazd. Po realizacji klient odbiera go osobiście w studiu.'
                : deliveryState === 'complete'
                    ? 'Klient dostarcza pojazd do studia. Po realizacji odwozimy go pod wskazany adres.'
                    : null;

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

    const addressField = (
        leg: 'pickupAddress' | 'deliveryAddress',
        key: 'city' | 'street',
        label: string,
        placeholder: string,
    ) => {
        const id = `d2d-${leg}-${key}`;
        return (
            <Field>
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <InputShell>
                    <BareInput
                        id={id}
                        value={data[leg][key]}
                        onChange={e => update({ [leg]: { ...data[leg], [key]: e.target.value } })}
                        placeholder={placeholder}
                    />
                </InputShell>
            </Field>
        );
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Door to door</ModalTitle>
                    <ModalSubtitle>Odbiór auta od klienta, odwiezienie po realizacji albo jedno i drugie</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form>
                    {/* Klient potrafi zrezygnować z dowozu - wyłączenie zachowuje adresy. */}
                    <EnableRow>
                        <EnableText>
                            <strong>Dowóz i odbiór pojazdu</strong>
                            <span>{data.enabled ? 'Usługa zlecona dla tej wizyty' : 'Usługa wyłączona'}</span>
                        </EnableText>
                        <Toggle
                            size="sm"
                            checked={data.enabled}
                            onChange={v => update({ enabled: v })}
                            ariaLabel="Usługa Door to door"
                        />
                    </EnableRow>

                    {!data.enabled ? (
                        <DisabledNote>
                            Adresy i termin zostaną zachowane, ale wizyta nie będzie
                            oznaczona jako Door to door.
                        </DisabledNote>
                    ) : (
                        <>
                            {/* Adres odbioru da się wpisać także w trakcie realizacji - prośba
                                „odwieźcie mi auto" pada najczęściej właśnie wtedy. */}
                            <Leg aria-labelledby="d2d-pickup-title">
                                <LegHead>
                                    <SectionTitle as="h3" id="d2d-pickup-title"><MapPin aria-hidden="true" />Odbiór od klienta</SectionTitle>
                                </LegHead>
                                <TwoCol>
                                    {addressField('pickupAddress', 'city', 'Miasto', 'np. Warszawa')}
                                    {addressField('pickupAddress', 'street', 'Ulica i numer', 'np. ul. Kowalska 12')}
                                </TwoCol>
                                {touched && errors.pickup && <FieldError>{errors.pickup}</FieldError>}
                            </Leg>

                            <Leg aria-labelledby="d2d-delivery-title">
                                <LegHead>
                                    <SectionTitle as="h3" id="d2d-delivery-title"><House aria-hidden="true" />Dostarczenie po realizacji</SectionTitle>
                                    {/* „Odwieźcie tam, skąd wzięliście" to najczęstszy wariant. */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyPickupToDelivery}
                                        disabled={pickupState !== 'complete'}
                                    >
                                        Taki sam jak odbiór
                                    </Button>
                                </LegHead>
                                <TwoCol>
                                    {addressField('deliveryAddress', 'city', 'Miasto', 'np. Warszawa')}
                                    {addressField('deliveryAddress', 'street', 'Ulica i numer', 'np. ul. Kowalska 12')}
                                </TwoCol>
                                {touched && errors.delivery && <FieldError>{errors.delivery}</FieldError>}
                            </Leg>

                            {/* Który odcinek bierzemy na siebie, wynika z wypełnionych adresów -
                                mówimy to wprost, zamiast kazać zgadywać. */}
                            {routeSummary && <Notice tone="info">{routeSummary}</Notice>}
                            {touched && errors.form && <Notice tone="danger" role="alert">{errors.form}</Notice>}

                            <TwoCol>
                                <Field>
                                    <FieldLabel htmlFor="d2d-driver">Kierowca</FieldLabel>
                                    <InputShell>
                                        <NativeSelect
                                            id="d2d-driver"
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
                                        </NativeSelect>
                                    </InputShell>
                                </Field>
                                <Field>
                                    <FieldLabel>Termin</FieldLabel>
                                    <DateTimePicker
                                        value={data.scheduledAt ?? ''}
                                        onChange={v => update({ scheduledAt: v || null })}
                                        showTime
                                        placeholder="Wybierz datę i godzinę"
                                        accentColor={ui.brand}
                                    />
                                </Field>
                            </TwoCol>

                            <Field>
                                <FieldLabel htmlFor="d2d-notes">Uwagi dla kierowcy</FieldLabel>
                                <InputShellTextArea>
                                    <BareTextArea
                                        id="d2d-notes"
                                        value={data.notes}
                                        onChange={e => update({ notes: e.target.value })}
                                        placeholder="np. kod do bramy, piętro, kontakt na miejscu"
                                        style={{ minHeight: 72 }}
                                    />
                                </InputShellTextArea>
                            </Field>
                        </>
                    )}
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
