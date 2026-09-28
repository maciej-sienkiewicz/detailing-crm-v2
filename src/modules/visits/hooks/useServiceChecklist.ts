// src/modules/visits/hooks/useServiceChecklist.ts
//
// Odhaczanie wykonanych usług na widoku wizyty (Ustawienia → Tablety, telefon, kontakty).
//
// Odhaczenie pokazuje się od razu, zanim odpowie serwer: na tablecie na hali ktoś stuka
// w usługę rękawiczką i odchodzi do auta - czekanie na odpowiedź wyglądałoby jak brak
// reakcji i kończyło się drugim stuknięciem, czyli odznaczeniem. Błąd cofa znak
// i mówi o tym wprost.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { useVisitViewConfig } from '@/modules/settings/hooks/useCompany';
import { serviceChecksApi, type ServiceCheck } from '../api/serviceChecksApi';
import type { VisitStatus } from '../types';

export const serviceChecksKey = (visitId: string) => ['visits', visitId, 'service-checks'] as const;

/** Odhacza się pracę w toku; wizyta zakończona albo odrzucona pokazuje listę bez pól. */
const CHECKABLE: ReadonlySet<VisitStatus> = new Set<VisitStatus>(['IN_PROGRESS', 'READY_FOR_PICKUP']);

export interface ServiceChecklist {
    /** Czy pokazywać pola do odhaczania przy usługach. */
    enabled: boolean;
    checkOf: (serviceItemId: string) => ServiceCheck | undefined;
    toggle: (serviceItemId: string, done: boolean) => void;
}

export function useServiceChecklist(visitId: string | undefined, visitStatus: VisitStatus | undefined): ServiceChecklist {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    const { config } = useVisitViewConfig(!!visitId);
    const enabled = !!visitId && config?.serviceChecklistEnabled === true && !!visitStatus && CHECKABLE.has(visitStatus);

    const { data: checks } = useQuery({
        queryKey: serviceChecksKey(visitId ?? ''),
        queryFn: () => serviceChecksApi.list(visitId as string),
        enabled,
    });

    const mutation = useMutation({
        mutationFn: ({ serviceItemId, done }: { serviceItemId: string; done: boolean }) =>
            serviceChecksApi.set(visitId as string, serviceItemId, done),
        onMutate: async ({ serviceItemId, done }) => {
            const key = serviceChecksKey(visitId as string);
            await queryClient.cancelQueries({ queryKey: key });
            const previous = queryClient.getQueryData<ServiceCheck[]>(key);
            queryClient.setQueryData<ServiceCheck[]>(key, (current = []) => {
                const rest = current.filter(c => c.serviceItemId !== serviceItemId);
                // Kto i kiedy - uzupełni odpowiedź serwera; do tego czasu wystarczy znak.
                return done ? [...rest, { serviceItemId, checkedAt: new Date().toISOString(), checkedByName: null }] : rest;
            });
            return { previous };
        },
        onError: (_error, _vars, context) => {
            queryClient.setQueryData(serviceChecksKey(visitId as string), context?.previous);
            showError('Nie udało się zapisać odhaczenia', 'Znak wrócił do poprzedniego stanu. Spróbuj jeszcze raz.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: serviceChecksKey(visitId as string) });
            // Odhaczenie ląduje w historii wizyty - otwarta historia ma je pokazać bez odświeżania.
            queryClient.invalidateQueries({ queryKey: ['activity', 'entity-feed'] });
        },
    });

    return {
        enabled,
        checkOf: serviceItemId => checks?.find(c => c.serviceItemId === serviceItemId),
        toggle: (serviceItemId, done) => mutation.mutate({ serviceItemId, done }),
    };
}
