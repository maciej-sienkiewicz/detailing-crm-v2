import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormErrorMsg,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';
import { useUpdateVehicle } from '../hooks/useUpdateVehicle';
import { updateVehicleSchema, type UpdateVehicleFormData } from '../utils/vehicleValidation';
import type { Vehicle } from '../types';
import { t } from '@/common/i18n';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

type TabId = 'identity' | 'appearance';

interface EditVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
}

export const EditVehicleModal = ({ isOpen, onClose, vehicle }: EditVehicleModalProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('identity');
    const { updateVehicle, isUpdating } = useUpdateVehicle(vehicle.id);

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
            licensePlate: vehicle.licensePlate,
            brand: vehicle.brand,
            model: vehicle.model,
            yearOfProduction: vehicle.yearOfProduction,
            color: vehicle.color,
            paintType: vehicle.paintType || '',
            currentMileage: vehicle.currentMileage || 0,
        },
    });

    const onSubmit = (data: UpdateVehicleFormData) => {
        updateVehicle(data, {
            onSuccess: () => onClose(),
        });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj pojazd</ModalTitle>
                    <ModalSubtitle>Zaktualizuj dane pojazdu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                <form id="edit-vehicle-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
                    <FormTabBar>
                        <FormTabBtn
                            type="button"
                            $active={activeTab === 'identity'}
                            onClick={() => setActiveTab('identity')}
                        >
                            Dane identyfikacyjne
                        </FormTabBtn>
                        <FormTabBtn
                            type="button"
                            $active={activeTab === 'appearance'}
                            onClick={() => setActiveTab('appearance')}
                        >
                            Wygląd i stan
                        </FormTabBtn>
                    </FormTabBar>

                    <FormTabPanel $active={activeTab === 'identity'}>
                        <FormGrid>
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
                                <FieldLabel htmlFor="ev-brand">Marka</FieldLabel>
                                <Controller
                                    name="brand"
                                    control={control}
                                    render={({ field }) => (
                                        <BrandSelect
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
                        </FormGrid>
                    </FormTabPanel>

                    <FormTabPanel $active={activeTab === 'appearance'}>
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
                                <FieldLabel htmlFor="ev-paintType">Rodzaj lakieru</FieldLabel>
                                <InputShell $hasError={!!errors.paintType}>
                                    <BareInput
                                        id="ev-paintType"
                                        autoComplete="new-password"
                                        {...register('paintType')}
                                        placeholder="Lakier bazowy + lakier"
                                    />
                                </InputShell>
                                {errors.paintType && (
                                    <FormErrorMsg>{errors.paintType.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="ev-mileage">Przebieg (km)</FieldLabel>
                                <InputShell $hasError={!!errors.currentMileage}>
                                    <BareInput
                                        id="ev-mileage"
                                        type="number"
                                        autoComplete="new-password"
                                        {...register('currentMileage', { valueAsNumber: true })}
                                        placeholder="45000"
                                        min="0"
                                    />
                                </InputShell>
                                {errors.currentMileage && (
                                    <FormErrorMsg>{errors.currentMileage.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    {t.common.cancel}
                </SharedButton>
                <SharedButton
                    type="submit"
                    form="edit-vehicle-form"
                    $variant="primary"
                    disabled={isUpdating}
                >
                    {isUpdating ? 'Zapisywanie...' : t.common.save}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
