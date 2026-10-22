import { apiClient } from '@/core';
import { photoUploadContentType, putToPresignedUrl } from '@/common/utils/presignedUpload';
import { localDateTimeToInstant } from '@/common/utils';
import type {
    VisitDetailResponse,
    VisitDocument,
    UploadDocumentPayload,
    UploadPhotoPayload,
    UploadPhotoResponse,
    AddServicePayload,
    UpdateServicePayload,
    DeleteServicePayload,
    UpdateServiceStatusPayload,
    ServiceLineItem,
    VisitPhotosResponse,
    ConfirmVisitOptions,
    ConfirmVisitResponse,
    TechnicalNoteHistoryResponse,
    OpenDraftVisit,
    OpenDraftVisitListResponse,
    UpdateArrivalStatePayload,
    VisitDamageMapResponse,
    UpdateDamageMapPayload,
    UpdateDamageMapResponse,
    StartDamageMapMobileSessionPayload,
    DamageMapMobileTokenResponse,
    DamageMapMobileSessionResponse,
} from '../types';
import type { ServicesChangesPayload } from '../types';

/** Zmiany jeszcze niezapisane - kwoty liczy ekran z dokładnym brutto pozycji. */
export interface ServiceChangeSmsPreviewRequest {
    requireConfirmation: boolean;
    addedNames: string[];
    removedNames: string[];
    priceChangedNames: string[];
    totalGrossBefore: number;
    totalGrossAfter: number;
}

const BASE_PATH = '/v1/visits';

// Mapowanie statusu z backendu (snake_case lowercase) na frontend (SCREAMING_SNAKE_CASE)
const mapVisitStatus = (backendStatus: string): string => {
    return backendStatus.toUpperCase();
};

export const visitApi = {
    getVisitDetail: async (visitId: string): Promise<VisitDetailResponse> => {
        const response = await apiClient.get(`${BASE_PATH}/${visitId}`);
        const data = response.data;

        // Mapuj status z backendu na format frontendowy
        if (data.visit && data.visit.status) {
            data.visit.status = mapVisitStatus(data.visit.status);
        }

        return data;
    },

    getVisitDocuments: async (visitId: string): Promise<VisitDocument[]> => {
        const response = await apiClient.get(`${BASE_PATH}/${visitId}/documents`);
        return response.data;
    },

    uploadDocument: async (
        payload: UploadDocumentPayload
    ): Promise<VisitDocument> => {
        const formData = new FormData();
        formData.append('file', payload.file);
        formData.append('visitId', payload.visitId);
        formData.append('customerId', payload.customerId || '');
        formData.append('type', payload.type);
        formData.append('name', payload.file.name);
        if (payload.category) {
            formData.append('category', payload.category);
        }

        const response = await apiClient.post(
            '/v1/documents/external',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    uploadPhoto: async (
        payload: UploadPhotoPayload
    ): Promise<UploadPhotoResponse> => {
        // Step 1: Request presigned URL from backend
        const requestBody = {
            fileName: payload.file.name,
            description: payload.description || undefined,
        };

        const response = await apiClient.post<UploadPhotoResponse>(
            `${BASE_PATH}/${payload.visitId}/photos`,
            requestBody
        );

        const { uploadUrl, photoId } = response.data;

        // Step 2: Upload file directly to S3 using presigned URL. Nagłówek MUSI być tym,
        // który podpisał serwer (z rozszerzenia nazwy), nie `file.type`.
        try {
            await putToPresignedUrl(uploadUrl, payload.file, photoUploadContentType(payload.file.name));
        } catch (error) {
            // Serwer dopisał już zdjęcie do wizyty. Bez sprzątnięcia zostawał kafelek bez
            // pliku, którego nikt nie dodał świadomie.
            await apiClient.delete(`${BASE_PATH}/${payload.visitId}/photos/${photoId}`, { skipErrorToast: true })
                .catch(() => undefined);
            throw error;
        }

        return response.data;
    },

    deletePhoto: async (visitId: string, photoId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${visitId}/photos/${photoId}`);
    },

    deleteDocument: async (_visitId: string, documentId: string): Promise<void> => {
        await apiClient.delete(`/v1/documents/${documentId}`);
    },

    getDocumentDownloadUrl: async (documentId: string): Promise<string> => {
        const response = await apiClient.get(`/v1/documents/${documentId}/download-url`);
        return response.data.url;
    },

    // Service management
    addService: async (
        visitId: string,
        payload: AddServicePayload
    ): Promise<ServiceLineItem> => {
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services`,
            payload
        );
        return response.data;
    },

    updateService: async (
        visitId: string,
        serviceLineItemId: string,
        payload: UpdateServicePayload
    ): Promise<ServiceLineItem> => {
        const response = await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}`,
            payload
        );
        return response.data;
    },

    deleteService: async (
        visitId: string,
        serviceLineItemId: string,
        payload: DeleteServicePayload
    ): Promise<void> => {
        await apiClient.delete(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}`,
            { data: payload }
        );
    },

    updateServiceStatus: async (
        visitId: string,
        serviceLineItemId: string,
        payload: UpdateServiceStatusPayload
    ): Promise<ServiceLineItem> => {
        const response = await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/status`,
            payload
        );
        return response.data;
    },

    saveServicesChanges: async (
        visitId: string,
        payload: ServicesChangesPayload
    ): Promise<void> => {
        await apiClient.patch(
            `${BASE_PATH}/${visitId}/services/`,
            payload
        );
    },

    /**
     * Treść SMS-a o zmianach w usługach - z szablonu studia (Ustawienia komunikacji),
     * zanim zmiany trafią do bazy. Bez „Odpisz TAK…": tę frazę dokleja serwer przy wysyłce.
     */
    previewServiceChangeSms: async (
        visitId: string,
        request: ServiceChangeSmsPreviewRequest
    ): Promise<string> => {
        const response = await apiClient.post<{ message: string }>(
            `${BASE_PATH}/${visitId}/services/sms-preview`,
            request
        );
        return response.data.message;
    },

    approveServiceChange: async (
        visitId: string,
        serviceLineItemId: string
    ): Promise<ServiceLineItem> => {
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/approve`
        );
        return response.data;
    },

    rejectServiceChange: async (
        visitId: string,
        serviceLineItemId: string
    ): Promise<ServiceLineItem> => {
        const response = await apiClient.post(
            `${BASE_PATH}/${visitId}/services/${serviceLineItemId}/reject`
        );
        return response.data;
    },

    // Draft visit management

    /**
     * Anulowanie nieukończonego przyjęcia.
     *
     * Idzie na `/cancel`, a nie na `DELETE /visits/{id}`: to drugie jest twardym
     * usunięciem wizyty w dowolnym stanie i wymaga uprawnienia VISITS_DELETE (właściciel
     * lub menedżer). Pracownik, który właśnie przyjmował auto, dostawał na nim 403 -
     * czyli jedyne wyjście z okna dokumentów, jakim mógł zamknąć sprawę, po prostu nie
     * działało. `/cancel` sprawdza status DRAFT, kasuje protokoły, dokumenty i pliki i
     * zostawia rezerwację gotową do ponownego przyjęcia.
     */
    /**
     * `reservationKept: false` - szkic był walk-inem („Wizyta" w kalendarzu) i jego
     * rezerwacja-cień zniknęła razem z nim; przy przyjęciu z rezerwacji zostaje ona
     * w kalendarzu. Starszy backend odpowiadał 204 bez treści - wtedy jak dawniej.
     */
    cancelDraftVisit: async (visitId: string): Promise<{ reservationKept: boolean }> => {
        const response = await apiClient.delete<{ reservationKept?: boolean } | ''>(`${BASE_PATH}/${visitId}/cancel`);
        const data = response.data;
        return { reservationKept: typeof data === 'object' && data !== null ? data.reservationKept !== false : true };
    },

    /**
     * Trwałe usunięcie wizyty w DOWOLNYM statusie - razem ze zdjęciami, protokołami,
     * dokumentami i komentarzami. Wymaga uprawnienia VISITS_DELETE (właściciel/menedżer).
     *
     * To jest usunięcie, o które chodzi w „Usuń wizytę". [cancelDraftVisit] powyżej
     * obsługuje zupełnie inny przypadek - przerwane przyjęcie pojazdu (DRAFT) - i na
     * wizycie IN_PROGRESS kończy się błędem „Anulować można tylko wizyty o statusie DRAFT".
     *
     * `skipErrorToast`: komunikat pokazuje wywołujący, żeby użytkownik nie dostał
     * dwóch dymków naraz - surowego z interceptora i własnego z widoku.
     */
    deleteVisit: async (visitId: string): Promise<void> => {
        await apiClient.delete(`${BASE_PATH}/${visitId}`, { skipErrorToast: true });
    },

    /** Kolejka nieukończonych przyjęć studia. */
    getOpenDrafts: async (): Promise<OpenDraftVisitListResponse> => {
        const response = await apiClient.get(`${BASE_PATH}/drafts`);
        return response.data;
    },

    /**
     * Nieukończone przyjęcie tej rezerwacji, jeśli takie trwa (204 → null).
     * Kreator pyta o to na wejściu, żeby zaproponować wznowienie zamiast zakładać
     * drugą wizytę dla tego samego auta.
     */
    getOpenDraftForAppointment: async (appointmentId: string): Promise<OpenDraftVisit | null> => {
        const response = await apiClient.get(`${BASE_PATH}/drafts/by-appointment/${appointmentId}`);
        return response.status === 204 ? null : (response.data ?? null);
    },

    /**
     * Uzupełnia brakujący adres e-mail klienta wizyty - punktowo, bez ruszania
     * reszty profilu. Używane przez modal "Dokumentacja i Podpisy", żeby nie
     * odsyłać użytkownika z powrotem do formularza przyjęcia.
     */
    updateCustomerEmail: async (visitId: string, email: string): Promise<{ customerId: string; email: string }> => {
        const response = await apiClient.patch(`${BASE_PATH}/${visitId}/customer-email`, { email });
        return response.data;
    },

    /** PATCH /visits/{id}/arrival-state — przebieg, kluczyki, dokumenty z widoku wizyty. */
    updateArrivalState: async (visitId: string, payload: UpdateArrivalStatePayload): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/arrival-state`, payload);
    },

    updateTitle: async (visitId: string, title: string): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/title`, { title });
    },

    /**
     * Zlecenie / aktualizacja Door to Door.
     *
     * `scheduledAt` przychodzi z pickera jako czas ścienny (`2026-09-23T20:15`),
     * a backend czyta to pole jako `Instant` - bez konwersji odpowiadał
     * 400 "could not be parsed at index 16". Zamiana na instant siedzi tutaj,
     * na granicy API, żeby formularz mógł zostać przy tym, co widzi użytkownik.
     */
    updateDoorToDoor: async (
        visitId: string,
        data: {
            enabled?: boolean;
            pickupAddress: { city: string; street: string };
            deliveryAddress: { city: string; street: string };
            notes?: string;
            driverId?: string | null;
            /** Czas ścienny `YYYY-MM-DDTHH:mm` albo instant - jedno i drugie zadziała. */
            scheduledAt?: string | null;
        }
    ): Promise<void> => {
        await apiClient.put(`${BASE_PATH}/${visitId}/door-to-door`, {
            ...data,
            scheduledAt: localDateTimeToInstant(data.scheduledAt),
        });
    },

    updateEstimatedCompletionDate: async (visitId: string, date: string): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/estimated-completion-date`, { estimatedCompletionDate: date });
    },

    updateTechnicalNote: async (visitId: string, content: string | null): Promise<void> => {
        await apiClient.patch(`${BASE_PATH}/${visitId}/technical-note`, { content });
    },

    getTechnicalNoteHistory: async (visitId: string): Promise<TechnicalNoteHistoryResponse> => {
        const response = await apiClient.get(`${BASE_PATH}/${visitId}/technical-note/history`);
        return response.data;
    },

    confirmDraftVisit: async (visitId: string, options?: ConfirmVisitOptions): Promise<ConfirmVisitResponse> => {
        const response = await apiClient.post<ConfirmVisitResponse>(`${BASE_PATH}/${visitId}/confirm`, options ?? {});
        return response.data;
    },

    /**
     * Get visit photos with presigned URLs
     * Photos uploaded during check-in
     */
    getVisitPhotos: async (visitId: string): Promise<VisitPhotosResponse> => {
        const response = await apiClient.get(`${BASE_PATH}/${visitId}/photos`);
        return response.data;
    },

    /**
     * Punkty uszkodzeń, od których startuje okno „Mapa uszkodzeń".
     *
     * Odpowiedź niesie `pointsRecoverable` — dla wizyt sprzed zapisu punktów jest
     * false i UI musi o tym powiedzieć, zanim ktokolwiek zacznie klikać.
     */
    getDamageMap: async (visitId: string): Promise<VisitDamageMapResponse> => {
        const response = await apiClient.get<VisitDamageMapResponse>(`${BASE_PATH}/${visitId}/damage-map`);
        return response.data;
    },

    /**
     * Nowa wersja mapy uszkodzeń.
     *
     * PUT, nie PATCH: przysyłamy CAŁĄ mapę, bo edytor i tak trzyma pełną listę
     * punktów — usunięcie punktu wygląda wtedy dokładnie tak samo jak dodanie i
     * nie ma drugiej ścieżki, którą trzeba pamiętać.
     */
    updateDamageMap: async (
        visitId: string,
        payload: UpdateDamageMapPayload
    ): Promise<UpdateDamageMapResponse> => {
        const response = await apiClient.put<UpdateDamageMapResponse>(
            `${BASE_PATH}/${visitId}/damage-map`,
            payload
        );
        return response.data;
    },

    /**
     * Otwiera sesję mobilną (kod QR) dla mapy uszkodzeń wizyty.
     *
     * Wysyłamy AKTUALNE punkty z edytora, bo backend zasiewa nimi sesję — bez tego
     * telefon zaczynałby od pustej mapy, a jego pierwszy zapis skasowałby oznaczenia
     * z przyjęcia.
     */
    startDamageMapMobileSession: async (
        visitId: string,
        payload: StartDamageMapMobileSessionPayload
    ): Promise<DamageMapMobileTokenResponse> => {
        const response = await apiClient.post<DamageMapMobileTokenResponse>(
            `${BASE_PATH}/${visitId}/damage-map/qr-token`,
            payload
        );
        return response.data;
    },

    /**
     * Uzgadnia sesję mobilną z wizytą i oddaje punkty GOTOWE do wstawienia w edytor:
     * z identyfikatorami zdjęć wizyty i podpisanymi miniaturami.
     *
     * POST, bo ma skutek uboczny — przenosi zdjęcia zrobione telefonem do galerii
     * wizyty. Jedno wywołanie zamiast „przenieś" + „przetłumacz u siebie": ta druga
     * konstrukcja dublowała zdjęcia i gubiła je z punktów, bo telefon przy dodaniu
     * zdjęcia wysyła dwa zdarzenia i oba odpalały przenoszenie równolegle.
     */
    syncDamageMapMobileSession: async (visitId: string): Promise<DamageMapMobileSessionResponse> => {
        const response = await apiClient.post<DamageMapMobileSessionResponse>(
            `${BASE_PATH}/${visitId}/damage-map/mobile/sync`,
            {}
        );
        return response.data;
    },

    /**
     * Kod QR „zdjęcia do wizyty z telefonu". Zdjęcia trafiają do galerii wizyty po
     * stronie serwera, przy wgraniu - okno nie musi ich odbierać, tylko odświeżyć listę.
     * `rotate` unieważnia poprzedni kod.
     */
    startVisitFilesMobileSession: async (visitId: string, rotate: boolean): Promise<DamageMapMobileTokenResponse> => {
        const response = await apiClient.post<DamageMapMobileTokenResponse>(
            `${BASE_PATH}/${visitId}/files/qr-token`,
            null,
            { params: { rotate } }
        );
        return response.data;
    },
};
