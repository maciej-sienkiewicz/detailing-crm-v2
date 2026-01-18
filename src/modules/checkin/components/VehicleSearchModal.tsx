// src/modules/checkin/components/VehicleSearchModal.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useDebounce } from '@/common/hooks';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal';
import { FormGrid, FieldGroup, Label, Input, ErrorMessage, Select } from '@/common/components/Form';
import { Button, ButtonGroup } from '@/common/components/Button';
import { EmptyState } from '@/common/components/EmptyState';
import { vehicleApi } from '@/modules/vehicles/api/vehicleApi';
import type { VehicleListItem } from '@/modules/vehicles/types';

const SearchInput = styled(Input)`
    margin-bottom: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.md};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
`;

const VehicleTable = styled.div`
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    overflow: hidden;
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const VehicleRow = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 2fr 1fr 1fr;
        gap: ${props => props.theme.spacing.md};
    }

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        transform: translateX(4px);
        border-left: 3px solid ${props => props.theme.colors.primary};
        padding-left: calc(${props => props.theme.spacing.lg} - 3px);
    }

    &:last-child {
        border-bottom: none;
    }
`;

const VehicleHeader = styled(VehicleRow)`
    background-color: ${props => props.theme.colors.surfaceAlt};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: default;

    &:hover {
        background-color: ${props => props.theme.colors.surfaceAlt};
        transform: none;
        border-left: none;
        padding-left: ${props => props.theme.spacing.lg};
    }
`;

const VehicleCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const PrimaryText = styled.span`
    color: ${props => props.theme.colors.text};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const SecondaryText = styled.span`
    color: ${props => props.theme.colors.textSecondary};
    font-size: ${props => props.theme.fontSizes.sm};
`;

const SectionDivider = styled.div`
    margin: ${props => props.theme.spacing.lg} 0;
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SectionTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.md};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export interface SelectedVehicle {
    id?: string;
    brand: string;
    model: string;
    yearOfProduction: number;
    licensePlate?: string;
    vin?: string;
    color?: string;
    paintType?: string;
    isNew: boolean;
}

interface VehicleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (vehicle: SelectedVehicle) => void;
    customerId?: string; // ID klienta do filtrowania pojazdów
}

type VehicleMode = 'search' | 'new';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export const VehicleSearchModal = ({ isOpen, onClose, onSelect }: VehicleSearchModalProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [mode, setMode] = useState<VehicleMode>('search');
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        yearOfProduction: CURRENT_YEAR,
        licensePlate: '',
        color: '',
        paintType: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const debouncedQuery = useDebounce(searchQuery, 300);

    const { data: vehicleResponse, isLoading } = useQuery({
        queryKey: ['vehicles', debouncedQuery],
        queryFn: () => vehicleApi.getVehicles({
            search: debouncedQuery,
            page: 1,
            limit: 50,
        }),
        enabled: isOpen && mode === 'search' && debouncedQuery.length > 0,
    });

    const handleVehicleClick = (vehicle: VehicleListItem) => {
        onSelect({
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            yearOfProduction: vehicle.yearOfProduction,
            isNew: false,
        });
        resetAndClose();
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.brand || formData.brand.trim().length < 2) {
            newErrors.brand = 'Marka musi mieć co najmniej 2 znaki';
        }
        if (!formData.model || formData.model.trim().length < 1) {
            newErrors.model = 'Model jest wymagany';
        }
        if (!formData.yearOfProduction || formData.yearOfProduction < 1900 || formData.yearOfProduction > CURRENT_YEAR + 1) {
            newErrors.yearOfProduction = `Rok produkcji musi być między 1900 a ${CURRENT_YEAR + 1}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitNew = () => {
        if (!validateForm()) return;

        onSelect({
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            yearOfProduction: formData.yearOfProduction,
            licensePlate: formData.licensePlate.trim() || undefined,
            color: formData.color.trim() || undefined,
            paintType: formData.paintType.trim() || undefined,
            isNew: true,
        });
        resetAndClose();
    };

    const resetAndClose = () => {
        setSearchQuery('');
        setMode('search');
        setFormData({
            brand: '',
            model: '',
            yearOfProduction: CURRENT_YEAR,
            licensePlate: '',
            color: '',
            paintType: '',
        });
        setErrors({});
        onClose();
    };

    const modalTitle = mode === 'new' ? 'Dodaj nowy pojazd' : 'Wyszukaj lub dodaj pojazd';

    const vehicles = vehicleResponse?.data || [];

    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} title={modalTitle}>
            {mode === 'search' ? (
                <>
                    <SearchInput
                        type="text"
                        placeholder="Wyszukaj po marce, modelu lub numerze rejestracyjnym..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {isLoading ? (
                        <EmptyState title="Wyszukiwanie..." />
                    ) : vehicles.length > 0 ? (
                        <VehicleTable>
                            <VehicleHeader>
                                <div>Pojazd</div>
                                <div>Rok</div>
                                <div>Właściciel</div>
                            </VehicleHeader>
                            {vehicles.map((vehicle) => (
                                <VehicleRow
                                    key={vehicle.id}
                                    onClick={() => handleVehicleClick(vehicle)}
                                >
                                    <VehicleCell>
                                        <PrimaryText>
                                            {vehicle.brand} {vehicle.model}
                                        </PrimaryText>
                                        <SecondaryText>{vehicle.licensePlate}</SecondaryText>
                                    </VehicleCell>
                                    <VehicleCell>
                                        <SecondaryText>{vehicle.yearOfProduction}</SecondaryText>
                                    </VehicleCell>
                                    <VehicleCell>
                                        {vehicle.owners.length > 0 && (
                                            <SecondaryText>{vehicle.owners[0].customerName}</SecondaryText>
                                        )}
                                    </VehicleCell>
                                </VehicleRow>
                            ))}
                        </VehicleTable>
                    ) : (
                        <EmptyState
                            title={searchQuery
                                ? 'Nie znaleziono pojazdów'
                                : 'Wprowadź markę, model lub numer rejestracyjny'}
                        />
                    )}

                    <ButtonGroup>
                        <Button $variant="primary" onClick={() => setMode('new')}>
                            Dodaj nowy pojazd
                        </Button>
                    </ButtonGroup>
                </>
            ) : (
                <>
                    <SectionTitle>Dane wymagane</SectionTitle>
                    <FormGrid>
                        <FieldGroup>
                            <Label>Marka *</Label>
                            <Input
                                value={formData.brand}
                                onChange={(e) =>
                                    setFormData({ ...formData, brand: e.target.value })
                                }
                                placeholder="np. BMW, Audi, Mercedes"
                            />
                            {errors.brand && <ErrorMessage>{errors.brand}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Model *</Label>
                            <Input
                                value={formData.model}
                                onChange={(e) =>
                                    setFormData({ ...formData, model: e.target.value })
                                }
                                placeholder="np. X5, A4, C-Class"
                            />
                            {errors.model && <ErrorMessage>{errors.model}</ErrorMessage>}
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Rok produkcji *</Label>
                            <Select
                                value={formData.yearOfProduction}
                                onChange={(e) =>
                                    setFormData({ ...formData, yearOfProduction: parseInt(e.target.value) })
                                }
                            >
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </Select>
                            {errors.yearOfProduction && <ErrorMessage>{errors.yearOfProduction}</ErrorMessage>}
                        </FieldGroup>
                    </FormGrid>

                    <SectionDivider />

                    <SectionTitle>Dane opcjonalne</SectionTitle>
                    <FormGrid>
                        <FieldGroup>
                            <Label>Numer rejestracyjny</Label>
                            <Input
                                value={formData.licensePlate}
                                onChange={(e) =>
                                    setFormData({ ...formData, licensePlate: e.target.value })
                                }
                                placeholder="np. WA 12345"
                            />
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Kolor</Label>
                            <Input
                                value={formData.color}
                                onChange={(e) =>
                                    setFormData({ ...formData, color: e.target.value })
                                }
                                placeholder="np. Czarny metalik"
                            />
                        </FieldGroup>

                        <FieldGroup>
                            <Label>Typ lakieru</Label>
                            <Input
                                value={formData.paintType}
                                onChange={(e) =>
                                    setFormData({ ...formData, paintType: e.target.value })
                                }
                                placeholder="np. Lakier bazowy + lakier"
                            />
                        </FieldGroup>
                    </FormGrid>

                    <ButtonGroup>
                        <Button $variant="secondary" onClick={() => setMode('search')}>
                            Wróć do wyszukiwania
                        </Button>
                        <Button $variant="primary" onClick={handleSubmitNew}>
                            Dodaj pojazd
                        </Button>
                    </ButtonGroup>
                </>
            )}
        </Modal>
    );
};
