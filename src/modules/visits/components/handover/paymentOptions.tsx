import { Banknote, CreditCard, ArrowLeftRight, Smartphone, MonitorSmartphone } from 'lucide-react';
import type { PaymentMethod, InvoiceType } from '../../types/stateTransitions';

export interface PaymentMethodOption {
    value: PaymentMethod;
    label: string;
    icon: React.ReactNode;
}

/** Metody wybierane niemal zawsze: widoczne bez rozwijania. */
export const primaryPaymentMethods: PaymentMethodOption[] = [
    { value: 'CARD', label: 'Karta', icon: <CreditCard size={13} /> },
    { value: 'CASH', label: 'Gotówka', icon: <Banknote size={13} /> },
];

/** Reszta: pod jednym rozwijanym przyciskiem. */
export const secondaryPaymentMethods: PaymentMethodOption[] = [
    { value: 'TRANSFER', label: 'Przelew', icon: <ArrowLeftRight size={13} /> },
    { value: 'BLIK_NA_NUMER', label: 'BLIK na numer', icon: <Smartphone size={13} /> },
    { value: 'BLIK_TERMINAL', label: 'BLIK w terminalu', icon: <MonitorSmartphone size={13} /> },
];

export const paymentMethods: PaymentMethodOption[] = [
    ...primaryPaymentMethods,
    ...secondaryPaymentMethods,
];

/**
 * Typy dokumentu. `other` mapuje się na backendzie na DocumentType.OTHER:
 * dokument z prefiksem DOK w module finansów.
 */
export const documentTypes: Array<{ value: InvoiceType; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura VAT' },
    { value: 'other', label: 'Inne rozliczenie' },
];

/**
 * Wybór dokumentu na ekranie wydania. „Faktura + Inny dokument” istnieje tylko tutaj: dla
 * serwera to faktura (INVOICE) z resztą kwoty zapisaną bez paragonu i bez VAT
 * (remainderWithoutReceipt). Osobny typ zamiast przełączników w sekcji faktury -
 * jeden wybór mówi od razu, czym zostanie rozliczona cała wizyta.
 */
export type DocumentChoice = InvoiceType | 'INVOICE_OTHER';

export const documentChoices: Array<{ value: DocumentChoice; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura VAT' },
    { value: 'INVOICE_OTHER', label: 'Faktura + Inny dokument' },
    { value: 'other', label: 'Inne rozliczenie' },
];
