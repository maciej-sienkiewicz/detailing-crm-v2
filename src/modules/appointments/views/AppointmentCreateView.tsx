import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentForm, useServices, useCustomerVehicles, useAppointmentColors } from '../hooks/useAppointmentForm';
import { CustomerModal } from '../components/CustomerModal';
import { VehicleModal } from '../components/VehicleModal';
import { InvoiceSummary } from '../components/InvoiceSummary';
import type { SelectedCustomer, SelectedVehicle, ServiceLineItem } from '../types';
import { t } from '@/common/i18n';

const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const Header = styled.header`
    max-width: 1400px;
    margin: 0 auto ${props => props.theme.spacing.xxl} auto;
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xxxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.lg};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
`;

const MainContent = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    gap: ${props => props.theme.spacing.xxl};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const LeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
`;

const RightColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        position: sticky;
        top: ${props => props.theme.spacing.xxl};
        align-self: start;
    }
`;

const Card = styled.div`
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    box-shadow: ${props => props.theme.shadows.md};
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h2`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const SelectButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    box-shadow: ${props => props.theme.shadows.md};

    &:hover {
        transform: translateY(-2px);
        box-shadow: ${props => props.theme.shadows.lg};
    }
`;

const SelectedInfo = styled.div`
    padding: ${props => props.theme.spacing.xl};
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.02) 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px solid ${props => props.theme.colors.primary};
    position: relative;
    overflow: hidden;

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }
`;

const SelectedHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SelectedIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    box-shadow: ${props => props.theme.shadows.md};
    flex-shrink: 0;
`;

const SelectedTitle = styled.div`
    flex: 1;
`;

const SelectedName = styled.div`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const SelectedBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.successLight};
    color: ${props => props.theme.colors.success};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const SelectedDetails = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const DetailLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const DetailValue = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.primary};
    }
`;

const ChangeButton = styled.button`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
        color: ${props => props.theme.colors.primary};
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.sm};
    }

    &:active {
        transform: translateY(0);
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const Label = styled.label`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const ColorSelectWrapper = styled.div`
    position: relative;
`;

const ColorDot = styled.div<{ $color: string }>`
    position: absolute;
    left: ${props => props.theme.spacing.md};
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    border: 2px solid ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.sm};
    pointer-events: none;
    z-index: 1;
`;

const ColorSelect = styled.select`
    padding: ${props => props.theme.spacing.md};
    padding-left: 48px;
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    background-color: ${props => props.theme.colors.surface};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-weight: ${props => props.theme.fontWeights.medium};
    width: 100%;

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    option {
        padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
        padding-left: 32px;
        background-repeat: no-repeat;
        background-position: 8px center;
        background-size: 16px 16px;
    }
`;

const SectionHeaderWithToggle = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 2px solid ${props => props.theme.colors.border};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const CompactToggle = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const CompactToggleSwitch = styled.label`
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;
`;

const CompactToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + span {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }

    &:checked + span:before {
        transform: translateX(20px);
    }

    &:focus + span {
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
    }
`;

const CompactToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border};
    transition: all ${props => props.theme.transitions.normal};
    border-radius: ${props => props.theme.radii.full};
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);

    &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        transition: all ${props => props.theme.transitions.normal};
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
`;

const CompactToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    user-select: none;
`;

const ToggleContainer = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.surfaceAlt} 0%, ${props => props.theme.colors.surface} 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px solid ${props => props.theme.colors.border};
    transition: all ${props => props.theme.transitions.normal};
    margin-bottom: ${props => props.theme.spacing.lg};

    &:hover {
        border-color: ${props => props.theme.colors.primary};
        box-shadow: ${props => props.theme.shadows.sm};
    }
`;

const ToggleSwitch = styled.label`
    position: relative;
    display: inline-block;
    width: 56px;
    height: 32px;
    cursor: pointer;
    flex-shrink: 0;
`;

const ToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + span {
        background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
        box-shadow: ${props => props.theme.shadows.md};
    }

    &:checked + span:before {
        transform: translateX(24px);
    }

    &:focus + span {
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
    }
`;

const ToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.border};
    transition: all ${props => props.theme.transitions.normal};
    border-radius: ${props => props.theme.radii.full};
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

    &:before {
        position: absolute;
        content: "";
        height: 24px;
        width: 24px;
        left: 4px;
        bottom: 4px;
        background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
        transition: all ${props => props.theme.transitions.normal};
        border-radius: 50%;
        box-shadow: ${props => props.theme.shadows.md};
    }

    &:hover:before {
        box-shadow: ${props => props.theme.shadows.lg};
    }
`;

const ToggleLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    user-select: none;
`;

const GridLayout = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    flex-direction: column;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
    }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.normal};
    border: none;
    flex: 1;

    ${props => props.$variant === 'primary' ? `
        background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: ${props.theme.shadows.lg};
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    ` : `
        background-color: ${props.theme.colors.surface};
        color: ${props.theme.colors.text};
        border: 1px solid ${props.theme.colors.border};

        &:hover:not(:disabled) {
            background-color: ${props.theme.colors.surfaceHover};
        }
    `}
`;

const LoadingState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    font-size: ${props => props.theme.fontSizes.lg};
    color: ${props => props.theme.colors.textSecondary};
`;

const ErrorState = styled.div`
    background-color: ${props => props.theme.colors.errorLight};
    border: 1px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.error};
    text-align: center;
`;

export const AppointmentCreateView = () => {
    const navigate = useNavigate();
    const { createMutation } = useAppointmentForm();
    const { data: availableServices, isLoading: servicesLoading } = useServices();
    const { data: appointmentColors, isLoading: colorsLoading } = useAppointmentColors();

    const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicle | null>(null);
    const [serviceItems, setServiceItems] = useState<ServiceLineItem[]>([]);
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');
    const [appointmentTitle, setAppointmentTitle] = useState('');
    const [selectedColorId, setSelectedColorId] = useState('');

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);

    const { data: customerVehicles } = useCustomerVehicles(
        selectedCustomer?.id && !selectedCustomer.isNew ? selectedCustomer.id : undefined
    );

    useEffect(() => {
        if (appointmentColors && appointmentColors.length > 0 && !selectedColorId) {
            const timer = setTimeout(() => {
                setSelectedColorId(appointmentColors[0].id);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [appointmentColors, selectedColorId]);

    useEffect(() => {
        if (selectedCustomer && !selectedCustomer.isNew && customerVehicles && customerVehicles.length > 0 && !selectedVehicle) {
            setIsVehicleModalOpen(true);
        }
    }, [selectedCustomer, customerVehicles, selectedVehicle]);

    const handleCustomerSelect = (customer: SelectedCustomer) => {
        setSelectedCustomer(customer);
        setSelectedVehicle(null);
    };

    const handleVehicleSelect = (vehicle: SelectedVehicle) => {
        if (vehicle.brand && vehicle.model) {
            setSelectedVehicle(vehicle);
        }
    };

    const handleSubmit = () => {
        if (!selectedCustomer || !selectedColorId || serviceItems.length === 0 || !startDateTime || !endDateTime) {
            return;
        }

        const data = {
            customer: selectedCustomer.isNew
                ? {
                    mode: 'NEW' as const,
                    newData: {
                        firstName: selectedCustomer.firstName,
                        lastName: selectedCustomer.lastName,
                        phone: selectedCustomer.phone,
                        email: selectedCustomer.email,
                    },
                }
                : {
                    mode: 'EXISTING' as const,
                    id: selectedCustomer.id!,
                },
            vehicle: !selectedVehicle
                ? { mode: 'NONE' as const }
                : selectedVehicle.isNew
                    ? {
                        mode: 'NEW' as const,
                        newData: {
                            brand: selectedVehicle.brand,
                            model: selectedVehicle.model,
                        },
                    }
                    : {
                        mode: 'EXISTING' as const,
                        id: selectedVehicle.id!,
                    },
            services: serviceItems,
            schedule: {
                isAllDay,
                startDateTime,
                endDateTime,
            },
            appointmentTitle: appointmentTitle || undefined,
            appointmentColorId: selectedColorId,
        };

        createMutation.mutate(data, {
            onSuccess: () => {
                navigate('/appointments');
            },
        });
    };

    if (servicesLoading || colorsLoading) {
        return (
            <Container>
                <LoadingState>{t.common.loading}</LoadingState>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <Title>Nowe zgłoszenie serwisowe</Title>
                <Subtitle>Zaplanuj wizytę w warsztacie</Subtitle>
            </Header>

            <MainContent>
                <LeftColumn>
                    <Card>
                        <SectionHeader>
                            <SectionTitle>Szczegóły rezerwacji</SectionTitle>
                        </SectionHeader>

                        <GridLayout>
                            <FieldGroup>
                                <Label>Nazwa rezerwacji (opcjonalnie)</Label>
                                <Input
                                    type="text"
                                    placeholder="np. Oklejanie PPF - BMW X5"
                                    value={appointmentTitle}
                                    onChange={(e) => setAppointmentTitle(e.target.value)}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Kolor rezerwacji *</Label>
                                <ColorSelectWrapper>
                                    <ColorDot
                                        $color={appointmentColors?.find(c => c.id === selectedColorId)?.hexColor || '#cccccc'}
                                    />
                                    <ColorSelect
                                        value={selectedColorId}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedColorId(e.target.value)}
                                    >
                                        {appointmentColors?.map((color) => (
                                            <option
                                                key={color.id}
                                                value={color.id}
                                                style={{
                                                    backgroundImage: `radial-gradient(circle at 12px center, ${color.hexColor} 6px, transparent 7px)`,
                                                }}
                                            >
                                                {color.name}
                                            </option>
                                        ))}
                                    </ColorSelect>
                                </ColorSelectWrapper>
                            </FieldGroup>
                        </GridLayout>
                    </Card>

                    <Card>
                        <SectionHeader>
                            <SectionTitle>Klient</SectionTitle>
                        </SectionHeader>

                        {!selectedCustomer ? (
                            <SelectButton onClick={() => setIsCustomerModalOpen(true)}>
                                Dodaj lub wyszukaj klienta
                            </SelectButton>
                        ) : (
                            <SelectedInfo>
                                <SelectedHeader>
                                    <SelectedIcon>
                                        {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
                                    </SelectedIcon>
                                    <SelectedTitle>
                                        <SelectedName>
                                            {selectedCustomer.firstName} {selectedCustomer.lastName}
                                        </SelectedName>
                                        <SelectedBadge>
                                            {selectedCustomer.isNew ? '✨ Nowy klient' : '✓ Z bazy'}
                                        </SelectedBadge>
                                    </SelectedTitle>
                                </SelectedHeader>
                                <SelectedDetails>
                                    <DetailItem>
                                        <DetailLabel>Email</DetailLabel>
                                        <DetailValue>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {selectedCustomer.email}
                                        </DetailValue>
                                    </DetailItem>
                                    <DetailItem>
                                        <DetailLabel>Telefon</DetailLabel>
                                        <DetailValue>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {selectedCustomer.phone}
                                        </DetailValue>
                                    </DetailItem>
                                </SelectedDetails>
                                <ChangeButton onClick={() => setIsCustomerModalOpen(true)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Zmień klienta
                                </ChangeButton>
                            </SelectedInfo>
                        )}
                    </Card>

                    <Card>
                        <SectionHeader>
                            <SectionTitle>Pojazd</SectionTitle>
                        </SectionHeader>

                        {!selectedVehicle ? (
                            <SelectButton onClick={() => setIsVehicleModalOpen(true)}>
                                Wybierz lub dodaj pojazd
                            </SelectButton>
                        ) : (
                            <SelectedInfo>
                                <SelectedHeader>
                                    <SelectedIcon>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </SelectedIcon>
                                    <SelectedTitle>
                                        <SelectedName>
                                            {selectedVehicle.brand} {selectedVehicle.model}
                                        </SelectedName>
                                        <SelectedBadge>
                                            {selectedVehicle.isNew ? '✨ Nowy pojazd' : '✓ Z bazy'}
                                        </SelectedBadge>
                                    </SelectedTitle>
                                </SelectedHeader>
                                <ChangeButton onClick={() => setIsVehicleModalOpen(true)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Zmień pojazd
                                </ChangeButton>
                            </SelectedInfo>
                        )}
                    </Card>

                    <Card>
                        <SectionHeaderWithToggle>
                            <SectionTitle>Harmonogram</SectionTitle>
                            <CompactToggle>
                                <CompactToggleSwitch>
                                    <CompactToggleInput
                                        type="checkbox"
                                        checked={isAllDay}
                                        onChange={(e) => {
                                            setIsAllDay(e.target.checked);
                                            if (e.target.checked && startDateTime) {
                                                const date = startDateTime.split('T')[0];
                                                setStartDateTime(date);
                                                if (endDateTime) {
                                                    setEndDateTime(`${endDateTime.split('T')[0]}T23:59:59`);
                                                }
                                            }
                                        }}
                                    />
                                    <CompactToggleSlider />
                                </CompactToggleSwitch>
                                <CompactToggleLabel>Wizyta całodniowa</CompactToggleLabel>
                            </CompactToggle>
                        </SectionHeaderWithToggle>

                        <GridLayout>
                            <FieldGroup>
                                <Label>Data i godzina rozpoczęcia</Label>
                                <Input
                                    type={isAllDay ? 'date' : 'datetime-local'}
                                    value={startDateTime}
                                    onChange={(e) => setStartDateTime(e.target.value)}
                                />
                            </FieldGroup>

                            <FieldGroup>
                                <Label>Data zakończenia</Label>
                                <Input
                                    type="date"
                                    value={endDateTime.split('T')[0] || ''}
                                    onChange={(e) => {
                                        if (isAllDay) {
                                            setEndDateTime(`${e.target.value}T23:59:59`);
                                        } else {
                                            setEndDateTime(`${e.target.value}T23:59:59`);
                                        }
                                    }}
                                />
                            </FieldGroup>
                        </GridLayout>
                    </Card>
                </LeftColumn>

                <RightColumn>
                    <InvoiceSummary
                        services={serviceItems}
                        availableServices={availableServices || []}
                        onChange={setServiceItems}
                    />

                    <ButtonGroup>
                        <Button $variant="secondary" onClick={() => navigate('/appointments')}>
                            {t.common.cancel}
                        </Button>
                        <Button
                            $variant="primary"
                            onClick={handleSubmit}
                            disabled={!selectedCustomer || !selectedColorId || serviceItems.length === 0 || !startDateTime || !endDateTime || createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Tworzenie...' : 'Utwórz zgłoszenie'}
                        </Button>
                    </ButtonGroup>

                    {createMutation.isError && (
                        <ErrorState>
                            Nie udało się utworzyć zgłoszenia. Spróbuj ponownie.
                        </ErrorState>
                    )}
                </RightColumn>
            </MainContent>

            <CustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={handleCustomerSelect}
            />

            <VehicleModal
                isOpen={isVehicleModalOpen}
                vehicles={customerVehicles || []}
                onClose={() => setIsVehicleModalOpen(false)}
                onSelect={handleVehicleSelect}
                allowSkip
            />
        </Container>
    );
};