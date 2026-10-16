/**
 * Etykieta przycisku wydania: co się stanie (linia 1) i na co, dla kogo (linia 2).
 *
 * Przycisk nazwany skutkiem i kwotą zastępuje rutynowe „Czy na pewno?”: przy ladzie
 * okno potwierdzenia po kilku dniach klika się odruchowo, a zdanie „Wydaj auto
 * i wyślij fakturę do KSeF, 1 700,00 zł dla Flota Serwis” czyta się przy każdym
 * kliknięciu (NN/g, GOV.UK: przycisk opisuje skutek). Kwoty przychodzą sformatowane,
 * nic tu nie jest przeliczane.
 */
export interface HandoverActionInput {
    isFreeVisit: boolean;
    canIssueDocuments: boolean;
    documentType: 'INVOICE' | 'RECEIPT' | 'other';
    /** „Faktura + Inny dokument” z resztą większą od zera. */
    hasOtherDocument: boolean;
    invoicedExternally: boolean;
    sendToKsef: boolean;
    gross: string;
    invoiceGross: string;
    remainder: string;
    buyerName: string;
    paymentLabel: string;
}

export interface HandoverAction {
    title: string;
    detail: string;
}

export const handoverAction = (a: HandoverActionInput): HandoverAction => {
    if (a.isFreeVisit) return { title: 'Wydaj auto', detail: 'Wizyta bez opłat, bez dokumentu sprzedaży' };
    if (!a.canIssueDocuments) return { title: 'Wydaj auto', detail: `Do zapłaty ${a.gross}` };

    if (a.documentType === 'INVOICE') {
        const buyer = a.buyerName.trim();
        if (a.invoicedExternally) {
            return { title: `Wydaj auto i zapisz płatność ${a.gross}`, detail: 'Fakturę wystawi księgowość' };
        }
        const verb = a.sendToKsef ? 'wyślij fakturę' : 'wystaw fakturę';
        if (a.hasOtherDocument) {
            return {
                title: `Wydaj auto i ${verb} na ${a.invoiceGross}`,
                detail: `Pozostałe ${a.remainder} gotówką na innym dokumencie`,
            };
        }
        return {
            title: a.sendToKsef ? 'Wydaj auto i wyślij fakturę do KSeF' : 'Wydaj auto i wystaw fakturę',
            detail: buyer ? `${a.gross} dla ${buyer}` : a.gross,
        };
    }
    const document = a.documentType === 'RECEIPT' ? 'Paragon' : 'Inne rozliczenie';
    return { title: `Wydaj auto i przyjmij ${a.gross}`, detail: `${document}, ${a.paymentLabel.toLowerCase()}` };
};
