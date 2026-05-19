import { useCallback, useEffect, useState } from 'react';
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
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormErrorMsg,
    FormAlertBanner,
    FormTabBar,
    FormTabBtn,
    FormTabPanel,
} from '@/common/components/Form';
import { useCreateVehicle } from '../hooks/useCreateVehicle';
import { createVehicleSchema, type CreateVehicleFormData } from '../utils/vehicleValidation';
import { OwnerSelect } from './OwnerSelect';
import { t } from '@/common/i18n';
import type { CreateVehiclePayload } from '../types';

type TabId = 'details' | 'owners';

interface CreateVehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreateVehicleModal = ({ isOpen, onClose, onSuccess }: CreateVehicleModalProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('details');
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
            ...(data.currentMileage && { currentMileage: data.currentMileage }),
            ...(data.technicalNotes && { technicalNotes: data.technicalNotes }),
        };
        createVehicle(payload);
    }, [createVehicle]);

    useEffect(() => {
        if (isSuccess) {
            reset();
            setActiveTab('details');
            onSuccess?.();
            onClose();
        }
    }, [isSuccess, reset, onSuccess, onClose]);

    const handleClose = useCallback(() => {
        reset();
        setActiveTab('details');
        onClose();
    }, [reset, onClose]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{t.vehicles.form.title}</ModalTitle>
                    <ModalSubtitle>Wypełnij dane nowego pojazdu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent style={{ paddingTop: '8px' }}>
                {error && (
                    <FormAlertBanner>{t.vehicles.error.createFailed}</FormAlertBanner>
                )}

                <form id="create-vehicle-form" onSubmit={handleSubmit(handleFormSubmit)} autoComplete="off">
                    <FormTabBar>
                        <FormTabBtn
                            type="button"
                            $active={activeTab === 'details'}
                            onClick={() => setActiveTab('details')}
                        >
                            Dane pojazdu
                        </FormTabBtn>
                        <FormTabBtn
                            type="button"
                            $active={activeTab === 'owners'}
                            onClick={() => setActiveTab('owners')}
                        >
                            Właściciele
                        </FormTabBtn>
                    </FormTabBar>

                    <FormTabPanel $active={activeTab === 'details'}>
                        <FormGrid>
                            <FormField>
                                <FieldLabel htmlFor="cv-licensePlate">
                                    {t.vehicles.form.licensePlate}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.licensePlate}>
                                    <BareInput
                                        id="cv-licensePlate"
                                        autoComplete="new-password"
                                        {...register('licensePlate')}
                                        placeholder={t.vehicles.form.licensePlatePlaceholder}
                                    />
                                </InputShell>
                                {errors.licensePlate && (
                                    <FormErrorMsg>{errors.licensePlate.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cv-brand">
                                    {t.vehicles.form.brand}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.brand}>
                                    <BareInput
                                        id="cv-brand"
                                        autoComplete="new-password"
                                        {...register('brand')}
                                        placeholder={t.vehicles.form.brandPlaceholder}
                                    />
                                </InputShell>
                                {errors.brand && (
                                    <FormErrorMsg>{errors.brand.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cv-model">
                                    {t.vehicles.form.model}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.model}>
                                    <BareInput
                                        id="cv-model"
                                        autoComplete="new-password"
                                        {...register('model')}
                                        placeholder={t.vehicles.form.modelPlaceholder}
                                    />
                                </InputShell>
                                {errors.model && (
                                    <FormErrorMsg>{errors.model.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cv-year">
                                    {t.vehicles.form.year}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.yearOfProduction}>
                                    <BareInput
                                        id="cv-year"
                                        type="number"
                                        autoComplete="new-password"
                                        {...register('yearOfProduction', { valueAsNumber: true })}
                                        placeholder={t.vehicles.form.yearPlaceholder}
                                    />
                                </InputShell>
                                {errors.yearOfProduction && (
                                    <FormErrorMsg>{errors.yearOfProduction.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cv-color">
                                    {t.vehicles.form.color}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.color}>
                                    <BareInput
                                        id="cv-color"
                                        autoComplete="new-password"
                                        {...register('color')}
                                        placeholder={t.vehicles.form.colorPlaceholder}
                                    />
                                </InputShell>
                                {errors.color && (
                                    <FormErrorMsg>{errors.color.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField>
                                <FieldLabel htmlFor="cv-mileage">
                                    {t.vehicles.form.mileage}
                                </FieldLabel>
                                <InputShell $hasError={!!errors.currentMileage}>
                                    <BareInput
                                        id="cv-mileage"
                                        type="number"
                                        autoComplete="new-password"
                                        {...register('currentMileage', { valueAsNumber: true })}
                                        placeholder={t.vehicles.form.mileagePlaceholder}
                                    />
                                </InputShell>
                                {errors.currentMileage && (
                                    <FormErrorMsg>{errors.currentMileage.message}</FormErrorMsg>
                                )}
                            </FormField>

                            <FormField $fullWidth>
                                <FieldLabel htmlFor="cv-notes">
                                    {t.vehicles.form.notes.title}
                                </FieldLabel>
                                <InputShellTextArea $hasError={!!errors.technicalNotes}>
                                    <BareTextArea
                                        id="cv-notes"
                                        autoComplete="new-password"
                                        {...register('technicalNotes')}
                                        placeholder={t.vehicles.form.notes.placeholder}
                                    />
                                </InputShellTextArea>
                                {errors.technicalNotes && (
                                    <FormErrorMsg>{errors.technicalNotes.message}</FormErrorMsg>
                                )}
                            </FormField>
                        </FormGrid>
                    </FormTabPanel>

                    <FormTabPanel $active={activeTab === 'owners'}>
                        <FormField $fullWidth>
                            <FieldLabel>{t.vehicles.form.owners.title}</FieldLabel>
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
                                <FormErrorMsg>{errors.ownerIds.message}</FormErrorMsg>
                            )}
                        </FormField>
                    </FormTabPanel>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton
                    type="button"
                    $variant="secondary"
                    onClick={handleClose}
                    disabled={isCreating}
                >
                    {t.common.cancel}
                </SharedButton>
                <SharedButton
                    type="submit"
                    form="create-vehicle-form"
                    $variant="primary"
                    disabled={isCreating}
                >
                    {isCreating ? t.vehicles.form.submitting : t.vehicles.form.submit}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
