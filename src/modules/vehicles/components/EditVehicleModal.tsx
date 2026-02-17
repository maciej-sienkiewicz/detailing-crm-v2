import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { FormGrid, FieldGroup, Label, Input, ErrorMessage } from '@/common/components/Form';
import { useUpdateVehicle } from '../hooks/useUpdateVehicle';
import { updateVehicleSchema, type UpdateVehicleFormData } from '../utils/vehicleValidation';
import type { Vehicle } from '../types';
import { t } from '@/common/i18n';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

interface EditVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
}

export const EditVehicleModal = ({ isOpen, onClose, vehicle }: EditVehicleModalProps) => {
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
            onSuccess: () => {
                onClose();
            },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edytuj pojazd" maxWidth="900px">
            <ModalContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <SectionTitle>Dane identyfikacyjne</SectionTitle>

                    <FormGrid $columns={2}>
                        <FieldGroup>
                            <Label htmlFor="licensePlate">Numer rejestracyjny</Label>
                            <Input
                                id="licensePlate"
                                {...register('licensePlate')}
                                placeholder="WA 12345"
                            />
                            {errors.licensePlate && (
                                <ErrorMessage>{errors.licensePlate.message}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="brand">Marka *</Label>
                            <Controller
                                name="brand"
                                control={control}
                                render={({ field }) => (
                                    <BrandSelect
                                        value={field.value}
                                        onChange={(val) => {
                                            field.onChange(val);
                                            // Reset model when brand changes
                                            setValue('model', '');
                                        }}
                                    />
                                )}
                            />
                            {errors.brand && (
                                <ErrorMessage>{errors.brand.message}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="model">Model *</Label>
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
                                <ErrorMessage>{errors.model.message}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="yearOfProduction">Rok produkcji</Label>
                            <Input
                                id="yearOfProduction"
                                type="number"
                                {...register('yearOfProduction', { valueAsNumber: true })}
                                placeholder="2021"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                            />
                            {errors.yearOfProduction && (
                                <ErrorMessage>{errors.yearOfProduction.message}</ErrorMessage>
                            )}
                        </FieldGroup>
                    </FormGrid>

                    <SectionTitle style={{ marginTop: '24px' }}>Wygląd i stan</SectionTitle>

                    <FormGrid $columns={2}>
                        <FieldGroup>
                            <Label htmlFor="color">Kolor</Label>
                            <Input
                                id="color"
                                {...register('color')}
                                placeholder="Czarny metalik"
                            />
                            {errors.color && (
                                <ErrorMessage>{errors.color.message}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="paintType">Rodzaj lakieru</Label>
                            <Input
                                id="paintType"
                                {...register('paintType')}
                                placeholder="Lakier bazowy + lakier"
                            />
                            {errors.paintType && (
                                <ErrorMessage>{errors.paintType.message}</ErrorMessage>
                            )}
                        </FieldGroup>

                        <FieldGroup>
                            <Label htmlFor="currentMileage">Przebieg (km)</Label>
                            <Input
                                id="currentMileage"
                                type="number"
                                {...register('currentMileage', { valueAsNumber: true })}
                                placeholder="45000"
                                min="0"
                            />
                            {errors.currentMileage && (
                                <ErrorMessage>{errors.currentMileage.message}</ErrorMessage>
                            )}
                        </FieldGroup>
                    </FormGrid>

                    <ButtonGroup style={{ marginTop: '24px' }}>
                        <Button type="button" $variant="secondary" onClick={onClose}>
                            {t.common.cancel}
                        </Button>
                        <Button type="submit" $variant="primary" disabled={isUpdating}>
                            {isUpdating ? 'Zapisywanie...' : t.common.save}
                        </Button>
                    </ButtonGroup>
                </form>
            </ModalContent>
        </Modal>
    );
};
