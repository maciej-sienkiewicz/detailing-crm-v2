// src/modules/vehicles/components/vin/vinApi.ts
//
// VIN ze zdjęcia - trzy operacje, z których składa się przycisk aparatu przy polu VIN:
// odczyt zdjęcia z komputera, kod QR dla telefonu i wynik przysłany z telefonu.
//
// Ten sam kształt mają dwa zestawy endpointów: ogólny (`/vin`, uprawnienie edycji
// pojazdu - przyjęcie, karta pojazdu, wizyta) i zleceń zbiorczych (`/batch-orders/vin`,
// ich własne uprawnienie). Komponent dostaje zestaw z zewnątrz, więc działa w obu.
// Wprost z pliku, nie z '@/core': tamten indeks ciągnie router, a router - widoki,
// które importują ten moduł (cykl kończył się „vinApiAt is not a function").
import { apiClient } from '@/core/apiClient';

/** Sesja „VIN telefonem" (kod QR) - token otwiera na telefonie stronę `/m/upload`. */
export interface VinScanSession {
    token: string;
    sessionId: string;
    expiresAt: string;
}

/** Wynik zdjęcia z telefonu; `vin = null` - na zdjęciu nie dało się odczytać VIN. */
export interface VinScanResult {
    vin: string | null;
    scannedAt: string;
}

export interface VinApi {
    extractVin: (file: File) => Promise<string | null>;
    /** `rotate` unieważnia poprzedni kod. */
    startVinScanSession: (rotate?: boolean) => Promise<VinScanSession>;
    /** null, dopóki telefon niczego nie przysłał (204). */
    getVinScanResult: () => Promise<VinScanResult | null>;
}

export const vinApiAt = (base: string): VinApi => ({
    extractVin: async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiClient.post<{ vin: string | null }>(`${base}/extract`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.vin;
    },
    startVinScanSession: async (rotate = false) => {
        const response = await apiClient.post<VinScanSession>(`${base}/qr-token`, null, { params: { rotate } });
        return response.data;
    },
    getVinScanResult: async () => {
        const response = await apiClient.get<VinScanResult | ''>(`${base}/qr-result`);
        return response.status === 204 || !response.data ? null : response.data;
    },
});

/** Pojazd: przyjęcie, karta pojazdu, wizyta. */
export const vehicleVinApi = vinApiAt('/vin');
