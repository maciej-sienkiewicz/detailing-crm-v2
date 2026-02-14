import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { CheckInWizardView } from './CheckInWizardView';
import { t } from '@/common/i18n';
import { appointmentApi } from '@/modules/appointments';
import { customerDetailApi } from '@/modules/customers/api/customerDetailApi';
import { fromInstantToLocalInput } from '@/common/dateTime';

const LoadingContainer = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.theme.colors.background};
`;

const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: ${props => props.theme.radii.full};
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const LoadingText = styled.p`
    margin-top: ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

const ErrorContainer = styled.div`
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: ${props => props.theme.colors.background};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
`;

const ErrorIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: ${props => props.theme.radii.full};
    background-color: ${props => props.theme.colors.errorLight};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.lg};

    svg {
        width: 40px;
        height: 40px;
        color: ${props => props.theme.colors.error};
    }
`;

const ErrorTitle = styled.h1`
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
`;

const ErrorMessage = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
`;

interface ReservationResponse {
    id: string;
    customer: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        homeAddress?: {
            street: string;
            city: string;
            postalCode: string;
            country: string;
        };
        company?: {
            name: string;
            nip: string;
            regon: string;
            address: {
                street: string;
                city: string;
                postalCode: string;
                country: string;
            };
        };
    };
    vehicle: {
        id: string;
        brand: string;
        model: string;
        yearOfProduction: number;
        licensePlate: string;
        color?: string;
        paintType?: string;
    } | null;
    services: Array<{
        id: string;
        serviceId: string;
        serviceName: string;
        basePriceNet: number;
        vatRate: number;
        adjustment: {
            type: 'PERCENT' | 'FIXED_NET' | 'FIXED_GROSS' | 'SET_NET' | 'SET_GROSS';
            value: number;
        };
        note?: string;
    }>;
    status: string;
    appointmentColor?: {
        id: string;
        name: string;
        hexColor: string;
    };
}


export const CheckInWizardWrapper = () => {
    const { reservationId } = useParams<{ reservationId: string }>();
    const navigate = useNavigate();

    const { data: reservationData, isLoading, error } = useQuery({
        queryKey: ['reservations', reservationId],
        queryFn: () => appointmentApi.getAppointment(reservationId!),
        enabled: !!reservationId,
        retry: 1,
    });

    const { data: colors, isLoading: isLoadingColors } = useQuery({
        queryKey: ['appointmentColors'],
        queryFn: () => appointmentApi.getAppointmentColors(),
    });

    // Pobierz pełne dane klienta (z homeAddress i company)
    const customerId = reservationData?.customerId;
    const { data: customerDetailData, isLoading: isLoadingCustomerDetail } = useQuery({
        queryKey: ['customerDetail', customerId],
        queryFn: () => customerDetailApi.getCustomerDetail(customerId!),
        enabled: !!customerId,
        retry: 1,
    });

    // Mapowanie danych z backendu na format oczekiwany przez CheckInWizardView
    const reservation: ReservationResponse | undefined = reservationData ? {
        id: reservationData.id,
        customer: {
            id: reservationData.customerId,
            firstName: reservationData.customer.firstName,
            lastName: reservationData.customer.lastName,
            phone: reservationData.customer.phone,
            email: reservationData.customer.email,
            // Użyj danych z customerDetailData jeśli są dostępne, w przeciwnym razie null
            homeAddress: customerDetailData?.customer.homeAddress || null,
            company: customerDetailData?.customer.company ? {
                name: customerDetailData.customer.company.name || '',
                nip: customerDetailData.customer.company.nip || '',
                regon: customerDetailData.customer.company.regon || '',
                address: {
                    street: customerDetailData.customer.company.address?.street || '',
                    city: customerDetailData.customer.company.address?.city || '',
                    postalCode: customerDetailData.customer.company.address?.postalCode || '',
                    country: customerDetailData.customer.company.address?.country || 'Polska',
                },
            } : null,
        },
        vehicle: reservationData.vehicle ? {
            id: reservationData.vehicleId,
            brand: reservationData.vehicle.brand,
            model: reservationData.vehicle.model,
            yearOfProduction: reservationData.vehicle.year,
            licensePlate: reservationData.vehicle.licensePlate,
            color: reservationData.vehicle.color,
            paintType: reservationData.vehicle.paintType,
        } : null,
        services: reservationData.services?.map((service: any) => ({
            id: service.id,
            serviceId: service.serviceId,
            serviceName: service.serviceName || service.name,
            basePriceNet: service.basePriceNet || service.priceNet || 0,
            vatRate: service.vatRate || 23,
            adjustment: service.adjustment || { type: 'PERCENT', value: 0 },
            note: service.note,
        })) || [],
        status: reservationData.status,
        appointmentColor: reservationData.appointmentColor,
    } : undefined;

    const handleComplete = (visitId: string) => {
        navigate(`/visits/${visitId}`);
    };

    if (isLoading || isLoadingColors || isLoadingCustomerDetail) {
        return (
            <LoadingContainer>
                <Spinner />
                <LoadingText>{t.common.loading}</LoadingText>
            </LoadingContainer>
        );
    }

    if (error || !reservation || !colors) {
        return (
            <ErrorContainer>
                <ErrorIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </ErrorIcon>
                <ErrorTitle>{t.checkin.errors.loadReservationFailed}</ErrorTitle>
                <ErrorMessage>
                    {error instanceof Error ? error.message : 'Nie znaleziono rezerwacji'}
                </ErrorMessage>
            </ErrorContainer>
        );
    }

    if (reservation.status !== 'CREATED' && reservation.status !== 'SCHEDULED') {
        return (
            <ErrorContainer>
                <ErrorIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </ErrorIcon>
                <ErrorTitle>Nieprawidłowy status rezerwacji</ErrorTitle>
                <ErrorMessage>
                    Rezerwacja musi być w statusie POTWIERDZONA lub ZAPLANOWANA aby rozpocząć wizytę
                </ErrorMessage>
            </ErrorContainer>
        );
    }

    // Sprawdzamy czy mamy pełne dane klienta
    // Wymagane: imię, nazwisko i co najmniej jeden sposób kontaktu (telefon LUB email)
    const hasFullCustomerData = !!(
        reservation.customer?.firstName &&
        reservation.customer?.lastName &&
        (reservation.customer?.phone || reservation.customer?.email)
    );

    // Przygotuj daty rozpoczęcia i zakończenia dla kreatora w standardzie Instant
    // i sformatuj je do lokalnego formatu wejściowego dla input[type="datetime-local"]

    const nowIso = new Date().toISOString();
    const startRaw = (reservationData as any)?.schedule?.startDateTime || (reservationData as any)?.startDateTime || nowIso;
    const endRawFromApi = (reservationData as any)?.schedule?.endDateTime || (reservationData as any)?.endDateTime || '';

    const endRaw = endRawFromApi || (() => {
        try {
            const d = new Date(startRaw);
            if (isNaN(d.getTime())) return '';
            d.setHours(d.getHours() + 1);
            return d.toISOString();
        } catch {
            return '';
        }
    })();

    const initialData = {
        customerData: {
            id: reservation.customer?.id || '',
            firstName: reservation.customer?.firstName || '',
            lastName: reservation.customer?.lastName || '',
            phone: reservation.customer?.phone || '',
            email: reservation.customer?.email || '',
        },
        hasFullCustomerData,
        isNewCustomer: false, // Dane z rezerwacji - klient już istnieje
        vehicleData: reservation.vehicle ? {
            id: reservation.vehicle.id,
            brand: reservation.vehicle.brand,
            model: reservation.vehicle.model,
            yearOfProduction: reservation.vehicle.yearOfProduction,
            licensePlate: reservation.vehicle.licensePlate,
            color: reservation.vehicle.color,
            paintType: reservation.vehicle.paintType,
        } : null,
        isNewVehicle: false, // Dane z rezerwacji - pojazd już istnieje
        homeAddress: reservation.customer?.homeAddress || null,
        company: reservation.customer?.company || null,
        services: reservation.services,
        appointmentColorId: reservation.appointmentColor?.id || '',
        technicalState: {
            inspectionNotes: (reservationData as any)?.note || '',
        },
        visitStartAt: fromInstantToLocalInput(startRaw),
        visitEndAt: fromInstantToLocalInput(endRaw),
    };

    return (
        <CheckInWizardView
            reservationId={reservationId!}
            initialData={initialData}
            colors={colors}
            onComplete={handleComplete}
        />
    );
};
