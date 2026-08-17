// src/modules/appointments/views/AppointmentEditView.tsx

import styled from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { appointmentApi } from '../api/appointmentApi';
import { LoadingSkeleton } from '@/modules/appointments/components/common';
import { VerificationStep } from '@/modules/checkin/components/VerificationStep';
import type { CheckInFormData, ServiceLineItem as CheckInServiceLineItem } from '@/modules/checkin/types';
import type { AppointmentCreateRequest } from '@/modules/appointments/types';
import type { DoorToDoorInfo } from '@/modules/visits/types';
import { Button } from '@/common/components/Button';
import { t } from '@/common/i18n';
import { toInstant, fromInstantToLocalInput } from '@/common/dateTime';
import { toApiServiceLineItem } from '@/common/utils/priceAdjustment';
import { SmsReminderEditSection } from '../components/SmsReminderEditSection';
import {
    CustomerCard, VehicleCard, entitySectionsReducer, hasUnresolvedSection,
    toCustomerIdentity, toVehicleIdentity,
} from '../components/entity-cards';
import type { EntityEvent, EntitySectionsState } from '../components/entity-cards';
import { RecurrenceEditScopeModal } from '../components/RecurrenceEditScopeModal';
import type { AppointmentSmsInfo, RecurrenceEditScope, RecurrenceInfo } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const SmsSeparator = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 8px 0;
`;

const EntityCardsStack = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 20px;

    /* One column on phones — cards stacked, full width. */
    @media (max-width: 720px) {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 16px;
    }
`;

const RecurrenceBanner = styled.div<{ $detached?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: ${p => p.$detached ? 'rgba(234, 179, 8, 0.07)' : 'rgba(59, 130, 246, 0.07)'};
    border: 1px solid ${p => p.$detached ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.25)'};
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: ${p => p.$detached ? '#92400E' : '#1E40AF'};
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

const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
    ${hexBackdrop}
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

const FooterActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    justify-content: flex-end;
    margin-top: ${props => props.theme.spacing.lg};
`;

export const AppointmentEditView = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { showSuccess, showInfo } = useToast();

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

    // Entity summary-card state (customer/vehicle). Selection, mutation and creation
    // are separate states — the payload mode is read off the state kind, never
    // inferred from which inputs the user happened to touch.
    const [entityState, setEntityState] = useState<EntitySectionsState | null>(null);
    const initialEntityStateRef = useRef<EntitySectionsState | null>(null);

    const dispatchEntity = useCallback((event: EntityEvent) => {
        setEntityState(prev => (prev ? entitySectionsReducer(prev, event) : prev));
    }, []);

    useEffect(() => {
        if (!appointment || entityState) return;
        const initial: EntitySectionsState = {
            customer: {
                kind: 'SELECTED',
                snapshot: {
                    id: appointment.customerId,
                    firstName: appointment.customer?.firstName || '',
                    lastName: appointment.customer?.lastName || '',
                    phone: appointment.customer?.phone || '',
                    email: appointment.customer?.email || '',
                },
            },
            vehicle: appointment.vehicle && appointment.vehicleId
                ? {
                    kind: 'SELECTED',
                    snapshot: {
                        id: appointment.vehicleId,
                        brand: appointment.vehicle.brand,
                        model: appointment.vehicle.model,
                        year: appointment.vehicle.year ?? undefined,
                        licensePlate: appointment.vehicle.licensePlate || undefined,
                    },
                }
                : { kind: 'NONE' },
        };
        initialEntityStateRef.current = initial;
        setEntityState(initial);
    }, [appointment, entityState]);

    // The vehicle card needs the resolved customer id (garage queries) and a label
    // for ownership copy ("garaż Anny Nowak").
    const resolvedCustomer = entityState
        ? (entityState.customer.kind === 'EDITING' || entityState.customer.kind === 'CHOOSING'
            ? entityState.customer.base
            : entityState.customer)
        : null;
    const resolvedCustomerId =
        resolvedCustomer && (resolvedCustomer.kind === 'SELECTED' || resolvedCustomer.kind === 'SELECTED_MODIFIED')
            ? resolvedCustomer.snapshot.id
            : null;
    const customerLabel = (() => {
        if (!resolvedCustomer) return 'klienta';
        const source = resolvedCustomer.kind === 'SELECTED'
            ? resolvedCustomer.snapshot
            : resolvedCustomer.kind === 'SELECTED_MODIFIED' || resolvedCustomer.kind === 'NEW'
                ? resolvedCustomer.draft
                : null;
        const label = source ? [source.firstName, source.lastName].filter(Boolean).join(' ') : '';
        return label || 'klienta';
    })();


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
            setFormData(snapshot);
        }
    }, [initialData, formData, appointment]);

    const [scopeModal, setScopeModal] = useState<{
        isOpen: boolean;
        pendingPayload: AppointmentCreateRequest | null;
        isDateChanged: boolean;
    }>({ isOpen: false, pendingPayload: null, isDateChanged: false });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['operations'] });
    };

    const updateMutation = useMutation({
        mutationFn: (payload: AppointmentCreateRequest) => appointmentApi.updateAppointment(appointmentId!, payload),
        onSuccess: () => {
            navigate('/calendar');
            showSuccess('Pomyślnie zapisano wprowadzone zmiany', 'Teraz możesz przejść do widoku kalendarza lub wprowadzić kolejne zmiany.');
            invalidateAll();
        },
    });

    const updateWithScopeMutation = useMutation({
        mutationFn: ({ payload, scope }: { payload: AppointmentCreateRequest; scope: RecurrenceEditScope }) =>
            appointmentApi.updateAppointmentWithScope(appointmentId!, payload, scope),
        onSuccess: () => {
            navigate('/calendar');
            showSuccess('Pomyślnie zapisano zmiany w serii', 'Zmiany zostały zastosowane do wybranych wizyt.');
            invalidateAll();
        },
    });

    const handleChange = (updates: Partial<CheckInFormData>) => {
        setFormData(prev => (prev ? { ...prev, ...updates } as CheckInFormData : prev));
    };

    const handleServicesChange = (services: CheckInServiceLineItem[]) => {
        setFormData(prev => (prev ? { ...prev, services } : prev));
    };

    // State mapping: CheckInFormData.technicalState (edited in VerificationStep) -> the
    // note fields the API actually persists. Kept as a pure function so the mapping — and
    // the bug of silently dropping it — is visible and testable on its own.
    const mapTechnicalNotesToPayload = (technicalState: CheckInFormData['technicalState']) => ({
        // Legacy single-field consumers (calendar tooltips, reminders) still read `note`.
        note: technicalState.inspectionNotes || undefined,
        internalNote: technicalState.inspectionNotes || undefined,
        protocolNote: technicalState.protocolNotes || undefined,
    });

    const buildPayload = (): AppointmentCreateRequest | null => {
        if (!formData || !entityState) return null;

        let startInstant = '';
        let endInstant = '';
        try {
            startInstant = toInstant(formData.visitStartAt || '');
            endInstant = toInstant(formData.visitEndAt || '');
        } catch {
            return null;
        }

        // Transient card states (open edit form / open picker) must be resolved first —
        // there is no defensible payload for "the user is mid-decision".
        if (hasUnresolvedSection(entityState)) {
            showInfo('Zatwierdź lub anuluj edycję w karcie klienta/pojazdu przed zapisem wizyty.');
            return null;
        }

        const companyPayload = formData.company
            ? {
                name: formData.company.name,
                nip: formData.company.nip,
                regon: formData.company.regon,
                address: `${formData.company.address.street}, ${formData.company.address.postalCode} ${formData.company.address.city}`,
            }
            : undefined;

        const customerIdentity = toCustomerIdentity(entityState.customer, companyPayload);
        const vehicleIdentity = toVehicleIdentity(entityState.vehicle);
        if (!customerIdentity || !vehicleIdentity) return null;

        const payload: AppointmentCreateRequest = {
            customer: customerIdentity,
            vehicle: vehicleIdentity,
            services: formData.services.map(toApiServiceLineItem),
            schedule: {
                isAllDay: formData.isAllDay ?? false,
                startDateTime: startInstant,
                endDateTime: endInstant,
            },
            appointmentTitle: formData.title || undefined,
            appointmentColorId: formData.appointmentColorId,
            ...mapTechnicalNotesToPayload(formData.technicalState),
            doorToDoor: formData.doorToDoor?.enabled
                ? {
                    pickupCity: formData.doorToDoor.pickupAddress.city,
                    pickupStreet: formData.doorToDoor.pickupAddress.street,
                    deliveryCity: formData.doorToDoor.deliveryAddress.city,
                    deliveryStreet: formData.doorToDoor.deliveryAddress.street,
                    notes: formData.doorToDoor.notes || undefined,
                }
                : undefined,
        };

        if (!payload.customer || !payload.appointmentColorId || payload.services.length === 0 || !formData.visitStartAt || !formData.visitEndAt) return null;

        return payload;
    };

    const handleSave = () => {
        if (!formData || !entityState) return;

        const formUnchanged = JSON.stringify(formData) === JSON.stringify(initialFormDataRef.current);
        const entitiesUnchanged = JSON.stringify(entityState) === JSON.stringify(initialEntityStateRef.current);
        if (formUnchanged && entitiesUnchanged) {
            showInfo('Nie wprowadzono żadnych zmian.');
            return;
        }

        const payload = buildPayload();
        if (!payload) return;

        const recurrenceInfo: RecurrenceInfo | null = appointment?.recurrenceInfo ?? (location.state as any)?.recurrenceInfo ?? null;

        if (recurrenceInfo) {
            const origStart = initialFormDataRef.current?.visitStartAt ?? '';
            const origEnd = initialFormDataRef.current?.visitEndAt ?? '';
            const isDateChanged = formData.visitStartAt !== origStart || formData.visitEndAt !== origEnd;

            if (isDateChanged) {
                // Date changed → force THIS scope, no dialog
                updateWithScopeMutation.mutate({ payload, scope: 'THIS' });
            } else {
                setScopeModal({ isOpen: true, pendingPayload: payload, isDateChanged: false });
            }
        } else {
            updateMutation.mutate(payload);
        }
    };

    const handleScopeConfirm = (scope: RecurrenceEditScope) => {
        if (!scopeModal.pendingPayload) return;
        setScopeModal(prev => ({ ...prev, isOpen: false }));
        updateWithScopeMutation.mutate({ payload: scopeModal.pendingPayload, scope });
    };

    const isAnyMutating = updateMutation.isPending || updateWithScopeMutation.isPending;

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

    const recurrenceInfo: RecurrenceInfo | null = appointment?.recurrenceInfo ?? (location.state as any)?.recurrenceInfo ?? null;

    return (
        <Container>
            <ContentWrapper>
                <Header>
                    <Title>{'Edytuj rezerwację'}</Title>
                </Header>

                {recurrenceInfo && (
                    <RecurrenceBanner $detached={recurrenceInfo.isDetached}>
                        <span>
                            {recurrenceInfo.isDetached
                                ? `Ta wizyta (${recurrenceInfo.recurrenceIndex + 1} z ${recurrenceInfo.totalInSeries}) była indywidualnie edytowana i nie podlega seryjnym zmianom.`
                                : `Ta wizyta (${recurrenceInfo.recurrenceIndex + 1} z ${recurrenceInfo.totalInSeries}) należy do serii cyklicznej.`
                            }
                        </span>
                        {recurrenceInfo.isDetached && (
                            <DetachedBadge>✂ Odłączona</DetachedBadge>
                        )}
                    </RecurrenceBanner>
                )}

                {entityState && (
                    <EntityCardsStack>
                        <CustomerCard state={entityState.customer} dispatch={dispatchEntity} />
                        <VehicleCard
                            state={entityState.vehicle}
                            dispatch={dispatchEntity}
                            customerId={resolvedCustomerId}
                            customerLabel={customerLabel}
                        />
                    </EntityCardsStack>
                )}

                <VerificationStep
                    formData={formData}
                    errors={{}}
                    onChange={handleChange}
                    onServicesChange={handleServicesChange}
                    colors={colors || []}
                    showTechnicalSection={false}
                    hideCustomerAndVehicleSections={true}
                    hideVehicleColorAndPaint={true}
                    hideLicensePlate={true}
                    hideVehicleHandoff={true}
                    hideMileage={true}
                />

                {appointment?.smsInfo && (
                    <>
                        <SmsSeparator />
                        <SmsReminderEditSection
                            appointmentId={appointmentId!}
                            smsInfo={appointment.smsInfo as AppointmentSmsInfo}
                        />
                    </>
                )}

                <FooterActions>
                    <Button $variant="secondary" onClick={() => navigate('/appointments')} disabled={isAnyMutating}>
                        {t.common.cancel}
                    </Button>
                    <Button $variant="primary" onClick={handleSave} disabled={isAnyMutating}>
                        {isAnyMutating ? (t.appointments?.createView?.submitting || 'Zapisywanie...') : 'Zapisz zmiany'}
                    </Button>
                </FooterActions>
            </ContentWrapper>

            {recurrenceInfo && (
                <RecurrenceEditScopeModal
                    isOpen={scopeModal.isOpen}
                    onClose={() => setScopeModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={handleScopeConfirm}
                    recurrenceInfo={recurrenceInfo}
                    isDateChanged={scopeModal.isDateChanged}
                    isSubmitting={updateWithScopeMutation.isPending}
                />
            )}
        </Container>
    );
};
