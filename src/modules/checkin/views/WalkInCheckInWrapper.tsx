// src/modules/checkin/views/WalkInCheckInWrapper.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { CheckInWizardView } from './CheckInWizardView';
import { t } from '@/common/i18n';
import { appointmentApi } from '@/modules/appointments';
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
        brand: string;
        model: string;
        yearOfProduction?: number;
        licensePlate?: string;
        color?: string;
    };
}

export const WalkInCheckInWrapper = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;
    const prefillCustomer = state?.prefillCustomer;
    const prefillVehicle  = state?.prefillVehicle;

    const { data: colors, isLoading: isLoadingColors } = useQuery({
        queryKey: ['appointmentColors'],
        queryFn: () => appointmentApi.getAppointmentColors(),
    });

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

    const nowIso = new Date().toISOString();
    const endDate = new Date(Date.now() + 60 * 60 * 1000);
    const endIso = endDate.toISOString();

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
        appointmentColorId: '',
        technicalState: {
            inspectionNotes: '',
        },
        visitStartAt: fromInstantToLocalInput(nowIso),
        visitEndAt: fromInstantToLocalInput(endIso),
    };

    return (
        <CheckInWizardView
            reservationId={undefined}
            initialData={initialData}
            colors={colors ?? []}
            onComplete={handleComplete}
        />
    );
};
