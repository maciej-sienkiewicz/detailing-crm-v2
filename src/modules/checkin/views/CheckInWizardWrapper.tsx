import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { CheckInWizardView } from './CheckInWizardView';
import { t } from '@/common/i18n';
import { pickInitialColorId } from '@/modules/appointment-colors';
import { appointmentApi } from '@/modules/appointments';
import { customerDetailApi } from '@/modules/customers/api/customerDetailApi';
import { vehicleApi } from '@/modules/vehicles/api/vehicleApi';
import { fromInstantToLocalInput } from '@/common/dateTime';
import { toCheckInServiceLine } from '../utils/toCheckInServiceLine';
import { checkinErrorMessage, LOAD_ERROR_TEXTS } from '../utils/checkinErrorMessage';
import { CheckInLoadError } from '../components/CheckInLoadError';
import type { ServiceLineItem } from '../types';

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
        vin?: string;
    } | null;
    services: ServiceLineItem[];
    status: string;
    appointmentColor?: {
        id: string;
        name: string;
        hexColor: string;
    };
    doorToDoor?: {
        pickupCity: string;
        pickupStreet: string;
        deliveryCity: string;
        deliveryStreet: string;
        notes?: string;
    };
}


export const CheckInWizardWrapper = () => {
    const { reservationId } = useParams<{ reservationId: string }>();
    const navigate = useNavigate();

    const {
        data: reservationData,
        isLoading,
        error: reservationError,
        refetch: refetchReservation,
        isFetching: isFetchingReservation,
    } = useQuery({
        queryKey: ['reservations', reservationId],
        queryFn: () => appointmentApi.getAppointment(reservationId!),
        enabled: !!reservationId,
        retry: 1,
    });

    const {
        data: colors,
        isLoading: isLoadingColors,
        error: colorsError,
        refetch: refetchColors,
        isFetching: isFetchingColors,
    } = useQuery({
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

    // Pobierz pełne dane pojazdu (z licensePlate, color, paintType, etc.)
    const vehicleId = reservationData?.vehicleId;
    const { data: vehicleDetailData, isLoading: isLoadingVehicleDetail } = useQuery({
        queryKey: ['vehicleDetail', vehicleId],
        queryFn: () => vehicleApi.getVehicleDetail(vehicleId!),
        enabled: !!vehicleId,
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
        // Użyj pełnych danych pojazdu z vehicleDetailData jeśli są dostępne
        vehicle: vehicleDetailData?.vehicle ? {
            id: vehicleDetailData.vehicle.id,
            brand: vehicleDetailData.vehicle.brand,
            model: vehicleDetailData.vehicle.model,
            yearOfProduction: vehicleDetailData.vehicle.yearOfProduction,
            licensePlate: vehicleDetailData.vehicle.licensePlate,
            color: vehicleDetailData.vehicle.color,
            vin: vehicleDetailData.vehicle.vin ?? undefined,
        } : (reservationData.vehicle ? {
            id: reservationData.vehicleId,
            brand: reservationData.vehicle.brand,
            model: reservationData.vehicle.model,
            yearOfProduction: reservationData.vehicle.year,
            licensePlate: reservationData.vehicle.licensePlate,
            color: reservationData.vehicle.color,
        } : null),
        // Mapowanie stoi w osobnej, testowanej funkcji, bo przenosi DOKŁADNE BRUTTO
        // przez granicę API - a to ta jedna wartość, której zgubienie rozjeżdża
        // cenę o grosz w całym dalszym check-inie (patrz CLAUDE.md).
        services: reservationData.services?.map(toCheckInServiceLine) || [],
        status: reservationData.status,
        appointmentColor: reservationData.appointmentColor,
        doorToDoor: reservationData.doorToDoor,
    } : undefined;

    const handleComplete = (visitId: string) => {
        navigate(`/visits/${visitId}`);
    };

    if (isLoading || isLoadingColors || isLoadingCustomerDetail || isLoadingVehicleDetail) {
        return (
            <LoadingContainer>
                <Spinner />
                <LoadingText>{t.common.loading}</LoadingText>
            </LoadingContainer>
        );
    }

    /*
     * Rezerwacja i kolory to dwa różne błędy z dwoma różnymi ponowieniami. Dawniej oba
     * kończyły się tym samym „Nie znaleziono rezerwacji" - także gdy rezerwacja wczytała
     * się dobrze, a zawiodła tylko lista kolorów - i ekranem bez żadnego przycisku.
     * Rozstrzyga brak danych, nie sam błąd: nieudane odświeżenie w tle zostawia dane z cache.
     */
    if (!reservation) {
        return reservationError ? (
            <CheckInLoadError
                title={t.checkin.errors.loadReservationFailed}
                message={checkinErrorMessage(reservationError, LOAD_ERROR_TEXTS)}
                onRetry={() => { void refetchReservation(); }}
                isRetrying={isFetchingReservation}
            />
        ) : (
            <CheckInLoadError
                title="Nie znaleziono rezerwacji"
                message="Rezerwacja mogła zostać usunięta albo link jest nieaktualny. Wybierz ją jeszcze raz w kalendarzu."
            />
        );
    }

    if (!colors) {
        return (
            <CheckInLoadError
                title="Nie udało się wczytać kolorów wizyt"
                message={`Kolor wizyty jest wymagany, więc bez tej listy nie da się zacząć przyjęcia. ${checkinErrorMessage(colorsError, LOAD_ERROR_TEXTS)}`}
                onRetry={() => { void refetchColors(); }}
                isRetrying={isFetchingColors}
            />
        );
    }

    if (reservation.status !== 'CREATED' && reservation.status !== 'SCHEDULED' && reservation.status !== 'CANCELLED') {
        return (
            <CheckInLoadError
                tone="warning"
                title="Tej rezerwacji nie można przyjąć"
                message="Przyjąć można tylko rezerwację potwierdzoną albo zaplanowaną."
            />
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
    const originalStartRaw = (reservationData as any)?.schedule?.startDateTime || (reservationData as any)?.startDateTime || nowIso;
    const originalEndRaw = (reservationData as any)?.schedule?.endDateTime || (reservationData as any)?.endDateTime || '';

    /*
     * Data rozpoczęcia ZAWSZE startuje z bieżącej chwili - wizyta zaczyna się,
     * kiedy klient stoi w drzwiach, nie kiedy była zaplanowana. Wcześniej
     * rezerwacja z dzisiejszą datą trzymała zaplanowaną godzinę (przyjęcie
     * o 11:30 rezerwacji z 9:00 wpisywało 9:00), a bieżący czas dostawały
     * tylko rezerwacje z innego dnia.
     *
     * Data zakończenia: planowany koniec zostaje, dopóki jest jeszcze przed
     * nami (dzisiejsza rezerwacja przyjęta z opóźnieniem trzyma umówioną
     * godzinę odbioru); miniony koniec liczony jest od nowa z czasu trwania
     * rezerwacji, z zaokrągleniem do południa jak dotychczas.
     */
    const now = new Date();
    const startRaw: string = nowIso;
    let endRaw: string;

    const originalEndDate = originalEndRaw ? new Date(originalEndRaw) : null;
    if (originalEndDate && !isNaN(originalEndDate.getTime()) && originalEndDate > now) {
        endRaw = originalEndRaw;
    } else {
        // Oblicz czas trwania rezerwacji (w milisekundach)
        let durationMs = 60 * 60 * 1000; // Domyślnie 1 godzina
        if (originalStartRaw && originalEndRaw) {
            try {
                const startDate = new Date(originalStartRaw);
                const endDate = new Date(originalEndRaw);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    durationMs = endDate.getTime() - startDate.getTime();
                }
            } catch {
                // Zachowaj domyślny czas trwania
            }
        }

        // Oblicz datę zakończenia na podstawie czasu trwania
        endRaw = (() => {
            try {
                const startDate = new Date(startRaw);
                if (isNaN(startDate.getTime())) return '';
                const endDate = new Date(startDate.getTime() + durationMs);

                // Zaokrąglij do najbliższego następnego południa (12:00)
                const hours = endDate.getHours();
                const minutes = endDate.getMinutes();

                // Jeśli jest przed południem (< 12:00) lub dokładnie w południe, ustaw na 12:00 tego dnia
                // Jeśli jest po południu (>= 12:00), ustaw na 12:00 następnego dnia
                if (hours < 12 || (hours === 12 && minutes === 0)) {
                    endDate.setHours(12, 0, 0, 0);
                } else {
                    endDate.setDate(endDate.getDate() + 1);
                    endDate.setHours(12, 0, 0, 0);
                }

                return endDate.toISOString();
            } catch {
                return '';
            }
        })();
    }

    const initialData = {
        title: (reservationData as any)?.appointmentTitle || '',
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
            vin: reservation.vehicle.vin,
        } : null,
        isNewVehicle: false, // Dane z rezerwacji - pojazd już istnieje
        homeAddress: reservation.customer?.homeAddress || null,
        company: reservation.customer?.company || null,
        services: reservation.services,
        // Rezerwacja zwykle ma już kolor; jeśli nie, wchodzi domyślny studia zamiast
        // pustego pola, którego wizard i tak wymaga.
        appointmentColorId: pickInitialColorId(colors, reservation.appointmentColor?.id),
        technicalState: {
            inspectionNotes: (reservationData as any)?.note || '',
        },
        visitStartAt: fromInstantToLocalInput(startRaw),
        visitEndAt: fromInstantToLocalInput(endRaw),
        doorToDoor: reservation.doorToDoor ? {
            enabled: true,
            pickupAddress: { city: reservation.doorToDoor.pickupCity, street: reservation.doorToDoor.pickupStreet },
            deliveryAddress: { city: reservation.doorToDoor.deliveryCity, street: reservation.doorToDoor.deliveryStreet },
            notes: reservation.doorToDoor.notes ?? '',
        } : undefined,
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
