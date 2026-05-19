import { useState, useEffect } from 'react';
import styled from 'styled-components';
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
import { FormGrid, FieldGroup, Label, Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { useVehicleDetail } from '@/modules/vehicles/hooks/useVehicleDetail';

const SectionTitle = styled.h4`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: ${props => props.theme.spacing.md} 0;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.theme.colors.primary};
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehicleDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string | null;
    fallbackData?: {
        brand: string;
        model: string;
        yearOfProduction?: number;
        licensePlate: string;
        color?: string;
    };
    onSave: (data: {
        vehicleData: {
            brand: string;
            model: string;
            yearOfProduction?: number;
            licensePlate: string;
            color?: string;
        };
    }) => void;
}

export const VehicleDetailsModal = ({
    isOpen,
    onClose,
    vehicleId,
    fallbackData,
    onSave,
}: VehicleDetailsModalProps) => {
    // Pobierz dane z API jeśli vehicleId istnieje
    const { vehicleDetail, isLoading } = useVehicleDetail(vehicleId || '');

    const [localVehicleData, setLocalVehicleData] = useState({
        brand: '',
        model: '',
        yearOfProduction: undefined as number | undefined,
        licensePlate: '',
        color: '',
    });

    // Inicjalizuj dane gdy modal się otwiera
    useEffect(() => {
        if (!isOpen) return;

        // Preferuj fallbackData (dane z rezerwacji) nad danymi z API
        if (fallbackData) {
            setLocalVehicleData({
                brand: fallbackData.brand,
                model: fallbackData.model,
                yearOfProduction: fallbackData.yearOfProduction,
                licensePlate: fallbackData.licensePlate,
                color: fallbackData.color || '',
            });
        } else if (vehicleDetail) {
            setLocalVehicleData({
                brand: vehicleDetail.vehicle.brand,
                model: vehicleDetail.vehicle.model,
                yearOfProduction: vehicleDetail.vehicle.yearOfProduction,
                licensePlate: vehicleDetail.vehicle.licensePlate,
                color: vehicleDetail.vehicle.color || '',
            });
        }
    }, [isOpen, vehicleDetail, fallbackData]);

    const handleVehicleDataChange = (field: string, value: string) => {
        setLocalVehicleData(prev => ({
            ...prev,
            [field]: field === 'yearOfProduction' ? (value ? parseInt(value, 10) : undefined) : value
        }));
    };

    const handleSave = () => {
        onSave({
            vehicleData: localVehicleData,
        });
        onClose();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="800px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dane pojazdu</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {isLoading ? (
                    <LoadingContainer>
                        Ładowanie danych pojazdu...
                    </LoadingContainer>
                ) : (
                    <>
                        <SectionTitle>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            Dane pojazdu
                        </SectionTitle>

                        <FormGrid>
                            <FieldGroup>
                                <Label>{t.checkin.verification.brand}</Label>
                                <Input
                                    value={localVehicleData.brand}
                                    onChange={(e) => handleVehicleDataChange('brand', e.target.value)}
                                    placeholder="np. Toyota"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.checkin.verification.model}</Label>
                                <Input
                                    value={localVehicleData.model}
                                    onChange={(e) => handleVehicleDataChange('model', e.target.value)}
                                    placeholder="np. Corolla"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Rok produkcji</Label>
                                <Input
                                    type="number"
                                    value={localVehicleData.yearOfProduction || ''}
                                    onChange={(e) => handleVehicleDataChange('yearOfProduction', e.target.value)}
                                    placeholder="np. 2020"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>{t.checkin.verification.licensePlate}</Label>
                                <Input
                                    value={localVehicleData.licensePlate}
                                    onChange={(e) => handleVehicleDataChange('licensePlate', e.target.value.toUpperCase())}
                                    placeholder="np. WW12345"
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Kolor</Label>
                                <Input
                                    value={localVehicleData.color}
                                    onChange={(e) => handleVehicleDataChange('color', e.target.value)}
                                    placeholder="np. Czarny metalik"
                                />
                            </FieldGroup>
                        </FormGrid>
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" onClick={onClose}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" onClick={handleSave}>
                    Zapisz zmiany
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
