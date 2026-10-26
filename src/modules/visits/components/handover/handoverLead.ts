import { paymentMethods } from './paymentOptions';
import type { CompleteVisitResponse } from '../../types/stateTransitions';

const methodWord = (method: string | null | undefined): string | null =>
    paymentMethods.find(m => m.value === method)?.label?.toLowerCase() ?? null;

/**
 * Zdanie wyniku: przy podziale osobno faktura i drugi dokument, każdy ze swoją formą
 * zapłaty - dotąd „Płatność karta 2723,00 zł zapisana” przy części zapłaconej gotówką.
 */
export const handoverLead = (
    result: CompleteVisitResponse,
    grossAmount: number,
    paymentLabel: string | undefined,
    fmt: (grosz: number) => string
): string[] => {
    const total = result.totalGross ?? grossAmount;
    if (total <= 0) return ['Wizyta bez opłat.'];
    const lines: string[] = [];
    if (result.batchEntryId) {
        const who = result.batchContractorName ? `kontrahenta ${result.batchContractorName}` : 'kontrahenta';
        lines.push(`Auto za ${fmt(total)} trafiło na listę ${who} w zleceniach zbiorczych.`);
    } else if (result.remainderGross && result.remainderGross > 0 && result.invoiceGross != null) {
        const invoiceMethod = methodWord(result.paymentMethod) ?? paymentLabel?.toLowerCase();
        lines.push(`Faktura ${fmt(result.invoiceGross)} brutto${invoiceMethod ? `, ${invoiceMethod}` : ''}.`);
        lines.push(`Inny dokument ${fmt(result.remainderGross)} bez VAT, ${methodWord(result.remainderPaymentMethod) ?? 'gotówka'}.`);
    } else {
        lines.push(`Płatność${paymentLabel ? ` ${paymentLabel.toLowerCase()}` : ''} ${fmt(total)} zapisana.`);
    }
    const before = result.totalGrossBeforeHandover;
    if (before != null && before !== total) {
        lines.push(`Cena wizyty zmieniona przy wydaniu: ${fmt(before)} → ${fmt(total)} brutto.`);
    }
    return lines;
};
