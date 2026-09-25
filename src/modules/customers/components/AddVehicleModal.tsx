// src/modules/customers/components/AddVehicleModal.tsx
//
// Dodanie pojazdu z karty klienta - te same pola i ten sam układ co edycja danych
// pojazdu (EditVehicleModal), żeby „dodaj" i „popraw" wyglądały jak jedno okno.
//
// Wcześniej etykiety były wersalikami 12px, przebieg startował od wpisanego „0",
// które trzeba było najpierw skasować, a przycisk „Dodaj pojazd" dawał się
// kliknąć bez marki i modelu - i wtedy nie robił nic, bez słowa.

import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FormGrid, FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Button, Notice, ui } from '@/common/components/ui';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { useAddVehicle } from '../hooks/useAddVehicle';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Unit = styled.span`
    padding-right: 12px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

interface Props {
    customerId: string;
    /** Imię i nazwisko do podtytułu - mówi, komu przypisujemy auto. */
    customerName?: string;
    onClose: () => void;
}

export const AddVehicleModal = ({ customerId, customerName, onClose }: Props) => {
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [licensePlate, setLicensePlate] = useState('');
    const [color, setColor] = useState('');
    const [mileage, setMileage] = useState('');
    const { addVehicle, isSubmitting, error } = useAddVehicle(customerId);

    const ready = !!make && !!model;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ready) return;
        const ok = await addVehicle({
            make,
            model,
            year: Number(year) || new Date().getFullYear(),
            licensePlate: licensePlate.trim(),
            color: color.trim(),
            mileage: Number(mileage) || 0,
        });
        if (ok) onClose();
    };

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj pojazd</ModalTitle>
                    <ModalSubtitle>{customerName ? `Zostanie przypisany do: ${customerName}` : 'Zostanie przypisany do klienta'}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form id="add-customer-vehicle-form" onSubmit={submit} autoComplete="off">
                    <FormGrid>
                        <FormField>
                            <FieldLabel>Marka</FieldLabel>
                            <BrandSelect value={make} onChange={brand => { setMake(brand); setModel(''); }} />
                        </FormField>
                        <FormField>
                            <FieldLabel>Model</FieldLabel>
                            <ModelSelect brand={make} value={model} onChange={setModel} />
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="av-plate">Numer rejestracyjny</FieldLabel>
                            <InputShell>
                                <BareInput id="av-plate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="WA 12345" />
                            </InputShell>
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="av-year">Rok produkcji</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="av-year"
                                    type="number"
                                    inputMode="numeric"
                                    min={1900}
                                    max={new Date().getFullYear() + 1}
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                />
                            </InputShell>
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="av-color">Kolor</FieldLabel>
                            <InputShell>
                                <BareInput id="av-color" value={color} onChange={e => setColor(e.target.value)} placeholder="Czarny metalik" />
                            </InputShell>
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="av-mileage">Przebieg</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="av-mileage"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={mileage}
                                    onChange={e => setMileage(e.target.value)}
                                    placeholder="45000"
                                />
                                <Unit>km</Unit>
                            </InputShell>
                        </FormField>
                    </FormGrid>

                    {error && <Notice tone="danger" role="alert">{error}</Notice>}
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose} disabled={isSubmitting}>Anuluj</Button>
                <Button type="submit" form="add-customer-vehicle-form" variant="primary" disabled={!ready || isSubmitting}>
                    {isSubmitting ? 'Zapisywanie...' : ready ? 'Dodaj pojazd' : 'Wybierz markę i model'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
