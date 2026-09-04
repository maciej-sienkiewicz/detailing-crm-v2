// src/modules/visits/hooks/useDeleteVisit.ts
//
// Usunięcie wizyty z jej WŁASNEGO widoku szczegółów.
//
// Cała trudność jest w kolejności. Klucze zapytań wizyty są prefiksowane
// (`['visit', id, ...]`), a react-query dopasowuje klucze po prefiksie - jedno
// `removeQueries` obejmuje więc szczegół, dokumenty, zdjęcia, komentarze,
// komunikację i przypomnienia SMS naraz. Wywołane, gdy widok jeszcze stoi na
// ekranie, nie kasuje ich po cichu: każdy żywy obserwator natychmiast pobiera swoje
// zapytanie od nowa, tym razem po rekord, którego już nie ma. Użytkownik dostawał
// przez to trzy dymki o błędzie („Visit not found…") po operacji, która się UDAŁA.
//
// Stąd rozdzielenie na dwa takty: najpierw wygaszenie zapytań (pusty identyfikator
// wyłącza `enabled: !!visitId` w każdym hooku wizyty), a dopiero potem - w efekcie,
// czyli po commicie i po odmontowaniu dzieci widoku - czyszczenie cache i wyjście.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { visitApi } from '../api/visitApi';
import { visitDetailQueryKey } from './index';

export const useDeleteVisit = (visitId: string) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess, showWarning } = useToast();

    const [deletedVisitId, setDeletedVisitId] = useState<string | null>(null);

    /**
     * „Usuń wizytę" kasuje wizytę w dowolnym statusie - tak samo jak ta sama akcja
     * w tabeli operacji.
     *
     * Wcześniej szło to na /cancel, czyli endpoint przerwanego PRZYJĘCIA pojazdu
     * (tylko status DRAFT). Na wizycie IN_PROGRESS kończyło się to błędem
     * „Anulować można tylko wizyty o statusie DRAFT", choć ta sama wizyta usuwała się
     * bez problemu z listy - jedna akcja, dwa różne zachowania zależnie od ekranu.
     */
    const { mutate: deleteVisit, isPending: isDeleting } = useMutation({
        mutationFn: () => visitApi.deleteVisit(visitId),
        onSuccess: () => {
            showSuccess('Wizyta została usunięta');
            setDeletedVisitId(visitId);
        },
        onError: (error: unknown) => {
            const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
            // 403 objaśnia już globalny interceptor („Nie masz uprawnień…"); drugi dymek
            // o tym samym tylko hałasuje.
            if (response?.status === 403) return;
            showWarning(response?.data?.message ?? 'Nie udało się usunąć wizyty. Spróbuj ponownie.');
        },
    });

    useEffect(() => {
        if (!deletedVisitId) return;
        // Tu zapytania wizyty są już wygaszone, więc usunięcie ich z cache nie wywoła
        // ani jednego żądania. Szczegół musi zniknąć: inaczej powrót pod ten adres
        // pokazuje przez moment wizytę, której nie ma.
        queryClient.removeQueries({ queryKey: visitDetailQueryKey(deletedVisitId) });
        queryClient.invalidateQueries({ queryKey: ['operations'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        // `replace`: do usuniętej wizyty nie ma po co wracać przyciskiem „wstecz".
        navigate('/operations', { replace: true });
    }, [deletedVisitId, queryClient, navigate]);

    return {
        deleteVisit,
        isDeleting,
        /** Widok nie ma już czego pokazywać - czeka tylko na przejście na listę. */
        isDeleted: deletedVisitId !== null,
        /** Pusty po usunięciu: wygasza wszystkie zapytania tej wizyty. */
        activeVisitId: deletedVisitId ? '' : visitId,
    };
};
