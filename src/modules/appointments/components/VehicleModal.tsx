// src/modules/appointments/components/VehicleModal.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import type { Vehicle, SelectedVehicle } from '../types';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import {
    ModalOverlay,
    ModalBox,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalSectionDivider,
    FormFieldGroup,
    FormLabel,
    FormErrorMessage,
    SharedButton,
    SharedButtonGroup,
} from '@/common/styles';

// ─── Vehicle selection cards ──────────────────────────────────────────────────

const VehicleGrid = styled.div`
    display: grid;
    gap: 10px;
    max-height: 340px;
    overflow-y: auto;
    padding: 2px;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
    }

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
`;

const VehicleCard = styled.button`
    padding: 16px;
    border: 1.5px solid #e2e8f0;
    border-radius: 16px;
    cursor: pointer;
    transition: all 180ms ease;
    background: #ffffff;
    text-align: left;
    width: 100%;

    &:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(14,165,233,0.12);
    }

    &:active { transform: translateY(0); }
`;

const VehicleName = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    letter-spacing: -0.3px;
`;

const VehicleDetails = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const VehicleDetail = styled.span`
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
`;

// ─── New vehicle form ─────────────────────────────────────────────────────────

const FormGrid = styled.div`
    display: grid;
    gap: 16px;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

// ─── Close icon ───────────────────────────────────────────────────────────────

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface VehicleModalProps {
    isOpen: boolean;
    vehicles: Vehicle[];
    onClose: () => void;
    onSelect: (vehicle: SelectedVehicle) => void;
    allowSkip?: boolean;
    initialMode?: 'select' | 'new';
}

export const VehicleModal = ({
    isOpen,
    vehicles,
    onClose,
    onSelect,
    allowSkip = false,
    initialMode = 'select',
}: VehicleModalProps) => {
    const [showNewForm, setShowNewForm] = useState(initialMode === 'new');

    useEffect(() => {
        if (isOpen) setShowNewForm(initialMode === 'new');
    }, [isOpen, initialMode]);

    const [formData, setFormData] = useState({ brand: '', model: '' });
    const [errors, setErrors]     = useState<Record<string, string>>({});

    const handleVehicleClick = (vehicle: Vehicle) => {
        onSelect({ id: vehicle.id, brand: vehicle.brand, model: vehicle.model, isNew: false });
        onClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.brand || formData.brand.length < 2)
            newErrors.brand = t.appointments.validation.brandMinLength;
        if (!formData.model || formData.model.length < 1)
            newErrors.model = t.appointments.validation.modelRequired;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;
        onSelect({ ...formData, isNew: true });
        onClose();
    };

    const handleSkip = () => {
        onSelect({ brand: '', model: '', isNew: false });
        onClose();
    };

    if (!isOpen) return null;

    const title = showNewForm
        ? t.appointments.vehicleModal.titleNew
        : t.appointments.vehicleModal.titleSelect;

    return (
        <ModalOverlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <ModalBox $isOpen={isOpen} $maxWidth="640px">

                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{title}</ModalTitle>
                    </ModalTitleGroup>
                    <ModalCloseButton type="button" onClick={onClose}>
                        <IconX />
                    </ModalCloseButton>
                </ModalHeader>

                <ModalContent>
                    {!showNewForm ? (
                        <>
                            {vehicles.length > 0 && (
                                <>
                                    <VehicleGrid>
                                        {vehicles.map((vehicle) => (
                                            <VehicleCard
                                                key={vehicle.id}
                                                type="button"
                                                onClick={() => handleVehicleClick(vehicle)}
                                            >
                                                <VehicleName>
                                                    {vehicle.brand} {vehicle.model}
                                                </VehicleName>
                                                <VehicleDetails>
                                                    <VehicleDetail>
                                                        {t.appointments.vehicleModal.year}: {vehicle.year}
                                                    </VehicleDetail>
                                                    <VehicleDetail>·</VehicleDetail>
                                                    <VehicleDetail>{vehicle.licensePlate}</VehicleDetail>
                                                </VehicleDetails>
                                            </VehicleCard>
                                        ))}
                                    </VehicleGrid>
                                    <ModalSectionDivider />
                                </>
                            )}

                            <SharedButtonGroup $align="between">
                                <SharedButton $variant="primary" type="button" onClick={() => setShowNewForm(true)}>
                                    {t.appointments.vehicleModal.addNewButton}
                                </SharedButton>
                                {allowSkip && (
                                    <SharedButton $variant="ghost" type="button" onClick={handleSkip}>
                                        {t.appointments.vehicleModal.skip}
                                    </SharedButton>
                                )}
                            </SharedButtonGroup>
                        </>
                    ) : (
                        <FormGrid>
                            <FormFieldGroup>
                                <FormLabel>{t.appointments.vehicleModal.brand}</FormLabel>
                                <BrandSelect
                                    value={formData.brand}
                                    onChange={(val) => setFormData({ ...formData, brand: val, model: '' })}
                                    autoOpen={true}
                                />
                                {errors.brand && <FormErrorMessage>{errors.brand}</FormErrorMessage>}
                            </FormFieldGroup>

                            <FormFieldGroup>
                                <FormLabel>{t.appointments.vehicleModal.model}</FormLabel>
                                <ModelSelect
                                    brand={formData.brand}
                                    value={formData.model}
                                    onChange={(val) => setFormData({ ...formData, model: val })}
                                    autoOpen={true}
                                />
                                {errors.model && <FormErrorMessage>{errors.model}</FormErrorMessage>}
                            </FormFieldGroup>
                        </FormGrid>
                    )}
                </ModalContent>

                {showNewForm && (
                    <ModalFooter>
                        <SharedButton $variant="secondary" type="button" onClick={() => setShowNewForm(false)}>
                            {t.appointments.vehicleModal.cancelButton}
                        </SharedButton>
                        <SharedButton $variant="primary" type="button" onClick={handleSubmitNew}>
                            {t.appointments.vehicleModal.confirmButton}
                        </SharedButton>
                    </ModalFooter>
                )}
            </ModalBox>
        </ModalOverlay>
    );
};
