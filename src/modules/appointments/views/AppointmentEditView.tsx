// src/modules/appointments/views/AppointmentEditView.tsx

import styled from 'styled-components';
import { PageContainer } from '@/common/components/PageContainer';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { appointmentApi } from '../api/appointmentApi';
import { appointmentDetailQuery } from '../api/appointmentDetailQuery';
import { invalidateLead, leadKeys } from '@/modules/comms/api/leadKeys';
import { appointmentColorsQuery } from '@/modules/appointment-colors';
import { LoadingSkeleton } from '@/modules/appointments/components/common';
import { VerificationStep } from '@/modules/checkin/components/VerificationStep';
import type { CheckInFormData, ServiceLineItem as CheckInServiceLineItem } from '@/modules/checkin/types';
import type { AppointmentCreateRequest } from '@/modules/appointments/types';
import type { DoorToDoorInfo } from '@/modules/visits/types';
import { StickyFormFooter, FooterPrimaryButton, FooterSecondaryButton } from '@/common/components/StickyFormFooter';
import { t } from '@/common/i18n';
import { fromInstantToLocalInput } from '@/common/dateTime';
import { buildAppointmentEditPayload } from '../utils/buildAppointmentEditPayload';
import { validateAppointmentEdit } from '../utils/validateAppointmentEdit';
import { toEditServiceLine } from '../utils/toEditServiceLine';
import { SmsReminderEditSection } from '../components/SmsReminderEditSection';
import { RecurrenceEditScopeModal } from '../components/RecurrenceEditScopeModal';
import { RescheduleSmsChoice } from '../components/RescheduleSmsChoice';
import { useRescheduleSms } from '../hooks/useRescheduleSms';
import type { AppointmentSmsInfo, RecurrenceInfo, SeriesEditScope } from '../types';
import {
    changedSeriesFields,
    customerRecordEdited,
    detectIdentitySwap,
    seriesResultToast,
} from '../utils/seriesEditSummary';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { EmptyState } from '@/common/components/EmptyState';
import { Button } from '@/common/components/ui';
import { useCanEditAppointment } from '../hooks/useCanEditAppointment';
import { normalizeVehicleKind } from '@/modules/vehicles/vehicleKind';
import { problemDetail } from '@/core/problem';

const SmsSeparator = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 8px 0;
`;

const RecurrenceBanner = styled.div<{ $detached?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: ${p => p.$detached ? 'rgba(234, 179, 8, 0.07)' : 'rgba(3, 105, 161, 0.07)'};
    border: 1px solid ${p => p.$detached ? 'rgba(234, 179, 8, 0.3)' : 'rgba(3, 105, 161, 0.25)'};
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: ${p => p.$detached ? '#92400E' : '#075985'};
    line-height: 1.5;
`;

const DetachedBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(234, 179, 8, 0.12);
    color: #92400E;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
`;

// Pełnoekranowe tło. Szerokość, gutter i górny odstęp dostarcza ContentWrapper
// (PageContainer); tu zostaje tylko tło.
const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
`;

// Górny odstęp jest wspólny (z PageContainer), a od dołu zostawiamy duży zapas
// pod przyklejoną stopkę (StickyFooter) - więcej na mobile, bo przyciski są tam
// pełnej szerokości, jeden nad drugim.
const ContentWrapper = styled(PageContainer)`
    padding-block-end: 140px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding-block-end: 120px;
    }
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


// Adres z odczytu rezerwacji (pola mogą być puste albo null) -> pola formularza.
// Brak adresu zostaje null: formularz pokazuje wtedy puste pola, a zapis nic nie rusza.
type ApiAddress = { street?: string | null; city?: string | null; postalCode?: string | null; country?: string | null };
const toFormAddress = (address: ApiAddress | null | undefined): CheckInFormData['homeAddress'] =>
    address
        ? {
            street: address.street || '',
            city: address.city || '',
            postalCode: address.postalCode || '',
            country: address.country || 'Polska',
        }
        : null;

/**
 * Edycja rezerwacji tylko z danymi osobowymi - patrz useCanEditAppointment. Bez nich
 * formularz nie rusza nawet odczytu: wypełniłby się gwiazdkami, a zapis nadpisałby
 * nimi klienta. Wejście wprost z adresu dostaje czytelną odmowę zamiast takiego formularza.
 */
export const AppointmentEditView = () => {
    const canEdit = useCanEditAppointment();
    const navigate = useNavigate();
    if (!canEdit) {
        return (
            <Container>
                <ContentWrapper>
                    <EmptyState
                        icon="🔒"
                        title="Nie możesz edytować tej rezerwacji"
                        description="Edycja rezerwacji wymaga dostępu do danych osobowych klienta. Poproś właściciela studia o to uprawnienie."
                    >
                        <NoAccessActions>
                            <Button variant="outline" onClick={() => navigate('/calendar')}>Wróć do kalendarza</Button>
                        </NoAccessActions>
                    </EmptyState>
                </ContentWrapper>
            </Container>
        );
    }
    return <AppointmentEditForm />;
};

const NoAccessActions = styled.div`
    display: flex;
    justify-content: center;
    margin-top: ${props => props.theme.spacing.lg};
`;

const AppointmentEditForm = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { showSuccess, showInfo, showError } = useToast();

    const { data: appointment, isLoading: isLoadingAppointment, isError } = useQuery({
        ...appointmentDetailQuery(appointmentId ?? ''),
        enabled: !!appointmentId,
    });

    const { data: colors, isLoading: isLoadingColors } = useQuery(appointmentColorsQuery());

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
                    // Rodzaj z rezerwacji: bez niego formularz pokazałby motocykl jako
                    // samochód, a zapis przestawiłby go w kartotece na auto.
                    kind: normalizeVehicleKind(appointment.vehicle.kind),
                    brand: appointment.vehicle.brand,
                    model: appointment.vehicle.model,
                    yearOfProduction: appointment.vehicle.year,
                    licensePlate: appointment.vehicle.licensePlate,
                    color: appointment.vehicle.color,
                }
                : null,
            isNewVehicle: false,
            // Serwer zwraca adres domowy i firmę przy odczycie jednej rezerwacji. Wcześniej
            // ich nie zwracał i okno startowało z pustymi polami - a NIP czy regon bywają
            // null, więc normalizujemy je do pól formularza zamiast przepisywać obiekt.
            homeAddress: toFormAddress(appointment.customer?.homeAddress),
            company: appointment.customer?.company?.name
                ? {
                    name: appointment.customer.company.name,
                    nip: appointment.customer.company.nip || '',
                    regon: appointment.customer.company.regon || '',
                    address: toFormAddress(appointment.customer.company.address)
                        ?? { street: '', city: '', postalCode: '', country: 'Polska' },
                }
                : null,
            // Z dokładnym bruttem: bez niego każdy zapis, nawet samej daty, odtwarzał
            // brutto z netta (1900,00 → 1900,01) - patrz toEditServiceLine.
            services: (appointment.services || []).map(toEditServiceLine),
            appointmentColorId: appointment.appointmentColor?.id || '',
            technicalState: {
                mileage: 0,
                deposit: { keys: false, registrationDocument: false, other: false },
                inspectionNotes: appointment.internalNote || appointment.note || '',
                protocolNotes: appointment.protocolNote || '',
            },
            photos: [],
            damagePoints: [],
            doorToDoor: appointment.doorToDoor
                ? (() => {
                    const d = appointment.doorToDoor;
                    const hasData = !!(d.pickupCity || d.pickupStreet || d.deliveryCity || d.deliveryStreet);
                    return {
                        enabled: hasData,
                        pickupAddress: { city: d.pickupCity || '', street: d.pickupStreet || '' },
                        deliveryAddress: { city: d.deliveryCity || '', street: d.deliveryStreet || '' },
                        notes: d.notes || '',
                    } as DoorToDoorInfo;
                })()
                : undefined,
        } as Partial<CheckInFormData>;
    }, [appointment]);

    const [formData, setFormData] = useState<CheckInFormData | null>(null);
    const initialFormDataRef = useRef<CheckInFormData | null>(null);
    /** Początek z chwili otwarcia - w stanie, nie w refie, bo czyta go render (pole SMS). */
    const [initialStart, setInitialStart] = useState<string | null>(null);


    useEffect(() => {
        if (initialData && !formData) {
            // fill defaults for required fields of CheckInFormData
            const startRaw = appointment?.schedule?.startDateTime ?? appointment?.startDateTime ?? '';
            const endRaw = appointment?.schedule?.endDateTime ?? appointment?.endDateTime ?? '';
            const snapshot: CheckInFormData = {
                title: appointment?.appointmentTitle || '',
                customerData: {
                    id: '', firstName: '', lastName: '', phone: '', email: '',
                    ...(initialData.customerData || {}),
                },
                hasFullCustomerData: initialData.hasFullCustomerData ?? false,
                isNewCustomer: initialData.isNewCustomer ?? false,
                vehicleData: initialData.vehicleData ?? null,
                isNewVehicle: initialData.isNewVehicle ?? false,
                vehicleHandoff: {
                    isHandedOffByOtherPerson: false,
                    contactPerson: {
                        firstName: '',
                        lastName: '',
                        phone: '',
                        email: '',
                    },
                },
                homeAddress: initialData.homeAddress ?? null,
                company: initialData.company ?? null,
                services: (initialData.services as CheckInServiceLineItem[]) ?? [],
                appointmentColorId: initialData.appointmentColorId ?? '',
                technicalState: initialData.technicalState || {
                    mileage: 0,
                    deposit: { keys: false, registrationDocument: false, other: false },
                    inspectionNotes: '',
                    protocolNotes: '',
                },
                photos: initialData.photos || [],
                damagePoints: initialData.damagePoints || [],
                visitStartAt: fromInstantToLocalInput(startRaw),
                visitEndAt: fromInstantToLocalInput(endRaw),
                isAllDay: appointment?.schedule?.isAllDay ?? false,
                doorToDoor: initialData.doorToDoor,
            };
            initialFormDataRef.current = snapshot;
            setInitialStart(snapshot.visitStartAt ?? null);
            setFormData(snapshot);
        }
    }, [initialData, formData, appointment]);

    // Okno „Zapisz w serii" otwiera tylko osobny przycisk. Zwykły zapis rezerwacji z serii
    // idzie bez zakresu, czyli „tylko ta" (serwer ją przy tym odłącza od serii). Dawniej
    // zwykły zapis otwierał okno wyboru zakresu, a przy zmianie terminu wysyłał THIS bez pytania.
    const [seriesModal, setSeriesModal] = useState<{ isOpen: boolean; pendingPayload: AppointmentCreateRequest | null }>(
        { isOpen: false, pendingPayload: null },
    );

    const { data: seriesImpact, isError: isSeriesImpactError } = useQuery({
        queryKey: ['appointments', appointmentId, 'series-impact'],
        queryFn: () => appointmentApi.getSeriesEditImpact(appointmentId!),
        enabled: !!appointmentId && seriesModal.isOpen,
        staleTime: 0,
    });

    const invalidateAll = () => {
        // Wszystkie rezerwacje, nie tylko ta: zapis serii zmienia też pozostałe terminy.
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['operations'] });
        // Rezerwacja z leada niesie jego wycenę - backend przepisuje jedną listę
        // usług w drugą, więc lead w pamięci podręcznej jest po tym zapisie nieaktualny.
        // Którego leada - rezerwacja nie mówi, stąd wszystkie szczegóły (bez słowników i przeglądu).
        invalidateLead(queryClient);
        queryClient.invalidateQueries({ queryKey: leadKeys.details });
    };

    // Nieudany zapis mówi, co się stało - wcześniej przycisk wracał do „Zapisz zmiany"
    // bez słowa, a zmiany wyglądały na zapisane.
    const showSaveError = (err: unknown) => {
        showError('Nie udało się zapisać rezerwacji', problemDetail(err, 'Spróbuj ponownie za chwilę.'));
    };

    const updateMutation = useMutation({
        mutationFn: (payload: AppointmentCreateRequest) => appointmentApi.updateAppointment(appointmentId!, payload, rescheduleSms.notifyCustomer),
        onError: showSaveError,
        onSuccess: () => {
            navigate('/calendar');
            if (currentRecurrenceInfo()) {
                showSuccess('Zapisano tę rezerwację', 'Pozostałe rezerwacje serii zostały bez zmian.');
            } else {
                showSuccess('Zapisano zmiany');
            }
            invalidateAll();
        },
    });

    const updateWithScopeMutation = useMutation({
        mutationFn: ({ payload, scope }: { payload: AppointmentCreateRequest; scope: SeriesEditScope }) =>
            appointmentApi.updateAppointmentWithScope(appointmentId!, payload, scope),
        onError: showSaveError,
        onSuccess: (response) => {
            navigate('/calendar');
            const toast = seriesResultToast(response?.seriesUpdate);
            showSuccess(toast.title, toast.message);
            invalidateAll();
        },
    });

    const currentRecurrenceInfo = (): RecurrenceInfo | null =>
        appointment?.recurrenceInfo ?? (location.state as any)?.recurrenceInfo ?? null;

    const isDateChanged = !!formData && !!initialFormDataRef.current && (
        formData.visitStartAt !== initialFormDataRef.current.visitStartAt
        || formData.visitEndAt !== initialFormDataRef.current.visitEndAt
    );

    // SMS o zmianie terminu idzie tylko przy przesuniętym początku - tak liczy też serwer.
    const startChanged = !!formData && initialStart !== null && formData.visitStartAt !== initialStart;
    const rescheduleSms = useRescheduleSms(startChanged);

    const handleChange = (updates: Partial<CheckInFormData>) => {
        setFormData(prev => (prev ? { ...prev, ...updates } as CheckInFormData : prev));
    };

    const handleServicesChange = (services: CheckInServiceLineItem[]) => {
        setFormData(prev => (prev ? { ...prev, services } : prev));
    };

    // Błędy pokazujemy od pierwszej próby zapisu, potem na bieżąco - jak w kalendarzu.
    const [showErrors, setShowErrors] = useState(false);
    const errors = useMemo(() => (formData ? validateAppointmentEdit(formData) : {}), [formData]);

    const buildChangedPayload = (): AppointmentCreateRequest | null => {
        if (!formData) return null;
        if (JSON.stringify(formData) === JSON.stringify(initialFormDataRef.current)) {
            showInfo('Nie wprowadzono żadnych zmian.');
            return null;
        }
        const problems = Object.values(errors);
        if (problems.length > 0) {
            setShowErrors(true);
            showError('Nie można zapisać rezerwacji', problems.length > 1
                ? `${problems[0]}. Poza tym do poprawy: ${problems.length - 1}.`
                : `${problems[0]}.`);
            return null;
        }
        return buildAppointmentEditPayload(formData);
    };

    /**
     * „Anuluj" wraca tam, skąd przyszedł użytkownik (kalendarz, lista zleceń). Wcześniej
     * prowadził pod /appointments - takiej strony nie ma, więc lądowało się na stronie
     * startowej.
     */
    const handleCancel = () => {
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate('/calendar');
    };

    /** Zapis TYLKO tej rezerwacji - także gdy należy do serii. Bez parametru `scope`. */
    const handleSave = () => {
        const payload = buildChangedPayload();
        if (!payload) return;
        updateMutation.mutate(payload);
    };

    /** Osobna, świadoma ścieżka: okno wyboru zakresu serii. Termin idzie tylko przez zwykły zapis. */
    const handleOpenSeriesSave = () => {
        if (isDateChanged) return;
        const payload = buildChangedPayload();
        if (!payload) return;
        setSeriesModal({ isOpen: true, pendingPayload: payload });
    };

    const handleSeriesConfirm = (scope: SeriesEditScope) => {
        if (!seriesModal.pendingPayload) return;
        setSeriesModal(prev => ({ ...prev, isOpen: false }));
        updateWithScopeMutation.mutate({ payload: seriesModal.pendingPayload, scope });
    };

    const isAnyMutating = updateMutation.isPending || updateWithScopeMutation.isPending;

    if (isLoadingAppointment || isLoadingColors || !formData || isError) {
        return (
            <Container>
                <ContentWrapper>
                    <Header>
                        <Title>Edytuj rezerwację</Title>
                        <Actions></Actions>
                    </Header>
                    <LoadingSkeleton />
                </ContentWrapper>
            </Container>
        );
    }

    const recurrenceInfo = currentRecurrenceInfo();
    const initialSnapshot = initialFormDataRef.current;

    return (
        <Container>
            <ContentWrapper>
                <Header>
                    <Title>Edytuj rezerwację</Title>
                </Header>

                {recurrenceInfo && (
                    <RecurrenceBanner $detached={recurrenceInfo.isDetached}>
                        <span>
                            {recurrenceInfo.isDetached
                                ? `Ta rezerwacja (${recurrenceInfo.recurrenceIndex + 1} z ${recurrenceInfo.totalInSeries}) była zmieniana osobno, więc zmiany całej serii jej nie obejmą.`
                                : `Ta rezerwacja (${recurrenceInfo.recurrenceIndex + 1} z ${recurrenceInfo.totalInSeries}) należy do serii cyklicznej.`
                            }
                            {' '}Zapis zmienia tylko ją. Inne rezerwacje serii zmienisz wyłącznie przez „Zapisz w serii”.
                            {isDateChanged && ' Nowy termin dotyczy tylko tej rezerwacji, więc zapis w serii jest teraz wyłączony.'}
                        </span>
                        {recurrenceInfo.isDetached && (
                            <DetachedBadge>✂ Odłączona</DetachedBadge>
                        )}
                    </RecurrenceBanner>
                )}

                <VerificationStep
                    formData={formData}
                    errors={showErrors ? errors : {}}
                    subject="reservation"
                    onChange={handleChange}
                    onServicesChange={handleServicesChange}
                    colors={colors || []}
                    showTechnicalSection={false}
                    hideVehicleColorAndPaint={true}
                    hideLicensePlate={true}
                    hideVehicleHandoff={true}
                    hideMileage={true}
                    initialCustomerData={initialData?.customerData}
                    initialHasFullCustomerData={initialData?.hasFullCustomerData}
                    initialIsNewCustomer={initialData?.isNewCustomer}
                    initialVehicleData={initialData?.vehicleData === undefined ? undefined : (initialData?.vehicleData ?? null)}
                    initialIsNewVehicle={initialData?.isNewVehicle}
                />

                {rescheduleSms.visible && (
                    <>
                        <SmsSeparator />
                        <RescheduleSmsChoice
                            send={rescheduleSms.send}
                            onChange={rescheduleSms.setSend}
                            newStart={formData?.visitStartAt ?? null}
                        />
                    </>
                )}

                {appointment?.smsInfo && (
                    <>
                        <SmsSeparator />
                        <SmsReminderEditSection
                            appointmentId={appointmentId!}
                            smsInfo={appointment.smsInfo as AppointmentSmsInfo}
                        />
                    </>
                )}
            </ContentWrapper>

            <StickyFormFooter
                actions={
                    <>
                        <FooterSecondaryButton onClick={handleCancel} disabled={isAnyMutating}>
                            {t.common.cancel}
                        </FooterSecondaryButton>
                        {recurrenceInfo && (
                            <FooterSecondaryButton
                                type="button"
                                onClick={handleOpenSeriesSave}
                                disabled={isAnyMutating || isDateChanged}
                                title={isDateChanged ? 'Nowy termin dotyczy tylko tej rezerwacji' : undefined}
                            >
                                Zapisz w serii…
                            </FooterSecondaryButton>
                        )}
                        <FooterPrimaryButton onClick={handleSave} disabled={isAnyMutating} $disabled={isAnyMutating}>
                            {isAnyMutating ? 'Zapisywanie…' : recurrenceInfo ? 'Zapisz tę rezerwację' : 'Zapisz zmiany'}
                        </FooterPrimaryButton>
                    </>
                }
            />

            {recurrenceInfo && (
                <RecurrenceEditScopeModal
                    isOpen={seriesModal.isOpen}
                    onClose={() => setSeriesModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={handleSeriesConfirm}
                    recurrenceInfo={recurrenceInfo}
                    impact={seriesImpact}
                    impactError={isSeriesImpactError}
                    changedFields={initialSnapshot ? changedSeriesFields(initialSnapshot, formData) : []}
                    identitySwap={initialSnapshot ? detectIdentitySwap(initialSnapshot, formData) : { customer: false, vehicle: false }}
                    customerRecordEdited={initialSnapshot ? customerRecordEdited(initialSnapshot, formData) : false}
                    isSubmitting={updateWithScopeMutation.isPending}
                />
            )}
        </Container>
    );
};
