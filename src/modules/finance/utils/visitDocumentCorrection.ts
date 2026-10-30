// src/modules/finance/utils/visitDocumentCorrection.ts
//
// Kwota dokumentu z wydania pojazdu zmieniana w Finansach. Dokument nie ma własnej kwoty -
// to suma cen usług wizyty, które rozlicza. Dawniej okno „Edytuj dokument” blokowało
// kwoty („muszą zgadzać się z kwotą wizyty”), bo zapis zmieniał tylko dokument: wizyta
// i statystyki zostawały przy starej cenie.
//
// Teraz zmiana kwoty jest zmianą cen tych usług i idzie przez tę samą poprawkę rozliczenia,
// co „Popraw rozliczenie” w wizycie. Jeden mechanizm, więc wizyta, dokumenty, kasa i faktura
// w KSeF zmieniają się razem, a stary dokument zostaje w historii obok korekty. Żadnej
// drugiej ścieżki „zmień kwotę dokumentu i dopasuj wizytę” - dwie ścieżki do tej samej
// kwoty prędzej czy później się rozjadą.

import type {
    SettlementCorrectionRequest,
    SettlementDocument,
    SettlementDocumentType,
    SettlementService,
    SettlementView,
} from '@/modules/visits/api/settlementApi';
import { changedServiceLines, type SettlementLineDraft } from '@/modules/visits/utils/settlementLines';
import type { PaymentMethod } from '@/modules/visits/types/stateTransitions';
import { dueDateNotBeforeToday } from '@/common/utils/localDate';

/** Dlaczego kwoty tego dokumentu nie da się zmienić z Finansów; null = da się. */
export type VisitDocumentLock = 'NOT_IN_SETTLEMENT' | 'BATCH' | 'NO_SERVICES' | null;

export interface VisitDocumentScope {
    /** Dokument w rozliczeniu wizyty - ten sam, który edytuje okno. */
    document: SettlementDocument | null;
    /** Usługi, których ceny składają się na kwotę dokumentu. */
    services: SettlementService[];
    /**
     * Inne obowiązujące dokumenty wizyty, które poprawka też zastąpi. Bez zapisanego
     * podziału serwer nie wie, która usługa jest na którym dokumencie, więc zmiana ceny
     * dotyczy całej wizyty - okno musi to powiedzieć, zanim ktoś zapisze.
     */
    alsoAffected: SettlementDocument[];
    lock: VisitDocumentLock;
}

const isActive = (d: SettlementDocument) => d.active && d.type !== 'CORRECTION';

/**
 * Które usługi wizyty składają się na ten dokument.
 *
 *  - Podział „Faktura + inny dokument” z zapisaną alokacją: tylko usługi tego dokumentu.
 *    Serwer poprawia wtedy per dokument, drugi dokument zostaje bez zmian.
 *  - Bez podziału: wszystkie usługi wizyty - dokument rozlicza całą wizytę.
 *  - Dokument nieobecny wśród obowiązujących (zastąpiony w międzyczasie, korekta) albo
 *    zlecenie zbiorcze: blokada - kwotę zmienia się wtedy gdzie indziej.
 */
export function visitDocumentScope(view: SettlementView, documentId: string): VisitDocumentScope {
    const document = view.documents.find(d => d.id === documentId) ?? null;
    const empty = (lock: VisitDocumentLock): VisitDocumentScope => ({ document, services: [], alsoAffected: [], lock });

    if (view.batch) return empty('BATCH');
    if (!document || !isActive(document)) return empty('NOT_IN_SETTLEMENT');

    const others = view.documents.filter(d => isActive(d) && d.id !== documentId);
    const allocated = document.services ?? [];
    if (view.perDocument === true && allocated.length > 0) {
        const ids = new Set(allocated.map(s => s.serviceLineItemId));
        const services = view.services.filter(s => ids.has(s.id));
        return { document, services, alsoAffected: [], lock: services.length > 0 ? null : 'NO_SERVICES' };
    }
    if (view.services.length === 0) return empty('NO_SERVICES');
    return { document, services: view.services, alsoAffected: others, lock: null };
}

export interface VisitDocumentEdit {
    /** Forma płatności wybrana w oknie dla TEGO dokumentu. */
    paymentMethod: PaymentMethod;
    /** Termin płatności z okna (YYYY-MM-DD) - przy przelewie. */
    dueDate: string;
    /**
     * Termin przyszedł ze starego dokumentu (nikt go w oknie nie zmienił). Taki termin,
     * jeśli minął, przechodzi na dziś - nowy dokument poprawki ma dzisiejszą datę.
     * Termin wpisany przez człowieka idzie bez zmian; zły odrzuci serwer z powodem.
     */
    dueDateCarried?: boolean;
}

/**
 * Żądanie poprawki rozliczenia z okna „Edytuj dokument”. Wszystko poza cenami usług
 * zostaje takie, jakie jest w wizycie: rodzaj dokumentu, nabywca (null = obowiązujący,
 * serwer go nie zmienia), podstawa zwolnienia z VAT. Forma płatności zmienia się tylko
 * dla edytowanego dokumentu.
 */
export function visitDocumentCorrectionRequest(
    view: SettlementView,
    scope: VisitDocumentScope,
    lines: SettlementLineDraft[],
    edit: VisitDocumentEdit,
    documentNumber: string,
): SettlementCorrectionRequest {
    const document = scope.document!;
    const documentType: SettlementDocumentType = view.documentType ?? (document.type as SettlementDocumentType);
    const active = view.documents.filter(isActive);
    // Podział z alokacją: serwer bierze formę płatności każdego dokumentu osobno, a główną
    // formę - z faktury. Gdyby poszła forma edytowanego dokumentu jako główna, zmiana
    // reszty bez VAT przestawiłaby też płatność faktury.
    const perDocument = view.perDocument === true && documentType === 'INVOICE';
    const documentPaymentMethods = perDocument
        ? Object.fromEntries(active.map(d => [d.id, d.id === document.id ? edit.paymentMethod : d.paymentMethod as PaymentMethod]))
        : undefined;
    const invoiceId = active.find(d => d.type === 'INVOICE')?.id;
    const paymentMethod = perDocument && invoiceId && documentPaymentMethods
        ? documentPaymentMethods[invoiceId]
        : edit.paymentMethod;
    const needsExemption = documentType === 'INVOICE' && view.invoicesIssuedExternally !== true &&
        lines.some(l => l.vatRate === -1);

    return {
        services: changedServiceLines(lines),
        documentType,
        paymentMethod,
        dueDate: paymentMethod === 'TRANSFER'
            ? (edit.dueDate && !edit.dueDateCarried ? edit.dueDate : dueDateNotBeforeToday(edit.dueDate || view.paymentDueDate))
            : null,
        buyer: null,
        exemptionLegalBasis: needsExemption ? view.exemptionLegalBasis ?? null : null,
        reason: `Zmiana kwoty dokumentu ${documentNumber} w Finansach`,
        documentPaymentMethods,
    };
}
