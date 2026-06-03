import { useState, FormEvent } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useAddVehicle } from '../hooks/useAddVehicle';
import type { AddVehiclePayload } from '../types';

interface Props {
    customerId: string;
    onClose: () => void;
}

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${p => p.theme.spacing.md};
`;

const FieldWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FullWidth = styled(FieldWrap)`
    grid-column: 1 / -1;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const Input = styled.input`
    padding: 9px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: 14px;
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    transition: border-color 0.15s;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

const ErrorMsg = styled.p`
    font-size: 13px;
    color: ${p => p.theme.colors.danger ?? '#e53935'};
    margin: 0;
`;

const EMPTY: AddVehiclePayload = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    mileage: 0,
};

export const AddVehicleModal = ({ customerId, onClose }: Props) => {
    const [form, setForm] = useState<AddVehiclePayload>(EMPTY);
    const { addVehicle, isSubmitting, error } = useAddVehicle(customerId);

    const set = (field: keyof AddVehiclePayload) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = field === 'year' || field === 'mileage'
                ? Number(e.target.value)
                : e.target.value;
            setForm(prev => ({ ...prev, [field]: value }));
        };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const ok = await addVehicle(form);
        if (ok) onClose();
    };

    return (
        <ModalShell onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Dodaj pojazd</ModalTitle>
                        <ModalSubtitle>Nowy pojazd zostanie przypisany do klienta</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <FormGrid>
                        <FieldWrap>
                            <Label htmlFor="make">Marka *</Label>
                            <Input
                                id="make"
                                value={form.make}
                                onChange={set('make')}
                                placeholder="np. BMW"
                                required
                            />
                        </FieldWrap>

                        <FieldWrap>
                            <Label htmlFor="model">Model *</Label>
                            <Input
                                id="model"
                                value={form.model}
                                onChange={set('model')}
                                placeholder="np. M3"
                                required
                            />
                        </FieldWrap>

                        <FieldWrap>
                            <Label htmlFor="year">Rok produkcji *</Label>
                            <Input
                                id="year"
                                type="number"
                                min={1900}
                                max={new Date().getFullYear() + 1}
                                value={form.year}
                                onChange={set('year')}
                                required
                            />
                        </FieldWrap>

                        <FieldWrap>
                            <Label htmlFor="licensePlate">Nr rejestracyjny *</Label>
                            <Input
                                id="licensePlate"
                                value={form.licensePlate}
                                onChange={set('licensePlate')}
                                placeholder="np. WA12345"
                                required
                            />
                        </FieldWrap>

                        <FieldWrap>
                            <Label htmlFor="color">Kolor</Label>
                            <Input
                                id="color"
                                value={form.color}
                                onChange={set('color')}
                                placeholder="np. Czarny"
                            />
                        </FieldWrap>

                        <FieldWrap>
                            <Label htmlFor="mileage">Przebieg (km)</Label>
                            <Input
                                id="mileage"
                                type="number"
                                min={0}
                                value={form.mileage}
                                onChange={set('mileage')}
                                placeholder="np. 50000"
                            />
                        </FieldWrap>

                        {error && (
                            <FullWidth>
                                <ErrorMsg>{error}</ErrorMsg>
                            </FullWidth>
                        )}
                    </FormGrid>
                </ModalContent>

                <ModalFooter>
                    <SharedButton type="button" $variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Anuluj
                    </SharedButton>
                    <SharedButton type="submit" $variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Zapisywanie…' : 'Dodaj pojazd'}
                    </SharedButton>
                </ModalFooter>
            </form>
        </ModalShell>
    );
};
