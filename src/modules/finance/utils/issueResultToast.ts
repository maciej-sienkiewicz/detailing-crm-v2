import type { RevenueInvoice } from '../types';

/** Dlaczego faktura z okna „Wystaw fakturę” nie może pojechać do KSeF; null - może. */
export type KsefBlock = 'no-token' | 'no-permission' | null;

export const KSEF_BLOCK_TEXT: Record<Exclude<KsefBlock, null>, string> = {
  'no-token': 'Studio nie ma tokenu KSeF. Dodaj go w Ustawieniach → Finanse i KSeF, a fakturę wyślesz później z listy dokumentów przychodowych.',
  'no-permission': 'Token KSeF nie ma prawa wystawiania faktur. Zmień go w Ustawieniach → Finanse i KSeF, a fakturę wyślesz później z listy dokumentów przychodowych.',
};

export type IssueToast = { tone: 'success' | 'info' | 'warning' | 'error'; title: string; message?: string };

/**
 * Co się stało z fakturą, słowami. Okno zamyka się po wystawieniu, więc bez tego
 * odrzucenie przez KSeF albo kolejka ponowień były widoczne dopiero w szczegółach
 * faktury, o ile ktoś do nich zajrzał.
 */
export const issueResultToast = (invoice: RevenueInvoice, sendRequested: boolean): IssueToast => {
  const number = invoice.invoiceNumber;
  switch (invoice.ksefStatus) {
    case 'ACCEPTED':
      return { tone: 'success', title: `Faktura ${number} przyjęta w KSeF` };
    case 'NOT_SENT':
      // Wysyłkę wybrano, a serwer jej nie zrobił: studio nie ma tokenu KSeF.
      return sendRequested
        ? { tone: 'warning', title: `Faktura ${number} wystawiona bez wysyłki do KSeF`, message: KSEF_BLOCK_TEXT['no-token'] }
        : { tone: 'success', title: `Faktura ${number} wystawiona`, message: 'Do KSeF wyślesz ją później z listy dokumentów przychodowych.' };
    case 'QUEUED_RETRY':
      return { tone: 'warning', title: `Faktura ${number} wystawiona, KSeF chwilowo nie działa`, message: 'Wyślemy ją sami, gdy KSeF wróci.' };
    case 'REJECTED':
      return { tone: 'error', title: `KSeF nie przyjął faktury ${number}`, message: invoice.lastSendError ?? 'Popraw dane i wystaw ją ponownie.' };
    default:
      return { tone: 'info', title: `Faktura ${number} wysłana do KSeF`, message: 'Czekamy na numer KSeF. Status sprawdzimy sami.' };
  }
};
