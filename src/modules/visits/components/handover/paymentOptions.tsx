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
 * Wybór dokumentu na ekranie wydania. Podział na fakturę i inny dokument nie jest
 * osobnym dokumentem, tylko sposobem zapłaty faktury - włącza się go przy formie
 * zapłaty, gdy wybrana jest faktura. Jako czwarta pigułka mylił się z „Inny dokument”.
 */
export const documentChoices: Array<{ value: InvoiceType; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura VAT' },
    { value: 'other', label: 'Inny dokument' },
];
