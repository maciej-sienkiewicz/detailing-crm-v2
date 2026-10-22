// src/modules/checkin/views/WalkInCheckInWrapper.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { CheckInWizardView } from './CheckInWizardView';
import { t } from '@/common/i18n';
import { appointmentColorsQuery, pickInitialColorId } from '@/modules/appointment-colors';
import { fromInstantToLocalInput } from '@/common/dateTime';
import type { VehicleKind } from '@/modules/vehicles/vehicleKind';

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

interface LocationState {
    prefillCustomer?: {
        id: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    prefillVehicle?: {
        id: string;
        /** Rodzaj z karty pojazdu; brak (starsze wejście) - samochód. */
        kind?: VehicleKind;
        brand: string;
        model: string;
        yearOfProduction?: number;
        licensePlate?: string;
        color?: string;
        vin?: string;
    };
}

export const WalkInCheckInWrapper = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const qrSessionId = useMemo(() => crypto.randomUUID(), []);
    // Chwila wejścia w przyjęcie, raz - render ma być czysty, a domyślny termin wizyty
    // (teraz + 1 h) nie powinien się przesuwać przy każdym odświeżeniu widoku.
    const [openedAt] = useState(() => Date.now());
    const state = location.state as LocationState | null;
    const prefillCustomer = state?.prefillCustomer;
    const prefillVehicle  = state?.prefillVehicle;

    const { data: colors, isLoading: isLoadingColors } = useQuery(appointmentColorsQuery());

    const handleComplete = (visitId: string) => {
        navigate(`/visits/${visitId}`);
    };

    if (isLoadingColors) {
        return (
            <LoadingContainer>
                <Spinner />
                <LoadingText>{t.common.loading}</LoadingText>
            </LoadingContainer>
        );
    }

    const nowIso = new Date(openedAt).toISOString();
    const endIso = new Date(openedAt + 60 * 60 * 1000).toISOString();

    const initialData = {
        title: '',
        customerData: prefillCustomer ?? {
            id: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
        },
        hasFullCustomerData: !!prefillCustomer,
        isNewCustomer: !prefillCustomer,
        vehicleData: prefillVehicle ?? null,
        isNewVehicle: !prefillVehicle,
        homeAddress: null,
        company: null,
        services: [],
        // Kolor jest polem wymaganym, więc puste pole to zawsze robota do zrobienia:
        // zaczynamy od koloru domyślnego studia.
        appointmentColorId: pickInitialColorId(colors ?? []),
        technicalState: {
            inspectionNotes: '',
        },
        visitStartAt: fromInstantToLocalInput(nowIso),
        visitEndAt: fromInstantToLocalInput(endIso),
    };

    return (
        <CheckInWizardView
            reservationId={undefined}
            qrSessionId={qrSessionId}
            initialData={initialData}
            colors={colors ?? []}
            onComplete={handleComplete}
        />
    );
};
