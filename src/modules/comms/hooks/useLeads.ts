// src/modules/comms/hooks/useLeads.ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { IMessage } from '@stomp/stompjs';
import { subscribeToTopic } from '@/core/socketClient';
import { useAuth } from '@/core';
import { apiClient } from '@/core/apiClient';
import { useToast } from '@/common/components/Toast';
import { hasMaskedPii, mergeMaskedPii } from '@/common/pii';
import { leadsApi } from '../api/leadsApi';
import { LEAD_STATUS_LABELS } from '../types';
import { pluralPl } from '@/common/utils/plural';
import { COMMS_THREADS_KEY } from './useComms';
import { DEFAULT_STAGNATION, type StagnationThresholds } from '../utils/leadUrgency';
import type {
    DashboardSocketEvent,
    Lead,
    LeadBoardStage,
    LeadPage,
    LeadServiceItemInput,
    LeadSortDirection,
    LeadStatus,
    MarkThreadAsLeadRequest,
} from '../types';

export const LEADS_KEY = ['leads'];
export const LEAD_DICTIONARIES_KEY = [...LEADS_KEY, 'dictionaries'];
export const LEAD_ANALYTICS_KEY = [...LEADS_KEY, 'analytics'];
export const LEAD_OVERVIEW_KEY = [...LEADS_KEY, 'overview'];

/**
 * Pola leada, które backend maskuje przy serializacji (@Pii po stronie serwera).
 *
 * Lista jest krótka i musi taka zostać: gdy przybędzie kolejne pole osobowe,
 * dopisanie go tutaj jest jedyną rzeczą, jakiej wymaga scalanie rozgłoszeń.
 */
const LEAD_PII_FIELDS = ['customerName', 'contactIdentifier'] as const satisfies ReadonlyArray<keyof Lead>;

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

/**
 * Kafle kontekstu i wykres roku na ekranie startowym modułu.
 *
 * Osobne, lekkie zapytanie zamiast pełnej analityki: ta ostatnia liczy macierze,
 * segmenty aut i kilkaset surowych faktów, a ekran startowy rysuje z tego dwanaście
 * punktów i cztery liczby.
 *
 * `staleTime` piętnastominutowy - krócej niż godzina, bo w kaflach stoi okno
 * czternastu dni i czas odpowiedzi, a te rzeczy zmieniają się w trakcie dnia pracy.
 * Wciąż na tyle długo, żeby trzydzieści wejść w moduł nie było trzydziestoma zapytaniami.
 */
export const useLeadOverview = (year?: number, options: { enabled?: boolean } = {}) =>
    useQuery({
        queryKey: [...LEAD_OVERVIEW_KEY, year ?? 'current'],
        queryFn: () => leadsApi.getOverview(year),
        staleTime: 15 * 60_000,
        retry: false,
        enabled: options.enabled ?? true,
    });

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

/** Pasek rezerwacji w rozmowie - pyta tylko sprawa, która ma termin. */
export const useLeadBooking = (leadId: string, enabled: boolean) =>
    useQuery({
        queryKey: [...LEADS_KEY, 'booking', leadId],
        queryFn: () => leadsApi.getBooking(leadId),
        enabled,
        staleTime: 60_000,
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
        mutationFn: ({ leadId, note, owed }: { leadId: string; note?: string; owed?: boolean }) =>
            leadsApi.recordCallback(leadId, note, owed ?? false),
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

/**
 * Usunięcie wielu spraw naraz.
 *
 * Z cache'u znikają tylko te, które FAKTYCZNIE zniknęły na serwerze: serwer zwraca
 * listę pominiętych, więc usunięte to zaznaczenie minus pominięte. Wyrzucenie z listy
 * wszystkiego, co było zaznaczone, pokazywałoby kolejkę krótszą niż jest i sprawy
 * wracałyby przy pierwszym odświeżeniu - a użytkownik zdążyłby uznać, że zrobione.
 *
 * Komunikat mówi osobno o powodzeniu i o pominięciach, z powodem pierwszego z nich.
 * Dwa zdania zamiast jednego, bo to są dwie różne wiadomości.
 */
export const useBulkDeleteLeads = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    const { showSuccess, showError, showInfo } = useToast();
    return useMutation({
        mutationFn: ({ ids, deleteAppointments }: { ids: string[]; deleteAppointments?: boolean }) =>
            leadsApi.bulkDeleteLeads(ids, deleteAppointments ?? false),
        onSuccess: (result, { ids }) => {
            const skippedIds = new Set(result.skipped.map((entry) => entry.leadId));
            const removed = new Set(ids.filter((id) => !skippedIds.has(id)));

            if (removed.size > 0) {
                updateLeadPages(queryClient, (page) => {
                    const items = page.items.filter((item) => !removed.has(item.id));
                    if (items.length === page.items.length) return page;
                    return {
                        ...page,
                        items,
                        total: Math.max(0, page.total - (page.items.length - items.length)),
                    };
                });
                removed.forEach((id) =>
                    queryClient.removeQueries({ queryKey: [...LEADS_KEY, 'detail', id] })
                );
                // Wątki odzyskują możliwość ponownego oznaczenia - skrzynka musi o tym wiedzieć.
                queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY });
                invalidate();
            }

            if (result.deleted > 0) {
                showSuccess(
                    result.deleted === 1 ? 'Sprawa usunięta' : `Usunięto ${result.deleted} ${pluralPl(result.deleted, 'sprawę', 'sprawy', 'spraw')}`,
                    'Korespondencja została w skrzynce'
                );
            }
            if (result.skipped.length > 0) {
                showInfo(
                    result.skipped.length === 1
                        ? 'Jednej sprawy nie usunięto'
                        : `${result.skipped.length} spraw nie usunięto`,
                    result.skipped[0].reason
                );
            }
        },
        onError: (error) => {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się usunąć zaznaczonych spraw', message ?? 'Spróbuj ponownie');
        },
    });
};

/**
 * Ten sam status dla wielu spraw naraz („te pięć zamykam jako przegrane").
 *
 * Bez optymistycznej podmiany w cache: status przestawia sprawy między sekcjami
 * kolejki i do archiwum, a tę układankę zna serwer. Po odpowiedzi unieważniamy listy
 * i szczegóły zmienionych spraw. Komunikat - jak przy usuwaniu - osobno o powodzeniu
 * i o pominięciach, z powodem pierwszego z nich.
 */
export const useBulkChangeLeadStatus = () => {
    const queryClient = useQueryClient();
    const invalidate = useLeadInvalidation();
    const { showSuccess, showError, showInfo } = useToast();
    return useMutation({
        mutationFn: ({
            ids,
            status,
            lostReasonCode,
            lostNote,
        }: {
            ids: string[];
            status: LeadStatus;
            lostReasonCode?: string;
            lostNote?: string;
        }) => leadsApi.bulkChangeStatus(ids, status, lostReasonCode, lostNote),
        onSuccess: (result, { ids, status }) => {
            ids.forEach((id) => queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'detail', id] }));
            invalidate();
            if (result.changed > 0) {
                showSuccess(
                    result.changed === 1 ? 'Status zmieniony' : `Zmieniono status ${result.changed} spraw`,
                    `Nowy status: ${LEAD_STATUS_LABELS[status]}`
                );
            }
            if (result.skipped.length > 0) {
                showInfo(
                    result.skipped.length === 1
                        ? 'Jednej sprawy nie zmieniono'
                        : `${result.skipped.length} spraw nie zmieniono`,
                    result.skipped[0].reason
                );
            }
        },
        onError: (error) => {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się zmienić statusu zaznaczonych spraw', message ?? 'Spróbuj ponownie');
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

            /*
             * Rozgłoszenie przychodzi z ZAMASKOWANYMI danymi osobowymi i tak ma być:
             * topic jest wspólny dla całego studia, a uprawnienia subskrybentów są
             * w chwili nadania nieznane (WebSocketEventBridge.send → withMasked).
             *
             * Wpisywanie takiego rekordu wprost do pamięci podręcznej zamieniało
             * nazwisko klienta na „***" po KAŻDEJ operacji na leadzie - zmianie
             * statusu, odnotowaniu kontaktu, zapisaniu wyceny - u wszystkich, którzy
             * mają prawo widzieć dane. Nazwisko nie znikało z bazy; po prostu nie
             * przyjechało tym kanałem, a my nadpisywaliśmy nim to, co już mieliśmy.
             *
             * Maska w polu przychodzącym znaczy „nic o tym nie powiedziano".
             */
            const merged = (previous: Lead | undefined) =>
                mergeMaskedPii(previous, lead, LEAD_PII_FIELDS);

            updateLeadPages(queryClient, (page) => {
                const index = page.items.findIndex((item) => item.id === lead.id);
                if (index === -1) return page;
                const items = [...page.items];
                items[index] = merged(page.items[index]);
                return { ...page, items };
            });

            const detailKey = [...LEADS_KEY, 'detail', lead.id];
            const cachedDetail = queryClient.getQueryData<Lead>(detailKey);
            if (cachedDetail || !hasMaskedPii(lead, LEAD_PII_FIELDS)) {
                queryClient.setQueryData(detailKey, merged(cachedDetail));
            } else {
                /*
                 * Nie ma z czym scalić, a rekord jest uboższy niż to, co dałby REST.
                 * Zasianie go tutaj oznaczałoby, że przy otwarciu sprawy przez chwilę
                 * widać „***" zamiast klienta. Lepiej nie zapisać nic - zapytanie
                 * pobierze pełne dane przy pierwszym wyświetleniu.
                 */
                queryClient.invalidateQueries({ queryKey: detailKey });
            }

            /*
             * Wiadomość z Instagrama nie ma własnego kanału na żywo - serwer ogłasza ją
             * zmianą leada. Bez tego otwarta sprawa pokazywałaby nową wiadomość klienta
             * dopiero po minucie, a pole odpowiedzi stałoby nad nieaktualną rozmową.
             */
            if (lead.source === 'INSTAGRAM') {
                queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'instagram-dm', lead.id] });
                queryClient.invalidateQueries({ queryKey: [...LEADS_KEY, 'history', lead.id] });
            }
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
 * Podmiana leada w pamięci podręcznej - w każdej stronie listy i w szczegółach.
 *
 * Dla tablicy spraw: karta upuszczona w kolumnie ma tam stać od razu, a nie wrócić
 * na stare miejsce na czas żądania i przeskoczyć po odpowiedzi. Podgląd przeciągania
 * i ten zapis liczą lead tą samą funkcją (leadAfterMove), więc nic się nie przesuwa.
 */
export const usePatchLeadCache = () => {
    const queryClient = useQueryClient();
    return useCallback(
        (lead: Lead) => {
            updateLeadPages(queryClient, (page) => {
                const index = page.items.findIndex((item) => item.id === lead.id);
                if (index === -1) return page;
                const items = [...page.items];
                items[index] = lead;
                return { ...page, items };
            });
            queryClient.setQueryData<Lead>([...LEADS_KEY, 'detail', lead.id], (cached) => (cached ? { ...cached, ...lead } : cached));
        },
        [queryClient]
    );
};

/**
 * Przeciągnięcie karty na tablicy spraw. [optimistic] - lead po przesunięciu, wpisany
 * do pamięci przed żądaniem; błąd przywraca stan serwera unieważnieniem.
 */
export const useMoveLeadOnBoard = () => {
    const queryClient = useQueryClient();
    const patch = usePatchLeadCache();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, stage }: { leadId: string; stage: LeadBoardStage | null; optimistic: Lead }) =>
            leadsApi.moveOnBoard(leadId, stage),
        onMutate: async ({ optimistic }) => {
            // Odpowiedź odświeżenia wysłanego przed przesunięciem nadpisałaby kartę starym miejscem.
            await queryClient.cancelQueries({ queryKey: [...LEADS_KEY, 'list'] });
            patch(optimistic);
        },
        onSettled: (_lead, _error, { leadId }) => invalidate(leadId),
    });
};

/**
 * „Przypomnij" - jedno przypomnienie, wysłane w rozmowie klienta. Okno zbiorcze woła to
 * po kolei, sprawa po sprawie: każda ma własną treść, a odmowa jednej nie wstrzymuje reszty.
 * Lead z odpowiedzi trafia od razu do pamięci - karta przechodzi do „Odpowiedzieliśmy"
 * z plakietką, zanim lista zdąży się odświeżyć.
 */
export const useSendLeadReminder = () => {
    const queryClient = useQueryClient();
    const patch = usePatchLeadCache();
    const invalidate = useLeadInvalidation();
    return useMutation({
        mutationFn: ({ leadId, bodyHtml, appendSignature }: { leadId: string; bodyHtml: string; appendSignature: boolean }) =>
            leadsApi.sendReminder(leadId, { bodyHtml, appendSignature }),
        onSuccess: (lead) => patch(lead),
        onSettled: (_lead, _error, { leadId }) => {
            invalidate(leadId);
            // Przypomnienie jest nową wiadomością w rozmowie - otwarta sprawa ma ją pokazać.
            queryClient.invalidateQueries({ queryKey: COMMS_THREADS_KEY });
        },
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
 * Akcje na sugestiach AI: [Dodaj do wyceny] / [Odrzuć] / „Sprawdź ponownie" / przeniesienie
 * przy rezerwacji. Każdy endpoint zwraca świeżego leada, więc podmieniamy szczegół
 * w miejscu i unieważniamy listę, analitykę oraz kalendarz (wycena = lista rezerwacji).
 */
/**
 * [onAccepted] - dla edytorów, które trzymają wycenę lokalnie (okno wyceny, oferta
 * w odpowiedzi): przyjęta sugestia ląduje na serwerze w wycenie, a edytor musi ją
 * dopisać do swojej listy - inaczej „Zapisz" nadpisałby ją listą sprzed przyjęcia.
 */
export const useSuggestionActions = (leadId: string, options: { onAccepted?: (lead: Lead) => void } = {}) => {
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
        onSuccess: (lead) => {
            settle(lead);
            options.onAccepted?.(lead);
        },
    });
    const reject = useMutation({
        mutationFn: (itemId: string) => leadsApi.rejectSuggestion(leadId, itemId),
        onSuccess: settle,
    });
    const refresh = useMutation({
        mutationFn: () => leadsApi.refreshSuggestions(leadId),
        // Diagnoza zostaje w `refresh.data` - pokazuje ją panel pod sugestiami. Starszy
        // backend zwraca samego leada (bez diagnozy) - obsługujemy oba kształty.
        onSuccess: (result) => settle('diagnostics' in result ? result.lead : (result as unknown as Lead)),
    });
    return { accept, reject, refresh };
};

/**
 * „Umów wizytę" musi najpierw przenieść nieodrzucone sugestie do wyceny.
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

/**
 * Przypięcie sprawy do klienta z kartoteki - po dodaniu nowego klienta z panelu
 * sprawy. Unieważnia też wizytówkę kontaktu, bo „Nowy klient" właśnie przestał nim być.
 */
export const useAssignLeadCustomer = () => {
    const invalidate = useLeadInvalidation();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ leadId, customerId }: { leadId: string; customerId: string }) =>
            leadsApi.assignCustomer(leadId, customerId),
        onSuccess: (_lead, { leadId }) => {
            invalidate(leadId);
            queryClient.invalidateQueries({ queryKey: ['comms', 'contact-card'] });
        },
    });
};

