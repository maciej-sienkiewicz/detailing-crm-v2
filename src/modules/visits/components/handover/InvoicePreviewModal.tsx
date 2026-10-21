import { useState } from 'react';
import styled from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, CloseBtn } from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { amountInWords } from '@/common/utils/amountInWords';
import type { CompanySettings } from '@/modules/settings/types';
import { paymentMethods } from './paymentOptions';
import type { PaymentMethod } from '../../types/stateTransitions';
import {
    RATE_LABEL,
    formatNip,
    itemAmounts,
    normalizeNip,
    type HandoverBuyer,
    type HandoverItem,
    type VatRateCode,
} from '../../types/handover';

/**
 * Podgląd faktury przed wydaniem pojazdu: kartka w układzie PDF-a, który system wystawi
 * (InvoicePdfRenderer w backendzie) - granatowe belki, szare pola metryczki, tabela pozycji,
 * podsumowanie według stawek, kwota słownie. Liczby są te same, które pójdą do KSeF;
 * numer nada system przy wystawieniu, więc podgląd go nie zmyśla.
 *
 * Okno otwierane z okna wydania, stąd SUBMODAL_Z_INDEX. Blokadę przewijania tła
 * zakłada ModalShell (CLAUDE.md §3).
 */

// Paleta dokumentu, nie aplikacji: te same kolory co DocumentStyle w PDF-ie.
const NAVY = '#111729';
const GRAY = '#edeeee';
const INK = '#080606';
const MUTED = '#6b7280';
const RULE = '#e2e8f0';
const MISSING = '#b91c1c';

/** Biurko pod kartką - szare tło, na którym dokument wygląda jak dokument. */
const Desk = styled(ModalContent)`
    background: #e9ecf0;
    padding: 24px;

    @media (max-width: 640px) { padding: 12px; }
`;

const Paper = styled.article`
    position: relative;
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 36px 40px 28px;
    box-sizing: border-box;
    background: #ffffff;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.12);
    color: ${INK};
    font-size: 11.5px;
    line-height: 1.45;
    font-variant-numeric: tabular-nums;
    overflow: hidden;

    @media (max-width: 640px) { padding: 22px 16px 18px; }
`;

const Tab = styled.div`
    padding: 4px 8px;
    background: ${NAVY};
    color: #ffffff;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
`;

const Head = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    min-height: 56px;
`;

const Logo = styled.img`
    max-width: 200px;
    max-height: 64px;
    object-fit: contain;
`;

const Studio = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 15px; font-weight: 700; }
    span { color: ${MUTED}; }
`;

const Provider = styled.div`
    width: min(100%, 240px);

    > div:last-child {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin-top: 2px;
        padding: 7px 8px;
        background: ${GRAY};

        strong { font-weight: 700; }
        span { color: ${MUTED}; }
    }
`;

/** Tytuł z belką od krawędzi kartki, jak w PDF-ie. */
const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 22px 0 0 -40px;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: ${NAVY};

    &::before { content: ''; width: 30px; height: 20px; background: ${NAVY}; }

    @media (max-width: 640px) { margin-left: -16px; }
`;

const Meta = styled.dl<{ $cols: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.$cols}, minmax(0, 1fr));
    gap: 8px;
    margin: 18px 0 0;

    > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    dt { margin: 0; }
    dd { margin: 0; padding: 6px 8px; background: ${GRAY}; font-weight: 700; }

    @media (max-width: 560px) { grid-template-columns: 1fr 1fr; }
`;

const Pending = styled.span`
    font-weight: 500;
    font-style: italic;
    color: ${MUTED};
`;

const Parties = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 22px;

    @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const Party = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    > ${Tab} { margin-bottom: 8px; }
    strong { font-size: 12.5px; font-weight: 700; overflow-wrap: anywhere; }
    b { font-weight: 700; }
`;

const Missing = styled.span`
    color: ${MISSING};
    font-weight: 600;
`;

const TableScroll = styled.div`
    margin-top: 24px;
    overflow-x: auto;
`;

const Lines = styled.table`
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;

    th {
        padding: 5px 6px;
        background: ${NAVY};
        color: #ffffff;
        font-size: 8.5px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-align: right;
        white-space: nowrap;
    }
    td {
        padding: 6px;
        border-bottom: 1px solid ${RULE};
        text-align: right;
        vertical-align: top;
        white-space: nowrap;
    }
    th.left, td.left { text-align: left; }
    td.name { white-space: normal; overflow-wrap: anywhere; width: 34%; }
    td.gross { font-weight: 700; }
`;

const Totals = styled.div`
    width: min(100%, 340px);
    margin: 18px 0 0 auto;
`;

const RateTable = styled.table`
    width: 100%;
    margin-top: 6px;
    border-collapse: collapse;

    th { font-size: 8.5px; font-weight: 500; letter-spacing: 0.06em; color: ${MUTED}; text-align: right; padding: 2px 3px; }
    td { text-align: right; padding: 2px 3px; }
    th:first-child, td:first-child { text-align: left; }
    tfoot td { padding-top: 5px; border-top: 1px solid ${NAVY}; font-weight: 700; }
`;

const Due = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
    padding: 8px 10px;
    background: ${GRAY};

    span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; }
    strong { font-size: 18px; font-weight: 800; color: ${NAVY}; white-space: nowrap; }
`;

const InWords = styled.p`
    margin: 10px 0 0;

    span { color: ${MUTED}; }
`;

const Payment = styled.section`
    margin-top: 20px;

    > ${Tab} { display: inline-block; }
    > div { display: flex; flex-direction: column; gap: 1px; margin-top: 7px; }
    span { color: ${MUTED}; }
`;

const Footer = styled.footer`
    margin-top: 26px;
    padding-top: 8px;
    border-top: 1px solid ${RULE};
    color: ${MUTED};
    font-size: 10.5px;
`;

const RATE_ORDER: VatRateCode[] = ['23', '8', '5', '0', 'zw'];

/** Kwota jak na fakturze: „1 234,56”, waluta tylko przy kwocie do zapłaty. */
const money = (grosz: number): string => {
    const sign = grosz < 0 ? '-' : '';
    const abs = Math.abs(Math.round(grosz));
    const zl = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${zl},${String(abs % 100).padStart(2, '0')}`;
};

const dateLabel = (date: Date): string =>
    `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

/** „2026-11-04” → „04.11.2026”. */
const isoLabel = (iso: string): string => iso.split('-').reverse().join('.');

interface InvoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    company: CompanySettings | undefined;
    buyer: HandoverBuyer;
    items: HandoverItem[];
    paymentMethod: PaymentMethod;
    /** Termin płatności (yyyy-MM-dd) - tylko przy przelewie, jak w fakturze z wydania. */
    dueDate?: string;
}

export const InvoicePreviewModal = ({
    isOpen,
    onClose,
    company,
    buyer,
    items,
    paymentMethod,
    dueDate,
}: InvoicePreviewModalProps) => {
    const [logoFailed, setLogoFailed] = useState(false);
    const nip = normalizeNip(buyer.nip);
    const lines = items.map(item => {
        const { net, gross } = itemAmounts(item);
        // VAT to różnica, nie osobne mnożenie (CLAUDE.md §1).
        return { item, net, gross, vat: gross - net };
    });
    const perRate = RATE_ORDER.flatMap(rate => {
        const inRate = lines.filter(l => l.item.vatRate === rate);
        if (!inRate.length) return [];
        const net = inRate.reduce((sum, l) => sum + l.net, 0);
        const gross = inRate.reduce((sum, l) => sum + l.gross, 0);
        return [{ rate, net, vat: gross - net, gross }];
    });
    const totalNet = perRate.reduce((sum, r) => sum + r.net, 0);
    const totalGross = perRate.reduce((sum, r) => sum + r.gross, 0);
    const payment = paymentMethods.find(m => m.value === paymentMethod)?.label;
    const owes = paymentMethod === 'TRANSFER';
    const cityLine = [company?.postalCode, company?.city].map(part => part?.trim()).filter(Boolean).join(' ');
    const sellerAddress = [company?.street?.trim(), cityLine].filter((part): part is string => !!part);
    const contact = [company?.phone, company?.email, company?.website].map(part => part?.trim()).filter(Boolean).join(', ');
    const logoUrl = company?.logoUrl?.trim();
    const showLogo = !!logoUrl && !logoFailed;

    const meta: Array<[string, React.ReactNode]> = [
        ['Numer faktury', <Pending>nada system przy wystawieniu</Pending>],
        ['Data wystawienia', dateLabel(new Date())],
        ...(owes && dueDate ? [['Termin płatności', isoLabel(dueDate)] as [string, string]] : []),
    ];

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="xl" zIndex={SUBMODAL_Z_INDEX} labelledBy="invoice-preview-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="invoice-preview-title">Podgląd faktury</ModalTitle>
                    <ModalSubtitle>Tak będzie wyglądać faktura po wydaniu pojazdu.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <Desk>
                <Paper aria-label="Faktura">
                    <Head>
                        {showLogo ? (
                            <Logo src={logoUrl} alt={company?.name ?? 'Logo'} onError={() => setLogoFailed(true)} />
                        ) : (
                            <Studio>
                                {company?.name ? <strong>{company.name}</strong> : <Missing>Brak nazwy firmy</Missing>}
                                {sellerAddress.length > 0 && <span>{sellerAddress.join(', ')}</span>}
                            </Studio>
                        )}
                        {showLogo && (
                            <Provider>
                                <Tab>Usługodawca</Tab>
                                <div>
                                    <strong>{company?.name}</strong>
                                    {sellerAddress.length > 0 && <span>{sellerAddress.join(', ')}</span>}
                                </div>
                            </Provider>
                        )}
                    </Head>

                    <Title>FAKTURA</Title>

                    <Meta $cols={meta.length}>
                        {meta.map(([label, value]) => (
                            <div key={label}>
                                <dt><Tab>{label}</Tab></dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </Meta>

                    <Parties>
                        <Party>
                            <Tab>Sprzedawca</Tab>
                            {company?.name ? <strong>{company.name}</strong> : <Missing>Brak nazwy firmy</Missing>}
                            {sellerAddress.map(line => <span key={line}>{line}</span>)}
                            {company?.taxId ? <b>NIP: {formatNip(company.taxId)}</b> : <Missing>Brak NIP</Missing>}
                        </Party>
                        <Party>
                            <Tab>Nabywca</Tab>
                            {buyer.name.trim() ? <strong>{buyer.name.trim()}</strong> : <Missing>Brak nazwy nabywcy</Missing>}
                            {buyer.addressLine1.trim() && <span>{buyer.addressLine1.trim()}</span>}
                            {buyer.addressLine2.trim() && <span>{buyer.addressLine2.trim()}</span>}
                            {nip && <b>NIP: {formatNip(nip)}</b>}
                        </Party>
                    </Parties>

                    <TableScroll>
                        <Lines aria-label="Pozycje faktury">
                            <thead>
                                <tr>
                                    <th className="left">Lp</th>
                                    <th className="left">Nazwa towaru lub usługi</th>
                                    <th>Ilość</th>
                                    <th className="left">J.m.</th>
                                    <th>Cena netto</th>
                                    <th>Wartość netto</th>
                                    <th>VAT</th>
                                    <th>Kwota VAT</th>
                                    <th>Wartość brutto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map(({ item, net, vat, gross }, index) => (
                                    <tr key={index}>
                                        <td className="left">{index + 1}</td>
                                        <td className="left name">{item.name.trim() || <Missing>Brak nazwy pozycji</Missing>}</td>
                                        <td>1</td>
                                        <td className="left">szt.</td>
                                        <td>{money(net)}</td>
                                        <td>{money(net)}</td>
                                        <td>{RATE_LABEL[item.vatRate]}</td>
                                        <td>{money(vat)}</td>
                                        <td className="gross">{money(gross)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Lines>
                    </TableScroll>

                    <Totals aria-label="Podsumowanie faktury">
                        <Tab>Podsumowanie według stawek</Tab>
                        <RateTable>
                            <thead>
                                <tr><th>STAWKA</th><th>NETTO</th><th>VAT</th><th>BRUTTO</th></tr>
                            </thead>
                            <tbody>
                                {perRate.map(r => (
                                    <tr key={r.rate}>
                                        <td>{RATE_LABEL[r.rate]}</td>
                                        <td>{money(r.net)}</td>
                                        <td>{money(r.vat)}</td>
                                        <td>{money(r.gross)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td>RAZEM</td>
                                    <td>{money(totalNet)}</td>
                                    <td>{money(totalGross - totalNet)}</td>
                                    <td>{money(totalGross)}</td>
                                </tr>
                            </tfoot>
                        </RateTable>
                        <Due>
                            <span>DO ZAPŁATY</span>
                            <strong>{money(totalGross)} PLN</strong>
                        </Due>
                    </Totals>

                    <InWords><span>Słownie: </span>{amountInWords(totalGross)}</InWords>

                    {payment && (
                        <Payment>
                            <Tab>Płatność</Tab>
                            <div>
                                <div><span>Forma płatności: </span>{payment}</div>
                                {owes && dueDate && <div><span>Termin płatności: </span>{isoLabel(dueDate)}</div>}
                                <div><span>Status: </span>{owes ? 'Oczekuje na zapłatę' : 'Zapłacona'}</div>
                                {owes && company?.bankAccount?.trim() && (
                                    <div><span>Rachunek do wpłaty: </span>{company.bankAccount.trim()}</div>
                                )}
                            </div>
                        </Payment>
                    )}

                    {contact && <Footer>{contact}</Footer>}
                </Paper>
            </Desk>
        </ModalShell>
    );
};
