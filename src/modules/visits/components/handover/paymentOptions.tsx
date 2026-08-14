import { Banknote, CreditCard, ArrowLeftRight, Smartphone, MonitorSmartphone } from 'lucide-react';
import type { PaymentMethod, InvoiceType } from '../../types/stateTransitions';

export const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
    { value: 'CASH', label: 'Gotówka', icon: <Banknote size={13} /> },
    { value: 'CARD', label: 'Karta', icon: <CreditCard size={13} /> },
    { value: 'TRANSFER', label: 'Przelew', icon: <ArrowLeftRight size={13} /> },
    { value: 'BLIK_NA_NUMER', label: 'BLIK na numer', icon: <Smartphone size={13} /> },
    { value: 'BLIK_TERMINAL', label: 'BLIK terminal', icon: <MonitorSmartphone size={13} /> },
];

export const paymentMethodLabel = (method?: PaymentMethod): string =>
    paymentMethods.find(m => m.value === method)?.label.toLowerCase() ?? 'gotówka';

/**
 * Typy dokumentu. `other` mapuje się na backendzie na DocumentType.OTHER —
 * dokument z prefiksem DOK w module finansów.
 */
export const documentTypes: Array<{ value: InvoiceType; label: string }> = [
    { value: 'RECEIPT', label: 'Paragon' },
    { value: 'INVOICE', label: 'Faktura VAT' },
    { value: 'other', label: 'Inne rozliczenie' },
];
