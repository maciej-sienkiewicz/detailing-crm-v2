// src/modules/appointments/views/AppointmentCreateView.tsx
import styled from 'styled-components';
import { useAppointmentCreation } from '../hooks/useAppointmentCreation';
import { AppointmentHeader } from '../components/AppointmentHeader';
import { ReservationDetailsSection } from '../components/ReservationDetailsSection';
import { CustomerSection } from '../components/CustomerSection';
import { VehicleSection } from '../components/VehicleSection';
import { ScheduleSection } from '../components/ScheduleSection';
import { AppointmentActions } from '../components/AppointmentActions';
import { CustomerModal } from '../components/CustomerModal';
import { VehicleModal } from '../components/VehicleModal';
import { InvoiceSummary } from '../components/InvoiceSummary';
import {LoadingSkeleton} from "@/modules/appointments/components/common";

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
    max-width: 1400px;
    margin: 0 auto;
`;

const MainContent = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.lg};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 1fr;
        gap: ${props => props.theme.spacing.xxl};
    }
`;

const LeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.xl};
    }
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

export const AppointmentCreateView = () => {
    const {
        selectedCustomer,
        setSelectedCustomer,
        selectedVehicle,
        setSelectedVehicle,
        serviceItems,
        setServiceItems,
        isAllDay,
        setIsAllDay,
        startDateTime,
        setStartDateTime,
        endDateTime,
        setEndDateTime,
        appointmentTitle,
        setAppointmentTitle,
        selectedColorId,
        setSelectedColorId,
        isCustomerModalOpen,
        setIsCustomerModalOpen,
        isVehicleModalOpen,
        setIsVehicleModalOpen,
        customerVehicles,
        availableServices,
        appointmentColors,
        isLoading,
        handleSubmit,
        canSubmit,
        isSubmitting,
        submitError,
    } = useAppointmentCreation();

    if (isLoading) {
        return (
            <Container>
                <ContentWrapper>
                    <AppointmentHeader />
                    <LoadingSkeleton />
                </ContentWrapper>
            </Container>
        );
    }

    return (
        <Container>
            <ContentWrapper>
                <AppointmentHeader />

                <MainContent>
                    <LeftColumn>
                        <ScheduleSection
                            isAllDay={isAllDay}
                            onIsAllDayChange={setIsAllDay}
                            startDateTime={startDateTime}
                            onStartDateTimeChange={setStartDateTime}
                            endDateTime={endDateTime}
                            onEndDateTimeChange={setEndDateTime}
                        />

                        <CustomerSection
                            selectedCustomer={selectedCustomer}
                            onOpenModal={() => setIsCustomerModalOpen(true)}
                        />

                        <VehicleSection
                            selectedVehicle={selectedVehicle}
                            onOpenModal={() => setIsVehicleModalOpen(true)}
                        />

                        <ReservationDetailsSection
                            appointmentTitle={appointmentTitle}
                            onAppointmentTitleChange={setAppointmentTitle}
                            selectedColorId={selectedColorId}
                            onColorChange={setSelectedColorId}
                            colors={appointmentColors}
                        />
                    </LeftColumn>

                    <RightColumn>
                        <InvoiceSummary
                            services={serviceItems}
                            availableServices={availableServices}
                            onChange={setServiceItems}
                        />

                        <AppointmentActions
                            onSubmit={handleSubmit}
                            canSubmit={canSubmit}
                            isSubmitting={isSubmitting}
                            hasError={submitError}
                        />
                    </RightColumn>
                </MainContent>

                <CustomerModal
                    isOpen={isCustomerModalOpen}
                    onClose={() => setIsCustomerModalOpen(false)}
                    onSelect={setSelectedCustomer}
                />

                <VehicleModal
                    isOpen={isVehicleModalOpen}
                    vehicles={customerVehicles || []}
                    onClose={() => setIsVehicleModalOpen(false)}
                    onSelect={setSelectedVehicle}
                    allowSkip
                />
            </ContentWrapper>
        </Container>
    );
};