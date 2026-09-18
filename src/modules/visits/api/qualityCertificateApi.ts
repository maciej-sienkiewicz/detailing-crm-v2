// src/modules/visits/api/qualityCertificateApi.ts
import { apiClient } from '@/core';

/** Pozycja produktowa: wskazanie na katalog ALBO nazwa wpisana z ręki. */
export interface CertificateProductEntry {
    productId: string | null;
    name: string;
    note: string | null;
}

export interface GenerateCertificateRequest {
    serviceIds: string[];
    /** Identyfikatory POWIĄZAŃ produkt↔wizyta, nie produktów. */
    productLinkIds: string[];
    /** Produkty dopisane do „użytych" ręcznie, spoza powiązań wizyty. */
    extraProducts: CertificateProductEntry[];
    recommendations: CertificateProductEntry[];
    /** Zalecenia szczegółowe tej realizacji — np. termin pierwszego mycia po powłoce. */
    careNote: string | null;
}

export const qualityCertificateApi = {
    /**
     * Generuje certyfikat i otwiera go do pobrania.
     *
     * POST mimo że nic nie zapisuje: treść zależy od wyboru w oknie, a ten nie mieści
     * się w adresie. Serwer nie trzyma tego wyboru — dokument powstaje i od razu leci
     * do przeglądarki.
     */
    generate: async (visitId: string, request: GenerateCertificateRequest, visitNumber: string): Promise<void> => {
        const response = await apiClient.post(
            `/visits/${visitId}/quality-certificate`,
            request,
            { responseType: 'blob', skipErrorToast: true },
        );
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `certyfikat-jakosci-${visitNumber.replace(/[^\w-]+/g, '-')}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    },
};
