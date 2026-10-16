// src/modules/vehicles/components/EditVehicleModal.tsx
//
// Edycja danych pojazdu. Osiem pól mieści się na jednym ekranie, więc okno nie ma
// już zakładek „Dane identyfikacyjne / Wygląd i stan": druga zakładka miała dwa
// pola, a błąd walidacji w ukrytej zakładce blokował zapis bez słowa - użytkownik
// widział tylko, że „Zapisz" nic nie robi. Teraz obie grupy stoją jedna pod drugą,
// każda z nagłówkiem pisanym zwykłym tekstem.

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormGrid, FormField, FieldLabel, InputShell, BareInput, FormErrorMsg,
} from '@/common/components/Form';
import { useToast } from '@/common/components/Toast';
import { Button, ui } from '@/common/components/ui';
import { useUpdateVehicle } from '../hooks/useUpdateVehicle';
import { updateVehicleSchema, type UpdateVehicleFormData } from '../utils/vehicleValidation';
import type { Vehicle } from '../types';
import { normalizeVehicleKind } from '../vehicleKind';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { VehicleKindSwitch } from './VehicleKindSwitch';
import { VinInput } from './vin/VinInput';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

const Group = styled.section`
    min-width: 0;

    & + & { padding-top: 20px; border-top: 1px solid ${ui.lineFaint}; }
`;

const GroupTitle = styled.h3`
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Unit = styled.span`
    padding-right: 12px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

interface EditVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
}

export const EditVehicleModal = ({ isOpen, onClose, vehicle }: EditVehicleModalProps) => {
    const { updateVehicle, isUpdating } = useUpdateVehicle(vehicle.id);
    const { showSuccess, showError } = useToast();

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = useForm<UpdateVehicleFormData>({
        resolver: zodResolver(updateVehicleSchema),
        defaultValues: {
            kind: normalizeVehicleKind(vehicle.kind),
            licensePlate: vehicle.licensePlate,
            brand: vehicle.brand,
            model: vehicle.model,
            yearOfProduction: vehicle.yearOfProduction,
            color: vehicle.color,
            currentMileage: vehicle.currentMileage || 0,
            vin: vehicle.vin ?? '',
        },
    });

    const kind = watch('kind');

    const onSubmit = (data: UpdateVehicleFormData) => {
        // Puste pole liczbowe schemat zamienia na undefined, a serwer czyta brak pola
        // jako „bez zmian" - wyczyszczony rok i przebieg wracały po zapisie. Jawnie:
        // rok 0 = usuń rok, przebieg wyczyszczony = 0.
        const payload: UpdateVehicleFormData = {
            ...data,
            yearOfProduction: data.yearOfProduction ?? (vehicle.yearOfProduction ? 0 : undefined),
            currentMileage: data.currentMileage ?? 0,
        };
        updateVehicle(payload, {
            onSuccess: () => {
                showSuccess('Dane pojazdu zapisane', 'Zmiany widać już w karcie pojazdu.');
                onClose();
            },
            onError: () => showError('Nie udało się zapisać zmian', 'Spróbuj ponownie za chwilę.'),
        });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dane pojazdu</ModalTitle>
                    <ModalSubtitle>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}{vehicle.licensePlate ? `, ${vehicle.licensePlate}` : ''}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form id="edit-vehicle-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
                    <Group aria-labelledby="ev-group-identity">
                        <GroupTitle id="ev-group-identity">Podstawowe dane</GroupTitle>
                        <FormGrid>
                            {/* Rodzaj nad marką: to on wybiera katalog marek i modeli. */}
                            <FormField $fullWidth>
                                <Controller
                                    name="kind"
                                    control={control}
                                    render={({ field }) => (
                                        <VehicleKindSwitch
                                            value={field.value}
                                            block={false}
                                            onChange={(next) => {
                                                // Klik w już wybrany rodzaj nie może kasować marki.
                                                if (next === field.value) return;
                                                field.onChange(next);
                                                // Marka i model pochodzą z katalogu innego rodzaju.
                                                setValue('brand', '');
                                                setValue('model', '');
                                            }}
                                        />
                                    )}
                                />
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-brand">Marka</FieldLabel>
                                <Controller
                                    name="brand"
                                    control={control}
                                    render={({ field }) => (
                                        <BrandSelect
                                            kind={kind}
                                            value={field.value}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                setValue('model', '');
                                            }}
                                        />
                                    )}
                                />
                                {errors.brand && (
                                    <FormErrorMsg>{errors.brand.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-model">Model</FieldLabel>
                                <Controller
                                    name="model"
                                    control={control}
                                    render={({ field }) => (
                                        <ModelSelect
                                            kind={kind}
                                            brand={watch('brand')}
                                            value={field.value}
                                            onChange={(val) => field.onChange(val)}
                                        />
                                    )}
                                />
                                {errors.model && (
                                    <FormErrorMsg>{errors.model.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-licensePlate">Numer rejestracyjny</FieldLabel>
                                <InputShell $hasError={!!errors.licensePlate}>
                                    <BareInput
                                        id="ev-licensePlate"
                                        autoComplete="new-password"
                                        {...register('licensePlate')}
                                        placeholder="WA 12345"
                                    />
                                </InputShell>
                                {errors.licensePlate && (
                                    <FormErrorMsg>{errors.licensePlate.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-year">Rok produkcji</FieldLabel>
                                <InputShell $hasError={!!errors.yearOfProduction}>
                                    <BareInput
                                        id="ev-year"
                                        type="number"
                                        autoComplete="new-password"
                                        {...register('yearOfProduction', { valueAsNumber: true })}
                                        placeholder="2021"
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                    />
                                </InputShell>
                                {errors.yearOfProduction && (
                                    <FormErrorMsg>{errors.yearOfProduction.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-vin">VIN</FieldLabel>
                                <Controller
                                    name="vin"
                                    control={control}
                                    render={({ field }) => (
                                        <VinInput
                                            id="ev-vin"
                                            value={field.value ?? ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            onScanError={(message) => showError('Nie odczytano VIN', message)}
                                            hasError={!!errors.vin}
                                        />
                                    )}
                                />
                                {errors.vin && (
                                    <FormErrorMsg>{errors.vin.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </Group>

                    <Group aria-labelledby="ev-group-look">
                        <GroupTitle id="ev-group-look">Wygląd i stan</GroupTitle>
                        <FormGrid>
                            <FormField>
                                <FieldLabel htmlFor="ev-color">Kolor</FieldLabel>
                                <InputShell $hasError={!!errors.color}>
                                    <BareInput
                                        id="ev-color"
                                        autoComplete="new-password"
                                        {...register('color')}
                                        placeholder="Czarny metalik"
                                    />
                                </InputShell>
                                {errors.color && (
                                    <FormErrorMsg>{errors.color.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-mileage">Przebieg</FieldLabel>
                                <InputShell $hasError={!!errors.currentMileage}>
                                    <BareInput
                                        id="ev-mileage"
                                        type="number"
                                        autoComplete="new-password"
                                        {...register('currentMileage', { valueAsNumber: true })}
                                        placeholder="45000"
                                        min="0"
                                    />
                                    <Unit>km</Unit>
                                </InputShell>
                                {errors.currentMileage && (
                                    <FormErrorMsg>{errors.currentMileage.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </Group>
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button type="submit" form="edit-vehicle-form" variant="primary" disabled={isUpdating}>
                    {isUpdating ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
};
