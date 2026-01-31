// src/modules/appointments/views/AppointmentEditView.tsx

import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { appointmentApi } from '../api/appointmentApi';
import { LoadingSkeleton } from '@/modules/appointments/components/common';
import { VerificationStep } from '@/modules/checkin/components/VerificationStep';
import { ScheduleSection } from '../components/ScheduleSection';
import type { CheckInFormData, ServiceLineItem as CheckInServiceLineItem } from '@/modules/checkin/types';
import type { AppointmentCreateRequest } from '@/modules/appointments/types';
import { Button } from '@/common/components/Button';
import { t } from '@/common/i18n';
import { toInstant } from '@/common/dateTime';

const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const ContentWrapper = styled.div`
    max-width: 1100px;
    margin: 0 auto;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const Actions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
`;

export const AppointmentEditView = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();

    const { data: appointment, isLoading: isLoadingAppointment, isError } = useQuery({
        queryKey: ['appointments', appointmentId],
        queryFn: () => appointmentApi.getAppointment(appointmentId!),
        enabled: !!appointmentId,
    });

    const { data: colors, isLoading: isLoadingColors } = useQuery({
        queryKey: ['appointmentColors'],
        queryFn: () => appointmentApi.getAppointmentColors(),
    });

    // Prepare initial CheckIn-like form data from appointment
    const initialData: Partial<CheckInFormData> | undefined = useMemo(() => {
        if (!appointment) return undefined;
        const hasFullCustomerData = !!(
            appointment.customer?.firstName &&
            appointment.customer?.lastName &&
            (appointment.customer?.phone || appointment.customer?.email)
        );

        return {
            customerData: {
                id: appointment.customerId,
                firstName: appointment.customer?.firstName || '',
                lastName: appointment.customer?.lastName || '',
                phone: appointment.customer?.phone || '',
                email: appointment.customer?.email || '',
            },
            hasFullCustomerData,
            isNewCustomer: false,
            vehicleData: appointment.vehicle
                ? {
                    id: appointment.vehicleId,
                    brand: appointment.vehicle.brand,
                    model: appointment.vehicle.model,
                    yearOfProduction: appointment.vehicle.year,
                    licensePlate: appointment.vehicle.licensePlate,
                    color: appointment.vehicle.color,
                    paintType: appointment.vehicle.paintType,
                }
                : null,
            isNewVehicle: false,
            homeAddress: appointment.customer?.homeAddress || null,
            company: appointment.customer?.company || null,
            services: (appointment.services || []).map((s: any) => ({
                id: s.id,
                serviceId: s.serviceId,
                serviceName: s.serviceName || s.name,
                basePriceNet: s.basePriceNet ?? s.priceNet ?? 0,
                vatRate: s.vatRate ?? 23,
                adjustment: s.adjustment || { type: 'PERCENT', value: 0 },
                note: s.note,
                requireManualPrice: !!s.requireManualPrice,
            })),
            appointmentColorId: appointment.appointmentColor?.id || '',
            technicalState: {
                mileage: 0,
                deposit: { keys: false, registrationDocument: false, other: false },
                inspectionNotes: '',
            },
            photos: [],
            damagePoints: [],
        } as Partial<CheckInFormData>;
    }, [appointment]);

    const [formData, setFormData] = useState<CheckInFormData | null>(null);

    // Local schedule state for editing dates in edit view
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDateTime, setStartDateTime] = useState('');
    const [endDateTime, setEndDateTime] = useState('');

    // preserve appointment title from appointment (not editable in this view)
    const appointmentTitleRef = useMemo(() => appointment?.appointmentTitle ?? '', [appointment]);

    useEffect(() => {
        if (initialData && !formData) {
            // fill defaults for required fields of CheckInFormData
            setFormData({
                customerData: {
                    id: '', firstName: '', lastName: '', phone: '', email: '',
                    ...(initialData.customerData || {}),
                },
                hasFullCustomerData: initialData.hasFullCustomerData ?? false,
                isNewCustomer: initialData.isNewCustomer ?? false,
                vehicleData: initialData.vehicleData ?? null,
                isNewVehicle: initialData.isNewVehicle ?? false,
                homeAddress: initialData.homeAddress ?? null,
                company: initialData.company ?? null,
                services: (initialData.services as CheckInServiceLineItem[]) ?? [],
                appointmentColorId: initialData.appointmentColorId ?? '',
                technicalState: initialData.technicalState || {
                    mileage: 0,
                    deposit: { keys: false, registrationDocument: false, other: false },
                    inspectionNotes: '',
                },
                photos: initialData.photos || [],
                damagePoints: initialData.damagePoints || [],
            });
        }
        // initialize schedule state from appointment with proper formatting for inputs
        if (appointment) {
            const isAllDayInit = appointment.schedule?.isAllDay ?? false;
            const startRaw = appointment.schedule?.startDateTime ?? appointment.startDateTime ?? '';
            const endRaw = appointment.schedule?.endDateTime ?? appointment.endDateTime ?? '';

            const toDateOnly = (val: string) => (val ? val.split('T')[0] : '');
            const toLocalDateTimeInput = (val: string) => {
                if (!val) return '';
                const trimmed = val.replace('Z', '');
                // expect format YYYY-MM-DDTHH:MM
                return trimmed.includes('T') ? trimmed.slice(0, 16) : trimmed;
            };

            setIsAllDay(isAllDayInit);
            setStartDateTime(isAllDayInit ? toDateOnly(startRaw) : toLocalDateTimeInput(startRaw));
            // Normalize end for both modes: remove trailing 'Z' for non-all-day to avoid backend parse error
            const toLocalDateTimeWithSeconds = (val: string) => {
                if (!val) return '';
                const trimmed = val.replace('Z', '');
                return trimmed.length >= 19 ? trimmed.slice(0, 19) : trimmed; // YYYY-MM-DDTHH:MM:SS
            };
            setEndDateTime(
                isAllDayInit
                    ? (endRaw ? `${toDateOnly(endRaw)}T23:59:59` : '')
                    : toLocalDateTimeWithSeconds(endRaw)
            );
        }
    }, [initialData, formData, appointment]);

    const updateMutation = useMutation({
        mutationFn: (payload: AppointmentCreateRequest) => appointmentApi.updateAppointment(appointmentId!, payload),
        onSuccess: () => navigate('/appointments'),
    });

    const handleChange = (updates: Partial<CheckInFormData>) => {
        setFormData(prev => (prev ? { ...prev, ...updates } as CheckInFormData : prev));
    };

    const handleServicesChange = (services: CheckInServiceLineItem[]) => {
        setFormData(prev => (prev ? { ...prev, services } : prev));
    };

    const handleSave = () => {
        if (!formData) return;

        // build update payload using CheckIn-like state + preserved schedule
        // Convert local input values to Instant (UTC ISO with 'Z') before sending to backend
        let startInstant = '';
        let endInstant = '';
        try {
            startInstant = toInstant(startDateTime);
            endInstant = toInstant(endDateTime);
        } catch (e) {
            console.error('Błąd konwersji daty do Instant (edit):', e);
            return;
        }

        const payload: AppointmentCreateRequest = {
            customer: formData.isNewCustomer
                ? {
                    mode: 'NEW',
                    newData: {
                        firstName: formData.customerData.firstName,
                        lastName: formData.customerData.lastName,
                        phone: formData.customerData.phone,
                        email: formData.customerData.email,
                    },
                }
                : {
                    mode: 'EXISTING',
                    id: formData.customerData.id,
                },
            vehicle: !formData.vehicleData
                ? { mode: 'NONE' }
                : formData.isNewVehicle
                    ? {
                        mode: 'NEW',
                        newData: {
                            brand: formData.vehicleData.brand,
                            model: formData.vehicleData.model,
                        },
                    }
                    : {
                        mode: 'EXISTING',
                        id: formData.vehicleData.id,
                    },
            services: formData.services,
            schedule: {
                isAllDay,
                startDateTime: startInstant,
                endDateTime: endInstant,
            },
            appointmentTitle: appointmentTitleRef || undefined,
            appointmentColorId: formData.appointmentColorId,
        };

        // basic guard
        if (!payload.customer || !payload.appointmentColorId || payload.services.length === 0 || !startDateTime || !endDateTime) return;

        updateMutation.mutate(payload);
    };

    if (isLoadingAppointment || isLoadingColors || !formData || isError) {
        return (
            <Container>
                <ContentWrapper>
                    <Header>
                        <Title>{t.appointments?.createView?.title || 'Edytuj rezerwację'}</Title>
                        <Actions></Actions>
                    </Header>
                    <LoadingSkeleton />
                </ContentWrapper>
            </Container>
        );
    }

    return (
        <Container>
            <ContentWrapper>
                <Header>
                    <Title>{'Edytuj rezerwację'}</Title>
                    <Actions>
                        <Button $variant="secondary" onClick={() => navigate('/appointments')} disabled={updateMutation.isPending}>
                            {t.common.cancel}
                        </Button>
                        <Button $variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? (t.appointments?.createView?.submitting || 'Zapisywanie...') : 'Zapisz zmiany'}
                        </Button>
                    </Actions>
                </Header>

                <ScheduleSection
                    isAllDay={isAllDay}
                    onIsAllDayChange={setIsAllDay}
                    startDateTime={startDateTime}
                    onStartDateTimeChange={setStartDateTime}
                    endDateTime={endDateTime}
                    onEndDateTimeChange={setEndDateTime}
                />

                <VerificationStep
                    formData={formData}
                    errors={{}}
                    onChange={handleChange}
                    onServicesChange={handleServicesChange}
                    colors={colors || []}
                />
            </ContentWrapper>
        </Container>
    );
};
