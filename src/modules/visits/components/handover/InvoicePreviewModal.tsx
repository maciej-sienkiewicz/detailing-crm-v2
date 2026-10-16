import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, CloseBtn } from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { ui } from '@/common/components/ui';
import type { CompanySettings } from '@/modules/settings/types';
import { InvoiceLines } from './InvoiceLines';
import { paymentMethods } from './paymentOptions';
import type { PaymentMethod } from '../../types/stateTransitions';
import {
    RATE_LABEL,
    formatNip,
    grossByRate,
    itemAmounts,
    normalizeNip,
    type HandoverBuyer,
    type HandoverItem,
    type VatRateCode,
} from '../../types/handover';

/**
 * Podgląd faktury przed wydaniem pojazdu: sprzedawca, nabywca, pozycje, VAT według
 * stawek i kwota do zapłaty - te same liczby, które pójdą do KSeF. Numer nada system
 * przy wystawieniu, więc podgląd go nie zmyśla.
 *
 * Okno otwierane z okna wydania, stąd SUBMODAL_Z_INDEX. Blokadę przewijania tła
 * zakłada ModalShell (CLAUDE.md §3).
 */
const Sheet = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 4px 0 8px;
`;

const Parties = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const Party = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: 10px;
    font-size: 13px;
    color: ${ui.inkSoft};
    line-height: 1.45;

    strong { font-size: 14px; color: ${ui.ink}; }
`;

const PartyLabel = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textMuted};
    margin-bottom: 2px;
`;

const Missing = styled.span`
    color: #b91c1c;
`;

const Summary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-left: auto;
    width: min(100%, 320px);
    font-size: 13px;
    color: ${ui.textSecondary};
    font-variant-numeric: tabular-nums;
`;

const SummaryRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
`;

const Total = styled(SummaryRow)`
    padding-top: 8px;
    border-top: 1px solid ${ui.line};
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

const RATE_ORDER: VatRateCode[] = ['23', '8', '5', '0', 'zw'];

interface InvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: CompanySettings | undefined;
    buyer: HandoverBuyer;
    items: HandoverItem[];
    paymentMethod: PaymentMethod;
    fmt: (grosz: number) => string;
}

export const InvoicePreviewModal = ({
    isOpen,
    onClose,
    company,
    buyer,
    items,
    paymentMethod,
    fmt,
}: InvoicePreviewModalProps) => {
    const nip = normalizeNip(buyer.nip);
    const byRate = grossByRate(items);
    const perRate = RATE_ORDER.filter(rate => byRate.has(rate)).map(rate => {
        const lines = items.filter(item => item.vatRate === rate).map(itemAmounts);
        const net = lines.reduce((sum, l) => sum + l.net, 0);
        const gross = lines.reduce((sum, l) => sum + l.gross, 0);
        return { rate, net, vat: gross - net, gross };
    });
    const total = perRate.reduce((sum, r) => sum + r.gross, 0);
    const payment = paymentMethods.find(m => m.value === paymentMethod)?.label;
    const sellerAddress = [company?.street, [company?.postalCode, company?.city].filter(Boolean).join(' ')]
        .map(part => part?.trim())
        .filter(Boolean);

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="lg" zIndex={SUBMODAL_Z_INDEX} labelledBy="invoice-preview-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="invoice-preview-title">Podgląd faktury</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Sheet>
                    <Parties>
                        <Party>
                            <PartyLabel>Sprzedawca</PartyLabel>
                            {company?.name ? <strong>{company.name}</strong> : <Missing>Brak nazwy firmy</Missing>}
                            {company?.taxId ? <span>NIP {formatNip(company.taxId)}</span> : <Missing>Brak NIP</Missing>}
                            {sellerAddress.map(line => <span key={line}>{line}</span>)}
                        </Party>
                        <Party>
                            <PartyLabel>Nabywca</PartyLabel>
                            {buyer.name.trim() ? <strong>{buyer.name.trim()}</strong> : <Missing>Brak nazwy nabywcy</Missing>}
                            {nip && <span>NIP {formatNip(nip)}</span>}
                            {buyer.addressLine1.trim() && <span>{buyer.addressLine1.trim()}</span>}
                            {buyer.addressLine2.trim() && <span>{buyer.addressLine2.trim()}</span>}
                        </Party>
                    </Parties>

                    <InvoiceLines items={items} fmt={fmt} />

                    <Summary aria-label="Podsumowanie faktury">
                        {perRate.map(r => (
                            <SummaryRow key={r.rate}>
                                <span>VAT {RATE_LABEL[r.rate]} od {fmt(r.net)}</span>
                                <span>{fmt(r.vat)}</span>
                            </SummaryRow>
                        ))}
                        {payment && (
                            <SummaryRow>
                                <span>Forma płatności</span>
                                <span>{payment}</span>
                            </SummaryRow>
                        )}
                        <Total>
                            <span>Do zapłaty</span>
                            <span>{fmt(total)}</span>
                        </Total>
                    </Summary>
                </Sheet>
            </ModalContent>
        </ModalShell>
    );
};
