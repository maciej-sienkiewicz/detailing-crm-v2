import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { visitDamageMapQueryKey, visitDetailQueryKey } from './index';
import { useToast } from '@/common/components/Toast';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';
import {
    companyForPrint,
    printServicesList,
    servicesListPrintData,
} from '../utils/servicesListPrint';

/**
 * „Drukuj wykaz" z dowolnego miejsca (karta wizyty, podgląd w kalendarzu).
 *
 * Dociąga szczegóły wizyty i mapę uszkodzeń - kalendarz zna tylko nazwy usług,
 * a mapy nie ma w odpowiedzi wizyty. Mapa jest dodatkiem: gdy jej pobranie się nie
 * uda, wykaz i tak się drukuje, ale pracownik dostaje wyraźne ostrzeżenie, że
 * kartka jest bez mapy - nie może to zniknąć po cichu.
 */
export const usePrintServicesList = () => {
    const queryClient = useQueryClient();
    const { company } = useCompanySettings();
    const { showError, showWarning } = useToast();
    const [isPrinting, setIsPrinting] = useState(false);

    const print = async (visitId: string) => {
        if (!visitId || isPrinting) return;
        setIsPrinting(true);
        try {
            const [detail, damageMap] = await Promise.all([
                queryClient.fetchQuery({
                    queryKey: visitDetailQueryKey(visitId),
                    queryFn: () => visitApi.getVisitDetail(visitId),
                    staleTime: 30_000,
                }),
                queryClient.fetchQuery({
                    queryKey: visitDamageMapQueryKey(visitId),
                    queryFn: () => visitApi.getDamageMap(visitId),
                    staleTime: 30_000,
                }).catch(() => undefined),
            ]);
            if (damageMap === undefined) {
                showWarning('Wykaz bez mapy uszkodzeń', 'Nie udało się pobrać mapy uszkodzeń - wydruk jej nie zawiera.');
            }
            printServicesList(servicesListPrintData(
                detail.visit,
                companyForPrint(company),
                damageMap ?? null,
                path => new URL(path, window.location.href).href,
            ));
        } catch {
            showError('Nie udało się przygotować wydruku', 'Spróbuj ponownie za chwilę.');
        } finally {
            setIsPrinting(false);
        }
    };

    return { print, isPrinting };
};
