// src/modules/comms/hooks/useLeads.ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import { apiClient } from '@/core/apiClient';
import { useToast } from '@/common/components/Toast';
import { leadsApi } from '../api/leadsApi';
import { COMMS_THREADS_KEY } from './useComms';
import { DEFAULT_STAGNATION, type StagnationThresholds } from '../utils/leadUrgency';
import type {
    DashboardSocketEvent,
    Lead,
    LeadPage,
    LeadServiceItemInput,
    LeadSortDirection,
    LeadStatus,
    MarkThreadAsLeadRequest,
    SimilarVisits,
} from '../types';

export const LEADS_KEY = ['leads'];
export const LEAD_DICTIONARIES_KEY = [...LEADS_KEY, 'dictionaries'];
export const LEAD_ANALYTICS_KEY = [...LEADS_KEY, 'analytics'];

export const useLeads = (filters: {
    status?: LeadStatus;
    query?: string;
    awaitingReply?: boolean;
    sortDirection?: LeadSortDirection;
    page?: number;
    pageSize?: number;
}) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'list', filters],
        queryFn: () => leadsApi.getLeads(filters),
        placeholderData: (previous) => previous,
    });

/** Sprawy w toku - te, które mają jeszcze „czyj ruch". */
export const OPEN_LEAD_STATUSES: LeadStatus[] = ['NEW', 'IN_PROGRESS', 'CONFIRMED'];

/** Sprawy rozstrzygnięte - archiwum. */
export const CLOSED_LEAD_STATUSES: LeadStatus[] = ['COMPLETED', 'LOST', 'NO_SHOW'];

/** Sufit narzucony przez serwer (pageSize.coerceIn(1, 100)) - nie ma sensu prosić o więcej. */
const BUNDLE_PAGE_SIZE = 100;

export interface LeadBundle {
    items: Lead[];
    total: number;
    isLoading: boolean;
    /**
     * Któryś ze statusów wypełnił stronę do sufitu, więc lista jest niepełna.
     * Widok MUSI to pokazać - ciche gubienie rekordów jest dokładnie tym błędem,
     * który tabela popełniała przez brak paginacji.
     */
    truncated: boolean;
}

/**
 * Leady kilku statusów naraz, złożone w jedną listę.
 *
 * Serwerowy filtr `status` jest jednowartościowy, więc „wszystkie otwarte" to
 * trzy zapytania. Brzmi rozrzutnie, ale przy realnym stanie konta (dziesiątki
 * spraw otwartych) każde z nich jest krótkie, a TanStack trzyma je w pamięci
 * podręcznej pod tym samym prefiksem co reszta modułu - więc WebSocket i
 * unieważnienia mutacji obsługują je za darmo.
 *
 * Kolejność ustala konsument, na scalonym zbiorze: żadne sortowanie serwerowe
 * nie ułoży trzech osobnych odpowiedzi w jedną kolejkę. To świadome odstępstwo
 * od zasady „sortowanie na backendzie" i jest ograniczone: gdy [truncated]
 * zacznie zapalać się u realnych klientów, kolejka musi dostać jedno zapytanie
 * z filtrem wielostatusowym i sortowaniem po stronie serwera.
 */
export const useLeadsByStatuses = (
    statuses: LeadStatus[],
    options: { query?: string; sortDirection?: LeadSortDirection } = {}
): LeadBundle => {
    const { query, sortDirection } = options;

    const results = useQueries({
        queries: statuses.map((status) => {
            const filters = {
                status,
                query: query || undefined,
                sortDirection,
                page: 0,
                pageSize: BUNDLE_PAGE_SIZE,
            };
            return {
                queryKey: [...LEADS_KEY, 'list', filters],
                queryFn: () => leadsApi.getLeads(filters),
                placeholderData: (previous: LeadPage | undefined) => previous,
            };
        }),
    });

    return useMemo(() => {
        const pages = results.map((result) => result.data).filter(Boolean) as LeadPage[];
        return {
            items: pages.flatMap((page) => page.items),
            total: pages.reduce((sum, page) => sum + page.total, 0),
            isLoading: results.some((result) => result.isLoading),
            truncated: pages.some((page) => page.items.length >= BUNDLE_PAGE_SIZE),
        };
        // Zależność po danych, nie po tablicy wyników: useQueries zwraca nową
        // tablicę przy każdym renderze, więc referencja niczego nie mówi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [results.map((r) => r.dataUpdatedAt).join('|'), results.some((r) => r.isLoading)]);
};

/**
 * Progi stygnięcia studia - jedno źródło prawdy dla kolejki, plakietek i paska
 * pilności. [staleTime] długi, bo to ustawienie zmieniane raz na kwartał, a nie
 * dane operacyjne; przy braku odpowiedzi (starszy backend, brak uprawnień)
 * konsument sięga po DEFAULT_STAGNATION i widok działa dalej.
 */
export const useLeadAlertConfig = () =>
    useQuery({
        queryKey: [...LEADS_KEY, 'alert-config'],
        queryFn: leadsApi.getAlertConfig,
        staleTime: 30 * 60_000,
        retry: false,
    });

/**
 * Para, którą backend zwraca, gdy studio NICZEGO nie ustawiło.
 *
 * TYMCZASOWE. Kolumny lead_stagnant_* nie mają migracji Flyway i powstają tylko
 * z ddl-auto, a kontroler podstawia `?: 48` / `?: 72`. Żaden ekran nie pozwala
 * ich zmienić, a endpoint jest owner-only i nieudokumentowany - więc 48/72
 * w praktyce znaczy „nieskonfigurowane", a nie „tak wybrał właściciel".
 *
 * Gdyby to potraktować jako wybór, wdrożenie samego frontendu przestawiłoby
 * każdą plakietkę u wszystkich klientów naraz: próg naszej zwłoki z 24 h na 48,
 * cisza klienta z 5 dni na 3 - bez żadnej decyzji produktowej.
 *
 * DO USUNIĘCIA razem z migracją V115, która ustawi domyślne na 24/120
 * (docs/leads-queue-backend-spec.md, punkt B3). Po niej ta para przestanie być
 * wyróżniona i będzie znaczyć dokładnie to, co mówi.
 */
const UNCONFIGURED_BACKEND_DEFAULTS = { our: 48, client: 72 } as const;

/** Progi w kształcie, którego oczekuje reguła pilności; domyślne, gdy serwer milczy. */
export const useStagnationThresholds = (): StagnationThresholds => {
    const { data } = useLeadAlertConfig();
    return useMemo(() => {
        if (!data) return DEFAULT_STAGNATION;
        const unconfigured =
            data.leadStagnantOurThresholdHours === UNCONFIGURED_BACKEND_DEFAULTS.our &&
            data.leadStagnantClientThresholdHours === UNCONFIGURED_BACKEND_DEFAULTS.client;
        if (unconfigured) return DEFAULT_STAGNATION;
        return {
            ourReplyHours: data.leadStagnantOurThresholdHours,
            clientSilenceHours: data.leadStagnantClientThresholdHours,
        };
    }, [data]);
};

export const useLead = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'detail', leadId],
        queryFn: () => leadsApi.getLead(leadId!),
        enabled: leadId !== null,
    });

/**
 * Termin rezerwacji powiązanej z leadem.
 *
 * Lead niesie samo `appointmentId`, więc datę trzeba dobrać osobno. Świadomie
 * nie dokładamy jej do payloadu leada: WebSocket podmienia wiersz w tabeli tym
 * samym kształtem co REST, więc każde pole doklejone tylko w jednym z tych
 * miejsc gaśnie na ekranie po pierwszej zmianie statusu. Zapytanie idzie dopiero
 * przy otwartym oknie i tylko dla leada, który rezerwację faktycznie ma.
 */
export const useLeadAppointment = (appointmentId: string | null) =>
    useQuery({
        queryKey: ['lead-appointment', appointmentId],
        // Wprost przez apiClient z wyciszonym globalnym toastem: rezerwacji mogło
        // już nie być, a „Rezerwacja nie została znaleziona" wyskakujące przy
        // otwieraniu leada to nie jest błąd użytkownika, tylko brak daty do pokazania.
        queryFn: async () => {
            const { data } = await apiClient.get(`/v1/appointments/${appointmentId}`, {
                skipErrorToast: true,
            });
            return data as { schedule?: { startDateTime?: string } };
        },
        enabled: appointmentId !== null,
        staleTime: 60_000,
        // Rezerwacji mogło już nie być (usunięta poza CRM-em) - bez ponawiania.
        retry: false,
    });

/**
 * Przebieg sprawy: statusy, korespondencja i odnotowane telefony w jednej liście.
 * Klucz zostaje pod nazwą „history" — to wciąż historia leada, tylko wreszcie pełna,
 * a wszystkie unieważnienia w module już się do tej nazwy odwołują.
 */
export const useLeadTimeline = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'history', leadId],
        queryFn: () => leadsApi.getTimeline(leadId!),
        enabled: leadId !== null,
    });

export const useLeadDictionaries = () =>
    useQuery({
        queryKey: LEAD_DICTIONARIES_KEY,
        queryFn: leadsApi.getDictionaries,
        staleTime: Infinity,
    });

/**
 * Analityka za wskazany okres.
 *
 * Granice przychodzą gotowe z widoku i są zaokrąglone do dnia, więc klucz
 * zapytania jest stabilny. Wcześniej data liczyła się w trakcie renderu i
 * zmieniała co milisekundę razem z kluczem - każde przerysowanie widoku było
 * nowym zapytaniem, a pamięć podręczna nie trafiała nigdy.
 */
export const useLeadAnalytics = (from: Date, to: Date) => {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    return useQuery({
        queryKey: [...LEAD_ANALYTICS_KEY, fromIso, toIso],
        queryFn: () => leadsApi.getAnalytics(fromIso, toIso),
        staleTime: 5 * 60_000,
    });
};

/**
 * Plakietka przy „Leady" w menu: nowe PLUS otwarte z zaległą odpowiedzią.
 *
 * Sama liczba nowych kłamała: lead „w kontakcie", w którym klient odpisał wczoraj,
 * jest pilniejszy niż świeży, a plakietka milczała. Klucz celowo pod prefiksem
 * `list` - każde unieważnienie listy leadów (mutacje, socket) odświeża i licznik,
 * bez osobnego okablowania.
 */
export const useNewLeadsCount = (options?: { enabled?: boolean }): number => {
    const { data } = useQuery({
        queryKey: [...LEADS_KEY, 'list', 'attention-count'],
        queryFn: leadsApi.getAttentionCount,
        enabled: options?.enabled ?? true,
        staleTime: 60_000,
    });
    return Number(data ?? 0);
};

// ── Notatki na leadzie ───────────────────────────────────────────────────────

export const useLeadNotes = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'notes', leadId],
        queryFn: () => leadsApi.getNotes(leadId!),
        enabled: leadId !== null,
    });

export const useAddLeadNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ leadId, content }: { leadId: string; content: string }) =>
            leadsApi.addNote(leadId, content),
        onSuccess: (_note, { leadId }) => {
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'notes', leadId] });
        },
    });
};

export const useDeleteLeadNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ leadId, noteId }: { leadId: string; noteId: string }) =>
            leadsApi.deleteNote(leadId, noteId),
        onSuccess: (_result, { leadId }) => {
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'notes', leadId] });
        },
    });
};

/**
 * Podmiana zapamiętanych STRON listy leadów — z pominięciem tego, co stroną nie jest.
 *
 * Pod prefiksem ['leads', 'list'] nie mieszkają wyłącznie strony listy: siedzi tam
 * także licznik plakietki z [useNewLeadsCount], świadomie, żeby jedno unieważnienie
 * listy odświeżało i jego. Cena jest taka, że `setQueriesData` po tym prefiksie
 * dostaje do ręki również zwykłą LICZBĘ — a `liczba.items` to TypeError.
 *
 * Wyjątek rzucony w `onSuccess` mutacji wywraca CAŁĄ mutację: React Query przełącza
 * ją wtedy na ścieżkę błędu. Tak właśnie usuwanie leada kończyło się komunikatem
 * „Nie udało się usunąć leada" mimo odpowiedzi 204 z serwera, a wiersz zostawał
 * w tabeli do czasu odświeżenia strony — bo reszta `onSuccess`, razem z usunięciem
 * wiersza z cache, nigdy się nie wykonywała.
 *
 * Strażnik stoi tutaj, a nie w każdym wywołaniu z osobna: pułapka jest w kształcie
 * kluczy, więc jej rozbrojenie ma być jedno i wspólne dla wszystkich, którzy po
 * tym prefiksie sięgają.
 */
const updateLeadPages = (
    queryClient: QueryClient,
    update: (page: LeadPage) => LeadPage
): void => {
    queryClient.setQueriesData<LeadPage>({ queryKey: [...LEADS_KEY, 'list'] }, (cached) =>
        cached && Array.isArray((cached as LeadPage).items) ? update(cached) : cached
    );
};

const useLeadInvalidation = () => {
    const queryClient = useQueryClient();
    return (leadId?: string) => {
        queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: LEAD_ANALYTICS_KEY });
        if (leadId) {
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'history', leadId] });
        }
    };
};

/**
 * Podobne zlecenia z historii studia.
 *
 * Ładowane RAZEM z otwarciem leada: dobór jest policzony w tle przy jego
 * utworzeniu i zapisany na serwerze, więc ten odczyt to hydratacja kwotami
 * z bazy, nie liczenie. `staleTime` długi — zapisany wynik zmienia się tylko
 * przez „Sprawdź ponownie", a to i tak nadpisuje pamięć podręczną wprost.
 */
export const useSimilarVisits = (leadId: string | null) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'similar-visits', leadId],
        queryFn: () => leadsApi.getSimilarVisits(leadId!),
        enabled: leadId !== null,
        staleTime: 10 * 60_000,
        // Dobór potrafi nie znaleźć niczego i to jest poprawna odpowiedź, nie błąd
        // do ponowienia.
        retry: false,
    });

/** „Sprawdź ponownie": przelicza dobór na serwerze i podmienia wynik w miejscu. */
export const useRefreshSimilarVisits = (leadId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    return useMutation({
        mutationFn: () => leadsApi.refreshSimilarVisits(leadId),
        onSuccess: (fresh) => {
            queryClient.setQueryData<SimilarVisits>([...LEADS_KEY, 'similar-visits', leadId], fresh);
        },
        onError: () => showError('Nie udało się przeliczyć podpowiedzi', 'Spróbuj ponownie za chwilę'),
    });
};

/**
 * Zdjęcie jednej podpowiedzi. Odpowiedź serwera jest pusta, więc wiersz usuwamy
 * z pamięci podręcznej na miejscu — ma zniknąć od razu, a nie po ponownym
 * policzeniu całej sekcji, które kosztuje osadzenie i przesiew.
 *
 * Serwer dosuwa na zwolnione miejsce następne zlecenie dopiero przy kolejnym
 * odczycie. Tutaj lista po prostu się skraca i to jest uczciwsze: dosunięcie
 * czegoś, czego użytkownik jeszcze nie widział, wyglądałoby jak podmiana wiersza
 * pod ręką.
 */
export const useDismissSimilarVisit = (leadId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();
    return useMutation({
        mutationFn: (visitId: string) => leadsApi.dismissSimilarVisit(leadId, visitId),
        onSuccess: (_result, visitId) => {
            queryClient.setQueryData<SimilarVisits>(
                [...LEADS_KEY, 'similar-visits', leadId],
                (current) => current
                    ? { ...current, items: current.items.filter((item) => item.visitId !== visitId) }
                    : current
            );
        },
        onError: () => showError('Nie udało się usunąć podpowiedzi', 'Spróbuj ponownie'),
    });
};

/**
 * „Kontakt poza pocztą": rozmowa, SMS albo spotkanie zapisane na leadzie.
 *
 * Unieważniamy oś czasu ORAZ samego leada z listą: backend przy pierwszym telefonie
 * stempluje czas reakcji i przesuwa „Nowy" na „W kontakcie", więc odświeżenie samej
 * osi zostawiłoby w tabeli status, który przestał być prawdziwy.
 */
export const useRecordLeadCallback = () => {
    const invalidate = useLeadInvalidation();
    const { showSuccess, showError } = useToast();
    return useMutation({
        mutationFn: ({ leadId, note }: { leadId: string; note?: string }) =>
            leadsApi.recordCallback(leadId, note),
        onSuccess: (_callback, { leadId }) => {
            invalidate(leadId);
            /*
             * Komunikat mówi o tym, co ZASZŁO, a nie o tym, co powinno z tego wyniknąć.
             *
             * Stało tu „Lead zszedł z kolejki oczekujących na odpowiedź" - zdanie
             * nieprawdziwe za każdym razem, gdy backend nie miał czym przesunąć
             * „czyjego ruchu": telefon trafia do `lead_callbacks`, a `replyState`
             * liczy się z `comm_messages` i przy drugim kontakcie w tej samej sprawie
             * nie drgnie. Kolejka bywa więc dokładnie tam, gdzie była - a użytkownik
             * przeczytał, że jest inaczej. Fałszywy komunikat kosztuje zaufanie do
             * wszystkich następnych.
             */
            showSuccess('Kontakt odnotowany', 'Zapisany w przebiegu sprawy');
        },
        onError: (error) => {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się zapisać kontaktu', message ?? 'Spróbuj ponownie');
        },
    });
};

/**
 * Usunięcie leada. Wiersz znika z listy od razu - czekanie na odświeżenie po
 * potwierdzonym kliknięciu „Usuń" wygląda jak zawieszenie, a nie jak ostrożność.
 *
 * Toasty stoją TUTAJ, a nie przy wywołaniu `mutate`: okno leada zamyka się przed
 * wysłaniem żądania (patrz komentarz przy confirmDelete), a callbacki przekazane
 * do `mutate` nie odpalają się po odmontowaniu komponentu. Tak właśnie ginął
 * po cichu błąd „lead ma rezerwację" - żądanie padało, komunikatu nie było.
 * Callbacki z opcji `useMutation` odpalają się zawsze.
 */
export const useDeleteLead = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    const { showSuccess, showError } = useToast();
    return useMutation({
        mutationFn: ({ leadId, deleteAppointment }: { leadId: string; deleteAppointment?: boolean }) =>
            leadsApi.deleteLead(leadId, deleteAppointment ?? false),
        onSuccess: (_result, { leadId, deleteAppointment }) => {
            updateLeadPages(queryClient, (page) => {
                if (!page.items.some((item) => item.id === leadId)) return page;
                return {
                    ...page,
                    items: page.items.filter((item) => item.id !== leadId),
                    total: Math.max(0, page.total - 1),
                };
            });
            queryClient.removeQueries({ queryKey: [...LEADS_KEY, 'detail', leadId] });
            // Wątek odzyskuje możliwość ponownego oznaczenia - skrzynka musi o tym wiedzieć.
            queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY });
            invalidate();
            showSuccess(
                'Lead usunięty',
                deleteAppointment
                    ? 'Rezerwacja została usunięta razem z nim'
                    : 'Korespondencja została w skrzynce'
            );
        },
        onError: (error) => {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się usunąć leada', message ?? 'Spróbuj ponownie');
        },
    });
};

/** Nowy tag w słowniku studia. */
export const useCreateLeadTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (label: string) => leadsApi.createTag(label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LEAD_DICTIONARIES_KEY }),
    });
};

/**
 * Usunięcie tagu ze słownika. Leady, które go mają, zachowują go w swojej historii -
 * dlatego unieważniamy też listę: etykiety na wierszach przestają być aktualne.
 */
export const useDeleteLeadTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => leadsApi.deleteTag(code),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEAD_DICTIONARIES_KEY });
            queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'list'] });
        },
    });
};

// ── Webhooki formularzy ──────────────────────────────────────────────────────

export const LEAD_INTAKE_KEY = [...LEADS_KEY, 'intake-webhooks'];
export const useUpdateLeadTags = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, tags }: { leadId: string; tags: string[] }) =>
            leadsApi.updateTags(leadId, tags),
        onSuccess: (_lead, variables) => invalidate(variables.leadId),
    });
};

export const useUpdateLeadVehicle = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, vehicleBrand, vehicleModel }: {
            leadId: string;
            vehicleBrand: string | null;
            vehicleModel: string | null;
        }) => leadsApi.updateVehicle(leadId, vehicleBrand, vehicleModel),
        onSuccess: (_lead, variables) => invalidate(variables.leadId),
    });
};

/**
 * Nasłuch zmian leadów na topicu studia. Backend przysyła pełny wiersz, więc
 * podmieniamy go w cache zamiast odpytywać serwer - dzięki temu spinner przy
 * rozpoznawaniu auta zamienia się w wynik sam, bez odświeżania strony.
 */
export function useLeadsSocket(): void {
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();

    const handleMessage = useCallback(
        (message: IMessage) => {
            let event: DashboardSocketEvent;
            try {
                event = JSON.parse(message.body);
            } catch {
                return;
            }
            if (event.type !== 'LEAD_UPDATED' && event.type !== 'LEAD_STATUS_CHANGED') return;

            const lead = event.payload as Lead;
            if (!lead?.id) return;

            updateLeadPages(queryClient, (page) => {
                const index = page.items.findIndex((item) => item.id === lead.id);
                if (index === -1) return page;
                const items = [...page.items];
                items[index] = lead;
                return { ...page, items };
            });
            queryClient.setQueryData([...LEADS_KEY, 'detail', lead.id], lead);
        },
        [queryClient]
    );

    const handlerRef = useRef(handleMessage);
    useEffect(() => {
        handlerRef.current = handleMessage;
    }, [handleMessage]);

    useEffect(() => {
        if (!isAuthenticated || !user?.studioId) return;
        return subscribeToTopic(
            `/topic/studio.${user.studioId}.dashboard`,
            (message) => handlerRef.current(message)
        );
    }, [isAuthenticated, user?.studioId]);
}

export const useMarkThreadAsLead = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ threadId, request }: { threadId: string; request: MarkThreadAsLeadRequest }) =>
            leadsApi.markThreadAsLead(threadId, request),
        onSuccess: (_result, { threadId }) => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'detail', threadId] });
            queryClient.invalidateQueries({ queryKey: [...COMMS_THREADS_KEY, 'list'] });
        },
    });
};

export const useChangeLeadStatus = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({
            leadId,
            status,
            lostReasonCode,
            lostNote,
        }: {
            leadId: string;
            status: LeadStatus;
            lostReasonCode?: string;
            lostNote?: string;
        }) => leadsApi.changeStatus(leadId, { status, lostReasonCode, lostNote }),
        onSuccess: (_lead, { leadId }) => invalidate(leadId),
    });
};

/**
 * Wycena leada i lista usług powiązanej rezerwacji to jedna lista - backend
 * przepisuje jedną w drugą. Dlatego po zapisie unieważniamy też kalendarz:
 * inaczej ten sam użytkownik widziałby w drugiej zakładce swoją poprzednią wersję.
 */
export const useUpdateLeadServices = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, services }: { leadId: string; services: LeadServiceItemInput[] }) =>
            leadsApi.updateServices(leadId, services),
        onSuccess: (_lead, { leadId }) => {
            invalidate(leadId);
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['operations'] });
        },
    });
};

/**
 * Akcje na sugestiach AI: [Akceptuj] / [Odrzuć] / „Sprawdź ponownie" / przeniesienie
 * przy rezerwacji. Każdy endpoint zwraca świeżego leada, więc podmieniamy szczegół
 * w miejscu i unieważniamy listę, analitykę oraz kalendarz (wycena = lista rezerwacji).
 */
export const useSuggestionActions = (leadId: string) => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    const settle = (lead: Lead) => {
        queryClient.setQueryData<Lead>([...LEADS_KEY, 'detail', leadId], lead);
        invalidate(leadId);
        queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const accept = useMutation({
        mutationFn: ({ itemId, priceGross }: { itemId: string; priceGross?: number }) =>
            leadsApi.acceptSuggestion(leadId, itemId, priceGross),
        onSuccess: settle,
    });
    const reject = useMutation({
        mutationFn: (itemId: string) => leadsApi.rejectSuggestion(leadId, itemId),
        onSuccess: settle,
    });
    const refresh = useMutation({
        mutationFn: () => leadsApi.refreshSuggestions(leadId),
        onSuccess: settle,
    });
    return { accept, reject, refresh };
};

/**
 * „Stwórz rezerwację" musi najpierw przenieść nieodrzucone sugestie do wyceny.
 * Serwer zwraca 409 z nazwami, gdy któraś czeka na kwotę — wołający wtedy wymusza
 * kwoty i nie otwiera modalu rezerwacji.
 */
export const useAcceptAllSuggestions = (leadId: string) => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: () => leadsApi.acceptAllSuggestions(leadId),
        onSuccess: (lead) => {
            queryClient.setQueryData<Lead>([...LEADS_KEY, 'detail', leadId], lead);
            invalidate(leadId);
        },
    });
};

export const useUpdateLead = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({
            leadId,
            request,
        }: {
            leadId: string;
            request: { category?: string; customerName?: string; assignedUserId?: string };
        }) => leadsApi.updateLead(leadId, request),
        onSuccess: (_lead, { leadId }) => invalidate(leadId),
    });
};

export const useCreateLead = () => {
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: leadsApi.createLead,
        onSuccess: () => invalidate(),
    });
};
