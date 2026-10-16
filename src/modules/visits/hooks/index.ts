import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/visitApi';
import { visitCommentApi } from '../api/visitCommentApi';
import { communicationApi } from '../api/communicationApi';
import type {
    UpdateArrivalStatePayload,
    UpdateVisitPayload,
    UploadDocumentPayload,
    UploadPhotoPayload,
    AddCommentPayload,
    AddServicePayload,
    UpdateServicePayload,
    DeleteServicePayload,
    UpdateServiceStatusPayload,
    TechnicalNoteHistoryEntry,
    UpdateDamageMapPayload,
} from '../types';
import {useToast} from "@/common/components/Toast";
import { toastUnhandledError } from '@/modules/subscription/utils/apiErrors';

export const visitDetailQueryKey = (visitId: string) => ['visit', visitId];
export const visitDocumentsQueryKey = (visitId: string) => ['visit', visitId, 'documents'];
export const visitPhotosQueryKey = (visitId: string) => ['visit', visitId, 'photos'];

export const useVisitDetail = (visitId: string) => {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: visitDetailQueryKey(visitId),
        queryFn: () => visitApi.getVisitDetail(visitId),
        enabled: !!visitId,
        /*
         * Wyjątek od globalnego `refetchOnWindowFocus: false` (App.tsx) i dokładnie ten
         * przypadek, dla którego ta opcja istnieje: nad jedną wizytą pracują dwie osoby.
         * Auto wydaje jedna, wizytę zamyka druga, a między nimi jest jeszcze tablet na
         * recepcji. Karta zostawiona otwarta pokazywała status sprzed godziny i oferowała
         * przycisk, który musiał skończyć się konfliktem 409. Powrót do karty to najtańszy
         * moment, żeby zobaczyć prawdę.
         */
        refetchOnWindowFocus: true,
        /*
         * Nierozpoczętej wizyty nie ma sensu dopytywać: serwer nie zmieni zdania, dopóki
         * ktoś nie dokończy przyjęcia. Ponawianie tylko opóźniałoby komunikat, który
         * mówi użytkownikowi, co ma z tym zrobić.
         */
        retry: (failureCount, err) => !isVisitNotStarted(err) && failureCount < 3,
    });

    return {
        visitDetail: data,
        isLoading,
        isError,
        /**
         * Wizyta istnieje, ale nie została rozpoczęta - przyjęcie pojazdu nie zostało
         * dokończone. To nie jest błąd ładowania i nie wolno go tak pokazać.
         */
        notStarted: isVisitNotStarted(error),
        refetch,
    };
};

/** 404 z kodem `VISIT_NOT_STARTED` - patrz VisitNotStartedException po stronie API. */
const isVisitNotStarted = (error: unknown): boolean => {
    const response = (error as { response?: { status?: number; data?: { code?: string } } })?.response;
    return response?.status === 404 && response?.data?.code === 'VISIT_NOT_STARTED';
};

export const useUpdateVisit = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: UpdateVisitPayload) =>
            visitApi.updateVisit(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się zapisać wizyty', 'Zmiana nie została zapisana. Spróbuj ponownie.'),
    });

    return {
        updateVisit: mutate,
        isUpdating: isPending,
    };
};

/**
 * Poprawka „Stanu przy przyjęciu" (przebieg, kluczyki, dokumenty). Osobny endpoint,
 * bo ogólny PATCH wizyty nie istnieje po stronie backendu — zmiana ginęła po cichu.
 */
export const useUpdateArrivalState = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const { mutate, mutateAsync, isPending } = useMutation({
        mutationFn: (payload: UpdateArrivalStatePayload) => visitApi.updateArrivalState(visitId, payload),
        onSuccess: (_data, payload) => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            // VIN należy do pojazdu - karta pojazdu i listy mają pokazać nowy numer.
            if (payload.vin !== undefined) queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            showSuccess('Zapisano');
        },
        onError: () => {
            showError('Nie udało się zapisać zmian');
        },
    });

    return {
        updateArrivalState: mutate,
        updateArrivalStateAsync: mutateAsync,
        isUpdating: isPending,
    };
};

export const useUploadDocument = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: UploadDocumentPayload) =>
            visitApi.uploadDocument(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            queryClient.invalidateQueries({
                queryKey: visitDocumentsQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się dodać dokumentu', 'Plik nie trafił do wizyty. Spróbuj ponownie.'),
    });

    return {
        uploadDocument: mutate,
        isUploading: isPending,
    };
};

export const useUploadPhoto = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: UploadPhotoPayload) =>
            visitApi.uploadPhoto(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitPhotosQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się dodać zdjęcia', 'Zdjęcie nie trafiło do wizyty. Spróbuj ponownie.'),
    });

    return {
        uploadPhoto: mutate,
        isUploading: isPending,
    };
};

export const useDeletePhoto = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (photoId: string) =>
            visitApi.deletePhoto(visitId, photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitPhotosQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się usunąć zdjęcia', 'Zdjęcie nadal jest w wizycie. Spróbuj ponownie.'),
    });

    return {
        deletePhoto: mutate,
        isDeleting: isPending,
    };
};

export const useDeleteDocument = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (documentId: string) =>
            visitApi.deleteDocument(visitId, documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
            queryClient.invalidateQueries({
                queryKey: visitDocumentsQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się usunąć dokumentu', 'Dokument nadal jest w wizycie. Spróbuj ponownie.'),
    });

    return {
        deleteDocument: mutate,
        isDeleting: isPending,
    };
};

// Documents hooks
export const useVisitDocuments = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitDocumentsQueryKey(visitId),
        queryFn: () => visitApi.getVisitDocuments(visitId),
        enabled: !!visitId,
    });

    return {
        documents: data || [],
        isLoading,
        isError,
        refetch,
    };
};

// Photos hooks (from check-in)
export const useVisitPhotos = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitPhotosQueryKey(visitId),
        queryFn: () => visitApi.getVisitPhotos(visitId),
        enabled: !!visitId,
    });

    return {
        photos: data?.photos || [],
        isLoading,
        isError,
        refetch,
    };
};

// Comments hooks
export const visitCommentsQueryKey = (visitId: string) => ['visit', visitId, 'comments'];

export const useVisitComments = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitCommentsQueryKey(visitId),
        queryFn: () => visitCommentApi.getComments(visitId),
        enabled: !!visitId,
    });

    return {
        comments: data?.comments || [],
        isLoading,
        isError,
        refetch,
    };
};

export const useAddComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AddCommentPayload) =>
            visitCommentApi.addComment(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        addComment: mutate,
        isAdding: isPending,
    };
};

export const useUpdateComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
            visitCommentApi.updateComment(visitId, commentId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        updateComment: mutate,
        isUpdating: isPending,
    };
};

export const useDeleteComment = (visitId: string) => {
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (commentId: string) =>
            visitCommentApi.deleteComment(visitId, commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitCommentsQueryKey(visitId),
            });
        },
    });

    return {
        deleteComment: mutate,
        isDeleting: isPending,
    };
};

// Service management hooks
export const useAddService = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AddServicePayload) =>
            visitApi.addService(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się dodać usługi', 'Usługa nie trafiła do wizyty. Spróbuj ponownie.'),
    });

    return {
        addService: mutate,
        isAdding: isPending,
    };
};

export const useUpdateService = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: UpdateServicePayload }) =>
            visitApi.updateService(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się zmienić usługi', 'Zmiana nie została zapisana. Spróbuj ponownie.'),
    });

    return {
        updateService: mutate,
        isUpdating: isPending,
    };
};

export const useDeleteService = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: DeleteServicePayload }) =>
            visitApi.deleteService(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się usunąć usługi', 'Usługa nadal jest w wizycie. Spróbuj ponownie.'),
    });

    return {
        deleteService: mutate,
        isDeleting: isPending,
    };
};

export const useUpdateServiceStatus = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: ({ serviceLineItemId, payload }: { serviceLineItemId: string; payload: UpdateServiceStatusPayload }) =>
            visitApi.updateServiceStatus(visitId, serviceLineItemId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się zmienić statusu usługi', 'Status nie został zapisany. Spróbuj ponownie.'),
    });

    return {
        updateServiceStatus: mutate,
        isUpdating: isPending,
    };
};

export const useSaveServicesChanges = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: import('../types').ServicesChangesPayload) =>
            visitApi.saveServicesChanges(visitId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        // Wiersze robocze zostają: ServicesTable czyści je tylko w onSuccess zapisu,
        // więc po błędzie wystarczy kliknąć „Zapisz zmiany” jeszcze raz.
        onError: (error: unknown) =>
            toastUnhandledError(showError, error, 'Nie udało się zapisać zmian w usługach', 'Twoje zmiany są nadal w tabeli. Spróbuj zapisać ponownie.'),
    });

    return {
        saveServicesChanges: mutate,
        isSaving: isPending,
    };
};

// Communication history hooks
export const visitCommunicationQueryKey = (visitId: string) => ['visit', visitId, 'communication'];

export const useVisitCommunication = (visitId: string) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitCommunicationQueryKey(visitId),
        queryFn: () => communicationApi.getVisitCommunication(visitId),
        enabled: !!visitId,
    });

    return {
        communication: data,
        entries: data?.entries || [],
        isLoading,
        isError,
        refetch,
    };
};

export const useApproveServiceChange = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (serviceLineItemId: string) =>
            visitApi.approveServiceChange(visitId, serviceLineItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        // Bez tego 5xx zamykał okno potwierdzenia bez słowa, usługa zostawała PENDING,
        // a „Gotowe do odbioru” odmawiało z powodu, którego sprzedawca nie widział.
        // Wizytę odświeżamy także po błędzie: odmowa 4xx to zwykle zmiana rozstrzygnięta
        // już w innej karcie albo na tablecie, a ekran ma to pokazać.
        onError: (error: unknown) => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            toastUnhandledError(showError, error, 'Nie udało się zatwierdzić zmiany', 'Usługa nadal czeka na decyzję. Spróbuj ponownie.');
        },
    });

    return {
        approveServiceChange: mutate,
        isApproving: isPending,
    };
};

export const useUpdateVisitTitle = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (title: string) => visitApi.updateTitle(visitId, title),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: ['operations'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'upcoming-visits'] });
            showSuccess('Zapisano nazwę wizyty');
        },
        onError: () => {
            showError('Nie udało się zapisać nazwy wizyty');
        },
    });

    return {
        updateTitle: mutateAsync,
        isUpdating: isPending,
    };
};

export const useUpdateEstimatedCompletionDate = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (date: string) => visitApi.updateEstimatedCompletionDate(visitId, date),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            showSuccess('Zapisano termin odbioru');
        },
        onError: () => {
            showError('Nie udało się zapisać terminu odbioru');
        },
    });

    return {
        updateEstimatedCompletionDate: mutateAsync,
        isUpdating: isPending,
    };
};

export const useRejectServiceChange = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showError } = useToast();

    const { mutate, isPending } = useMutation({
        mutationFn: (serviceLineItemId: string) =>
            visitApi.rejectServiceChange(visitId, serviceLineItemId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: visitDetailQueryKey(visitId),
            });
        },
        // Jak przy zatwierdzaniu: komunikat i odświeżenie, okno zostaje do ponowienia.
        onError: (error: unknown) => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            toastUnhandledError(showError, error, 'Nie udało się wycofać zmiany', 'Usługa nadal czeka na decyzję. Spróbuj ponownie.');
        },
    });

    return {
        rejectServiceChange: mutate,
        isRejecting: isPending,
    };
};

export const visitTechnicalNoteHistoryQueryKey = (visitId: string) => ['visit', visitId, 'technical-note-history'];

export const useUpdateTechnicalNote = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (content: string | null) => visitApi.updateTechnicalNote(visitId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: visitTechnicalNoteHistoryQueryKey(visitId) });
            showSuccess('Zapisano notatkę techniczną');
        },
        onError: () => {
            showError('Nie udało się zapisać notatki technicznej');
        },
    });

    return {
        updateTechnicalNote: mutateAsync,
        isUpdating: isPending,
    };
};

export const useTechnicalNoteHistory = (visitId: string) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: visitTechnicalNoteHistoryQueryKey(visitId),
        queryFn: () => visitApi.getTechnicalNoteHistory(visitId),
        enabled: !!visitId,
    });

    return {
        entries: (data?.entries ?? []) as TechnicalNoteHistoryEntry[],
        isLoading,
        isError,
    };
};

// ─── Mapa uszkodzeń ───────────────────────────────────────────────────────────

export const visitDamageMapQueryKey = (visitId: string) => ['visit', visitId, 'damage-map'];

/**
 * Punkty, od których startuje edycja mapy.
 *
 * `enabled` jest sterowane z zewnątrz, bo tego zapytania nie ma sensu robić przy
 * każdym wejściu w kartę wizyty — interesuje nas dopiero w momencie otwarcia okna
 * okno „Mapa uszkodzeń".
 */
export const useVisitDamageMap = (visitId: string, enabled = true) => {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: visitDamageMapQueryKey(visitId),
        queryFn: () => visitApi.getDamageMap(visitId),
        enabled: !!visitId && enabled,
        /*
         * Mapę rysują dwie osoby naraz (recepcja i hala), a punkty z telefonu
         * dochodzą asynchronicznie. Świeży odczyt przy otwarciu okna jest tańszy
         * niż dorysowanie na nieaktualnym podkładzie.
         */
        staleTime: 0,
    });

    return { damageMap: data, isLoading, isError, refetch };
};

export const useUpdateVisitDamageMap = (visitId: string) => {
    const queryClient = useQueryClient();
    const { showSuccess, showError, showWarning } = useToast();

    const { mutateAsync, isPending } = useMutation({
        mutationFn: (payload: UpdateDamageMapPayload) => visitApi.updateDamageMap(visitId, payload),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: visitDamageMapQueryKey(visitId) });
            // Nowy dokument pojawia się w sekcji Dokumentacja, a `damageMapFileId`
            // wizyty wskazuje już inny plik — oba zapytania muszą to zobaczyć.
            queryClient.invalidateQueries({ queryKey: visitDocumentsQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visitId) });
            queryClient.invalidateQueries({ queryKey: visitCommunicationQueryKey(visitId) });

            /*
             * Zapis punktów i wygenerowanie pliku to dwie różne rzeczy i backend
             * świadomie potrafi zrobić pierwszą bez drugiej. Komunikat „zapisano"
             * bez tego rozróżnienia kłamałby o tym, co zobaczy klient.
             */
            if (!result.documentGenerated && result.pointsCount > 0) {
                showWarning(
                    'Oznaczenia zapisane, dokument nie',
                    'Punkty są zapisane, ale nie udało się wygenerować pliku PDF. Spróbuj zapisać mapę ponownie.'
                );
            } else if (result.notification && !result.notification.emailSent && !result.notification.smsSent) {
                showWarning('Zapisano mapę uszkodzeń', result.notification.message);
            } else if (result.notification) {
                showSuccess('Zapisano mapę uszkodzeń', result.notification.message);
            } else {
                showSuccess('Zapisano mapę uszkodzeń');
            }
        },
        onError: () => {
            showError('Nie udało się zapisać mapy uszkodzeń');
        },
    });

    return { updateDamageMap: mutateAsync, isUpdating: isPending };
};
