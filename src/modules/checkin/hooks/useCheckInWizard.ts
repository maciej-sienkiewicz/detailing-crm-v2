import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../api/checkinApi';
import { DASHBOARD_STATS_KEY } from '@/modules/dashboard/hooks/useDashboard';
import { toApiServiceLineItem } from '@/common/utils/priceAdjustment';
import { normalizeVehicleKind } from '@/modules/vehicles/vehicleKind';
import { defaultSchematicForKind } from '../utils/vehicleSchematics';
import type {
    CheckInFormData,
    CheckInInitialData,
    CheckInStep,
    CreateVisitFromReservationResponse,
    ReservationToVisitPayload,
    ReviseDraftPayload,
    WalkInVisitPayload,
} from '../types';

const DRAFT_STORAGE_KEY = 'checkin_draft';

export const useCheckInWizard = (reservationId: string | undefined, initialData: CheckInInitialData, qrCheckinId?: string) => {
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState<CheckInStep>('verification');
    const [completedSteps, setCompletedSteps] = useState<CheckInStep[]>([]);
    const [formData, setFormData] = useState<CheckInFormData>({
        title: initialData.title || '',
        customerData: {
            id: '',
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            ...initialData.customerData,
        },
        hasFullCustomerData: initialData.hasFullCustomerData ?? true,
        isNewCustomer: initialData.isNewCustomer ?? false,
        vehicleData: initialData.vehicleData || null,
        isNewVehicle: initialData.isNewVehicle ?? false,
        vehicleOwnershipAction: initialData.vehicleOwnershipAction ?? null,
        vehicleHandoff: initialData.vehicleHandoff || {
            isHandedOffByOtherPerson: false,
            contactPerson: {
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
            },
        },
        homeAddress: initialData.homeAddress || null,
        company: initialData.company || null,
        technicalState: {
            mileage: 0,
            deposit: {
                keys: true,
                registrationDocument: false,
                other: false,
            },
            inspectionNotes: '',
            protocolNotes: '',
            ...initialData.technicalState,
        },
        visitStartAt: initialData.visitStartAt,
        visitEndAt: initialData.visitEndAt,
        photos: [],
        damagePoints: initialData.damagePoints || [],
        damageVehicleType: initialData.damageVehicleType,
        services: initialData.services || [],
        appointmentColorId: initialData.appointmentColorId || '',
        doorToDoor: initialData.doorToDoor,
    });

    const steps: Array<{ id: CheckInStep; label: string }> = [
        { id: 'verification', label: 'Klient, auto i usługi' },
        { id: 'photos', label: 'Zdjęcia i uszkodzenia' },
    ];

    // Szkic przyjęcia w localStorage już nie powstaje - funkcji zapisu nic nie wołało, a
    // odczyt wczytywał do NOWEGO przyjęcia dane klienta i auta z dawnego szkicu. Taki
    // szkic mógł zostać w przeglądarce sprzed zmiany: sprzątamy go, zamiast go wczytywać.
    useEffect(() => {
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${reservationId ?? 'walkin'}`);
    }, [reservationId]);

    const createVisitMutation = useMutation({
        mutationFn: (payload: ReservationToVisitPayload) =>
            checkinApi.createVisitFromReservation(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
        },
    });

    const createWalkInMutation = useMutation({
        mutationFn: (payload: WalkInVisitPayload) =>
            checkinApi.createWalkInVisit(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY });
        },
    });

    const updateFormData = (updates: Partial<CheckInFormData>) => {
        setFormData(prev => {
            const newData = { ...prev, ...updates };
            return newData;
        });
    };

    const nextStep = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex < steps.length - 1) {
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps(prev => [...prev, currentStep]);
            }
            setCurrentStep(steps[currentIndex + 1].id);
        }
    };

    const previousStep = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1].id);
        }
    };

    const goToStep = (stepId: CheckInStep) => {
        setCurrentStep(stepId);
    };

    /**
     * Usługi w kształcie API: tymczasowe identyfikatory (usługa spoza katalogu) jako null,
     * cena ręczna zwinięta do SET_NET, dokładne brutto przechodzi dalej (CLAUDE.md §1).
     */
    const apiServices = () => formData.services.map(service => {
        const isTemporary = !service.serviceId ||
                            service.serviceId.startsWith('temp_') ||
                            service.serviceId === 'null';
        return toApiServiceLineItem({
            ...service,
            serviceId: isTemporary ? null : service.serviceId,
        });
    });

    /** Ponowny zapis po „Wróć do formularza": cały poprawiony formularz dla istniejącego szkicu. */
    const reviseDraftMutation = useMutation({
        mutationFn: ({ visitId, payload }: { visitId: string; payload: ReviseDraftPayload }) =>
            checkinApi.reviseDraft(visitId, payload),
    });

    /**
     * Klient i pojazd, które to przyjęcie samo założyło (tryb NEW). Formularz dalej
     * pokazuje je jako „nowe", więc poprawka szkicu wysłałaby NEW jeszcze raz i serwer
     * założyłby drugi rekord - zamiast tego poprawia ten założony (UPDATE).
     */
    const [createdRecords, setCreatedRecords] = useState<{ customerId?: string; vehicleId?: string }>({});

    const rememberCreatedRecords = (payload: WalkInVisitPayload, result: CreateVisitFromReservationResponse) => {
        setCreatedRecords(prev => ({
            customerId: payload.customer?.mode === 'NEW' ? result.customerId ?? prev.customerId : prev.customerId,
            vehicleId: payload.vehicle.mode === 'NEW' ? result.vehicleId ?? prev.vehicleId : prev.vehicleId,
        }));
    };

    /** Formularz w kształcie API - ten sam przy zakładaniu szkicu i przy jego poprawce. */
    const buildVisitPayload = async (): Promise<WalkInVisitPayload> => {
        // Walidacja - musi być pojazd
        if (!formData.vehicleData) {
            throw new Error('Pojazd jest wymagany do utworzenia wizyty');
        }

        // Konwersja lokalnych wartości wejściowych na Instant dla backendu
        let startInstant: string | undefined;
        let endInstant: string | undefined;
        try {
            if (formData.visitStartAt) {
                const { toInstant } = await import('@/common/dateTime');
                startInstant = toInstant(formData.visitStartAt);
            }
            if (formData.visitEndAt) {
                const { toInstant } = await import('@/common/dateTime');
                endInstant = toInstant(formData.visitEndAt);
            }
        } catch {
            // TODO: handled error silently
        }

        const customerData = {
            firstName: formData.customerData.firstName,
            lastName: formData.customerData.lastName,
            phone: formData.customerData.phone,
            email: formData.customerData.email,
            homeAddress: formData.homeAddress || undefined,
            company: formData.company || undefined,
        };

        // Build unified Customer/Vehicle Identity (EXISTING/NEW/UPDATE)
        const customerIdentity = (() => {
            const hasId = !!formData.customerData.id;
            if (formData.isNewCustomer || !hasId) {
                if (createdRecords.customerId) {
                    return { mode: 'UPDATE' as const, id: createdRecords.customerId, updateData: customerData };
                }
                return { mode: 'NEW' as const, newData: customerData };
            }
            // Existing customer, send UPDATE so server can recognize changes
            return { mode: 'UPDATE' as const, id: formData.customerData.id, updateData: customerData };
        })();

        const vehicleUpdateData = {
            // Tylko znany rodzaj: pominięty serwer zostawia bez zmian, a zgadnięty
            // „samochód" przestawiłby motocykl, o którym formularz nic nie wiedział.
            ...(formData.vehicleData!.kind ? { kind: formData.vehicleData!.kind } : {}),
            brand: formData.vehicleData!.brand,
            model: formData.vehicleData!.model,
            yearOfProduction: formData.vehicleData!.yearOfProduction,
            licensePlate: formData.vehicleData!.licensePlate || undefined,
            vin: formData.vehicleData!.vin,
            color: formData.vehicleData!.color,
        };

        const vehicleIdentity = (() => {
            const hasId = !!formData.vehicleData?.id;
            if (formData.isNewVehicle || !hasId) {
                if (createdRecords.vehicleId) {
                    return { mode: 'UPDATE' as const, id: createdRecords.vehicleId, updateData: vehicleUpdateData };
                }
                return {
                    mode: 'NEW' as const,
                    newData: {
                        // Nowy pojazd zawsze dostaje rodzaj: brak w formularzu to samochód.
                        kind: normalizeVehicleKind(formData.vehicleData!.kind),
                        brand: formData.vehicleData!.brand,
                        model: formData.vehicleData!.model,
                        yearOfProduction: formData.vehicleData!.yearOfProduction,
                        licensePlate: formData.vehicleData!.licensePlate || undefined,
                        vin: formData.vehicleData!.vin,
                        color: formData.vehicleData!.color,
                    },
                };
            }
            return {
                mode: 'UPDATE' as const,
                id: formData.vehicleData!.id,
                // Only sent when the operator swapped the visit's customer and kept the car;
                // omitted otherwise so the server leaves the vehicle's owners untouched.
                ownership: formData.vehicleOwnershipAction ?? undefined,
                updateData: vehicleUpdateData,
            };
        })();

        const transformedServices = apiServices();

        return {
            title: formData.title || undefined,
            startDateTime: startInstant,
            endDateTime: endInstant,
            customer: customerIdentity,
            vehicle: vehicleIdentity,
            vehicleHandoff: formData.vehicleHandoff.isHandedOffByOtherPerson ? {
                contactPerson: {
                    firstName: formData.vehicleHandoff.contactPerson.firstName,
                    lastName: formData.vehicleHandoff.contactPerson.lastName,
                    phone: formData.vehicleHandoff.contactPerson.phone,
                    email: formData.vehicleHandoff.contactPerson.email,
                },
            } : undefined,
            technicalState: formData.technicalState,
            photoIds: formData.photos.map(p => p.id),
            damagePoints: formData.damagePoints || [],
            /*
             * Schemat, który pracownik WIDZIAŁ: bez ręcznego wyboru to domyślny dla rodzaju
             * pojazdu (motocykl - motocykl). Puste pole kazało serwerowi brać ogólny
             * szablon, więc raport PDF rysował punkty z motocykla na sedanie.
             */
            damageVehicleType: formData.damageVehicleType ?? defaultSchematicForKind(formData.vehicleData.kind),
            services: transformedServices,
            appointmentColorId: formData.appointmentColorId,
            doorToDoor: formData.doorToDoor?.enabled ? {
                pickupCity: formData.doorToDoor.pickupAddress.city,
                pickupStreet: formData.doorToDoor.pickupAddress.street,
                deliveryCity: formData.doorToDoor.deliveryAddress.city,
                deliveryStreet: formData.doorToDoor.deliveryAddress.street,
                notes: formData.doorToDoor.notes || undefined,
            } : undefined,
            qrCheckinId,
        };
    };

    const submitCheckIn = async () => {
        const visitPayload = await buildVisitPayload();
        // Przyjęcie z rezerwacji: telefon wysyła zdjęcia pod id rezerwacji, osobnego id walk-inu nie ma.
        const result = reservationId
            ? await createVisitMutation.mutateAsync({ ...visitPayload, qrCheckinId: undefined, reservationId } satisfies ReservationToVisitPayload)
            : await createWalkInMutation.mutateAsync(visitPayload);
        rememberCreatedRecords(visitPayload, result);
        return result;
    };

    /** Zapis poprawionego formularza do szkicu - dokumenty przyjęcia powstają od nowa. */
    const reviseDraft = async (visitId: string) => {
        const payload = await buildVisitPayload();
        const result = await reviseDraftMutation.mutateAsync({ visitId, payload });
        rememberCreatedRecords(payload, result);
        return result;
    };

    const isSubmitting = createVisitMutation.isPending || createWalkInMutation.isPending
        || reviseDraftMutation.isPending;
    const submitError = createVisitMutation.error ?? createWalkInMutation.error ?? reviseDraftMutation.error;

    return {
        currentStep,
        completedSteps,
        formData,
        steps,
        updateFormData,
        nextStep,
        previousStep,
        goToStep,
        submitCheckIn,
        reviseDraft,
        isSubmitting,
        submitError,
    };
};