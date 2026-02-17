import { useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal/Modal';
import { Button, ButtonGroup } from '@/common/components/Button/Button';
import { FormGrid, FieldGroup, Label, Input, TextArea, ErrorMessage } from '@/common/components/Form/Form';
import { useCreateVehicle } from '../hooks/useCreateVehicle';
import { createVehicleSchema, type CreateVehicleFormData } from '../utils/vehicleValidation';
import { OwnerSelect } from './OwnerSelect';
import { t } from '@/common/i18n';
import type { CreateVehiclePayload } from '../types';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
`;

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.md} 0;
    padding-bottom: ${props => props.theme.spacing.sm};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const ErrorAlert = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    color: ${props => props.theme.colors.error};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const LoadingSpinner = styled.span`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

interface CreateVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreateVehicleModal = ({ isOpen, onClose, onSuccess }: CreateVehicleModalProps) => {
    const { createVehicle, isCreating, isSuccess, error } = useCreateVehicle();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<CreateVehicleFormData>({
        resolver: zodResolver(createVehicleSchema),
        defaultValues: {
            licensePlate: '',
            brand: '',
            model: '',
            yearOfProduction: new Date().getFullYear(),
            color: '',
            paintType: '',
            currentMileage: 0,
            technicalNotes: '',
            ownerIds: [],
        },
    });

    const handleFormSubmit = useCallback((data: CreateVehicleFormData) => {
        const payload: CreateVehiclePayload = {
            licensePlate: data.licensePlate,
            brand: data.brand,
            model: data.model,
            yearOfProduction: data.yearOfProduction,
            color: data.color,
            ownerIds: data.ownerIds,
            ...(data.paintType && { paintType: data.paintType }),
            ...(data.currentMileage && { currentMileage: data.currentMileage }),
            ...(data.technicalNotes && { technicalNotes: data.technicalNotes }),
        };

        createVehicle(payload);
    }, [createVehicle]);

    useEffect(() => {
        if (isSuccess) {
            reset();
            onSuccess?.();
            onClose();
        }
    }, [isSuccess, reset, onSuccess, onClose]);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t.vehicles.form.title} maxWidth="900px">
            <ModalContent>
                {error && (
                    <ErrorAlert>
                        {t.vehicles.error.createFailed}
                    </ErrorAlert>
                )}

                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <ModalContent>
                        <div>
                            <SectionTitle>{t.vehicles.form.basicInfo}</SectionTitle>
                            <FormGrid $columns={2}>
                                <FieldGroup>
                                    <Label>{t.vehicles.form.licensePlate}</Label>
                                    <Input
                                        {...register('licensePlate')}
                                        placeholder={t.vehicles.form.licensePlatePlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.licensePlate && (
                                        <ErrorMessage>{errors.licensePlate.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.brand}</Label>
                                    <Input
                                        {...register('brand')}
                                        placeholder={t.vehicles.form.brandPlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.brand && (
                                        <ErrorMessage>{errors.brand.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.model}</Label>
                                    <Input
                                        {...register('model')}
                                        placeholder={t.vehicles.form.modelPlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.model && (
                                        <ErrorMessage>{errors.model.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.year}</Label>
                                    <Input
                                        type="number"
                                        {...register('yearOfProduction', { valueAsNumber: true })}
                                        placeholder={t.vehicles.form.yearPlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.yearOfProduction && (
                                        <ErrorMessage>{errors.yearOfProduction.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.color}</Label>
                                    <Input
                                        {...register('color')}
                                        placeholder={t.vehicles.form.colorPlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.color && (
                                        <ErrorMessage>{errors.color.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.paintType}</Label>
                                    <Input
                                        {...register('paintType')}
                                        placeholder={t.vehicles.form.paintTypePlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.paintType && (
                                        <ErrorMessage>{errors.paintType.message}</ErrorMessage>
                                    )}
                                </FieldGroup>

                                <FieldGroup>
                                    <Label>{t.vehicles.form.mileage}</Label>
                                    <Input
                                        type="number"
                                        {...register('currentMileage', { valueAsNumber: true })}
                                        placeholder={t.vehicles.form.mileagePlaceholder}
                                        disabled={isCreating}
                                    />
                                    {errors.currentMileage && (
                                        <ErrorMessage>{errors.currentMileage.message}</ErrorMessage>
                                    )}
                                </FieldGroup>
                            </FormGrid>
                        </div>

                        <div>
                            <SectionTitle>{t.vehicles.form.owners.title}</SectionTitle>
                            <Controller
                                name="ownerIds"
                                control={control}
                                render={({ field }) => (
                                    <OwnerSelect
                                        selectedOwnerIds={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            {errors.ownerIds && (
                                <ErrorMessage>{errors.ownerIds.message}</ErrorMessage>
                            )}
                        </div>

                        <div>
                            <SectionTitle>{t.vehicles.form.notes.title}</SectionTitle>
                            <FieldGroup>
                                <TextArea
                                    {...register('technicalNotes')}
                                    placeholder={t.vehicles.form.notes.placeholder}
                                    disabled={isCreating}
                                />
                                {errors.technicalNotes && (
                                    <ErrorMessage>{errors.technicalNotes.message}</ErrorMessage>
                                )}
                            </FieldGroup>
                        </div>

                        <ButtonGroup>
                            <Button
                                type="button"
                                $variant="secondary"
                                onClick={handleClose}
                                disabled={isCreating}
                            >
                                {t.common.cancel}
                            </Button>
                            <Button
                                type="submit"
                                $variant="primary"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <LoadingSpinner />
                                        {t.vehicles.form.submitting}
                                    </>
                                ) : (
                                    t.vehicles.form.submit
                                )}
                            </Button>
                        </ButtonGroup>
                    </ModalContent>
                </form>
            </ModalContent>
        </Modal>
    );
};
