import { useCallback, useEffect, useState } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
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
import { BrandSelect, ModelSelect } from './BrandModelSelectors';
import { VehicleKindSwitch } from './VehicleKindSwitch';
import { DEFAULT_VEHICLE_KIND } from '../vehicleKind';
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
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateVehicleFormData>({
        resolver: zodResolver(createVehicleSchema),
        defaultValues: {
            // Nowy pojazd startuje jako samochód - tak było, zanim pojawiły się motocykle.
            kind: DEFAULT_VEHICLE_KIND,
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

    const capReg = (field: Parameters<typeof register>[0]) => {
        const reg = register(field);
        return {
            ...reg,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                e.target.value = capitalizeFirst(e.target.value);
                return reg.onChange(e);
            },
        };
    };

    const kind = watch('kind');
    const brand = watch('brand');

    const handleFormSubmit = useCallback((data: CreateVehicleFormData) => {
        const payload: CreateVehiclePayload = {
            kind: data.kind,
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
                            {/* Rodzaj stoi nad marką, bo to on wybiera katalog marek i modeli.
                                Marka i model idą więc zaraz pod nim (jak w edycji pojazdu),
                                a rejestracja za nimi: na pierwszym miejscu rozdzielałaby
                                przełącznik od pola, na które działa. */}
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
                                <FieldLabel>{t.vehicles.form.brand}</FieldLabel>
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
                                <FieldLabel>{t.vehicles.form.model}</FieldLabel>
                                <Controller
                                    name="model"
                                    control={control}
                                    render={({ field }) => (
                                        <ModelSelect
                                            kind={kind}
                                            brand={brand}
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
                                        {...capReg('technicalNotes')}
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
