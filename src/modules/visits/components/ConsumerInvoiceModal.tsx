import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, User } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import { Notice } from '@/common/components/ui';
import { isPiiMasked } from '@/common/pii';
import { formatCurrency } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ksefRevenueApi } from '@/modules/finance/api/ksefRevenueApi';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { InvoiceItemsEditor } from './handover/InvoiceItemsEditor';
import { PaymentMethodPicker } from './handover/PaymentMethodPicker';
import { invoiceGrossOf, invoiceItemFromSettled, parsePln, settledLines, withDerived } from '../types/handover';
import type { HandoverItem } from '../types/handover';
import { apiErrorMessage, apiErrorStatus } from '../api/apiError';
import { visitApi } from '../api/visitApi';
import { visitDetailQueryKey } from '../hooks';
import type { PaymentMethod } from '../types/stateTransitions';
import type { Visit } from '../types';

// Wystawienie faktury do wizyty JUŻ zakończonej - nie zmienia stanu wizyty,
// dokłada tylko brakujący dokument. Z tego poziomu wychodzi wyłącznie faktura
// konsumencka: nie ma wyboru typu dokumentu ani pola NIP, a dane firmowe
// klienta są świadomie pomijane (patrz CompanyWarning niżej).

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 8px;

    & + & { margin-top: 18px; }
`;

const SectionTitle = styled.h4`
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${st.textMuted};
`;

const Box = styled.div`
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    padding: 12px 14px;
`;

const BuyerLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${st.textMuted}; }
`;

const BuyerName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    overflow-wrap: anywhere;
`;

const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-family: inherit;
    color: ${st.text};
    background: #fff;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const FieldGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;

    @media (max-width: 639px) {
        grid-template-columns: 1fr;
    }
`;

/**
 * Klient ma w kartotece firmę i NIP, a mimo to wystawiamy fakturę na osobę
 * fizyczną - to musi być powiedziane wprost, zanim dokument pójdzie do KSeF.
 * Faktura firmowa wymaga innej ścieżki, bo wpływa na odliczenie VAT nabywcy.
 */
const CompanyWarning = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 11px 13px;
    border-radius: ${st.radiusSm};
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #78350f;
    font-size: ${st.fontXs};
    line-height: 1.5;

    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
`;

const TotalsRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 11px 13px;
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    font-size: ${st.fontSm};
    color: ${st.textSecondary};

    strong {
        font-size: 15px;
        color: ${st.text};
        font-variant-numeric: tabular-nums;
    }
`;

const BtnPrimary = styled.button`
    padding: 10px 20px;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;

    &:hover:not(:disabled) { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const BtnGhost = styled.button`
    padding: 10px 20px;
    background: transparent;
    color: #64748b;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;

    &:hover { background: #f8fafc; }
`;

/**
 * Czy odmowa jest pewna. Odpowiedź 4xx znaczy „serwer przeczytał i odmówił" - faktury
 * nie ma. Brak odpowiedzi (504 z bramki, zerwane połączenie) albo 5xx nie mówi nic:
 * POST /invoices nie ma klucza idempotencji, więc faktura mogła powstać, a ponowne
 * „Wystaw" dałoby drugą w KSeF.
 */
const outcomeUnknown = (error: unknown): boolean => {
    const status = apiErrorStatus(error);
    return status === undefined || status >= 500;
};

type IssueProblem =
    | { kind: 'failed'; message: string }
    /** Wynik nieznany: przed ponowieniem trzeba sprawdzić dokumenty wizyty. */
    | { kind: 'unknown' }
    /** Sprawdzenie nie dało wyniku (sieć nadal leży). */
    | { kind: 'checkFailed' }
    /** Sprawdzone: faktury przy wizycie nie ma, ponowienie jest bezpieczne. */
    | { kind: 'notIssued' };

/** Maska PII nigdy nie może trafić na dokument - lepiej puste pole do uzupełnienia. */
const invoiceSafe = (value: string | null | undefined): string =>
    value && !isPiiMasked(value) ? value : '';

const todayLocal = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface ConsumerInvoiceModalProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
    /** Wywoływane po udanym wystawieniu - odświeża detal wizyty. */
    onIssued: () => void;
}

export const ConsumerInvoiceModal = ({ visit, isOpen, onClose, onIssued }: ConsumerInvoiceModalProps) => {
    const { showSuccess, showInfo } = useToast();
    const queryClient = useQueryClient();
    const { calculateServicePrice } = useServicePricing();

    // Ta sama rozbieżność typów co w useHandover: wycena pochodzi z modułu
    // appointments, model wizyty pasuje w praktyce, ale nie w typach.
    const priceOf = useCallback(
        (service: Visit['services'][number]) =>
            calculateServicePrice(service as unknown as Parameters<typeof calculateServicePrice>[0]),
        [calculateServicePrice],
    );

    const currency = visit.totalCost?.currency ?? 'PLN';

    // Pozycje z usług wizyty; kwota brutto jest autorytatywna, tak jak przy wydaniu.
    // Ta sama reguła rozliczenia co przy wydaniu (settledLines = Visit.settledGross):
    // zmiana, która czekała na zgodę klienta w chwili wydania, zostaje w wizycie na
    // zawsze, a za usługę dopisaną i nieprzyjętą klient nie zapłacił.
    const seedItems = useMemo<HandoverItem[]>(() => {
        const settled = settledLines(visit.services, priceOf);
        if (settled.length === 0) {
            return [withDerived({ name: 'Usługi detailingowe', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' })];
        }
        // Stawka z usługi, nie z proporcji kwot - patrz invoiceRateOf.
        return settled.map(invoiceItemFromSettled);
    }, [visit.services, priceOf]);

    const [items, setItems] = useState<HandoverItem[]>(seedItems);
    const [exemptionBasis, setExemptionBasis] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
    const [issueDate, setIssueDate] = useState(todayLocal());
    const [buyerName, setBuyerName] = useState(() =>
        [visit.customer.firstName, visit.customer.lastName].map(invoiceSafe).filter(Boolean).join(' '),
    );
    const [buyerEmail, setBuyerEmail] = useState(() => invoiceSafe(visit.customer.email));
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [problem, setProblem] = useState<IssueProblem | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    // Po nieznanym wyniku „Wystaw fakturę" ustępuje „Sprawdź dokumenty wizyty".
    const needsCheck = problem?.kind === 'unknown' || problem?.kind === 'checkFailed';

    const hasCompanyData = !!(visit.customer.companyNip || visit.customer.companyName);
    const gross = invoiceGrossOf(items);

    const problems: string[] = [];
    if (!buyerName.trim()) problems.push('Podaj imię i nazwisko nabywcy.');
    if (items.length === 0) problems.push('Faktura musi mieć co najmniej jedną pozycję.');
    if (items.some(item => !item.name.trim())) problems.push('Każda pozycja musi mieć nazwę.');
    if (gross <= 0) problems.push('Kwota faktury musi być większa od zera.');
    if (items.some(item => item.vatRate === 'zw') && !exemptionBasis.trim()) {
        problems.push('Stawka „zw" wymaga podstawy zwolnienia.');
    }
    const canSubmit = problems.length === 0 && !isSaving && !needsCheck;

    /**
     * Czy faktura do tej wizyty jednak powstała. Źródłem jest detal wizyty: `settlement.
     * revenueInvoiceId` to faktura przychodowa przypięta do wizyty (GetVisitDetailHandler),
     * a ten sam wpis cache steruje przyciskiem w nagłówku. Okno otwiera się tylko przy
     * wizycie bez faktury, więc każda znaleziona pochodzi z tej próby (albo z drugiej karty)
     * i drugiej wystawiać nie wolno.
     */
    const checkIssued = async () => {
        setIsChecking(true);
        try {
            const detail = await queryClient.fetchQuery({
                queryKey: visitDetailQueryKey(visit.id),
                queryFn: () => visitApi.getVisitDetail(visit.id),
                staleTime: 0,
            });
            if (detail.visit.settlement?.revenueInvoiceId) {
                showInfo(
                    'Faktura jest już wystawiona',
                    'Serwer nie potwierdził jej na czas, ale jest przy wizycie. Drugiej nie wystawiliśmy.'
                );
                onIssued();
                onClose();
                return;
            }
            setProblem({ kind: 'notIssued' });
        } catch {
            setProblem({ kind: 'checkFailed' });
        } finally {
            setIsChecking(false);
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setIsSaving(true);
        setProblem(null);
        try {
            await ksefRevenueApi.issueInvoice({
                // NIP celowo nieobecny: z tego poziomu wychodzi wyłącznie faktura
                // konsumencka, więc nabywca nigdy nie jest firmą.
                buyer: {
                    name: buyerName.trim(),
                    addressLine1: addressLine1.trim() || undefined,
                    addressLine2: addressLine2.trim() || undefined,
                    email: buyerEmail.trim() || undefined,
                },
                items: items.map(item => ({
                    name: item.name.trim(),
                    quantity: 1,
                    ...(item.mode === 'GROSS'
                        ? { unitPriceGross: parsePln(item.gross) }
                        : { unitPriceNet: parsePln(item.net) }),
                    vatRate: item.vatRate,
                })),
                issueDate,
                saleDate: issueDate,
                paymentForm: paymentMethod,
                isPaid: true,
                exemptionLegalBasis: items.some(item => item.vatRate === 'zw')
                    ? exemptionBasis.trim()
                    : undefined,
                visitId: visit.id,
                customerId: visit.customer.id,
            });
            showSuccess('Faktura wystawiona', 'Znajdziesz ją w Finansach.');
            onIssued();
            onClose();
        } catch (err) {
            if (outcomeUnknown(err)) {
                setProblem({ kind: 'unknown' });
                // Nagłówek wizyty też ma się dowiedzieć: gdy faktura jednak powstała,
                // „Wystaw fakturę konsumencką" zamieni się w „Podgląd faktury" także
                // wtedy, gdy ktoś zamknie to okno bez sprawdzania.
                queryClient.invalidateQueries({ queryKey: visitDetailQueryKey(visit.id) });
            } else {
                // `err.message` to angielskie zdanie axiosa („Request failed with status
                // code 400"); powód po polsku jest w odpowiedzi backendu.
                setProblem({
                    kind: 'failed',
                    message: apiErrorMessage(err, 'Nie udało się wystawić faktury. Spróbuj ponownie.'),
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wystaw fakturę konsumencką</ModalTitle>
                    <ModalSubtitle>{visit.visitNumber}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {problem?.kind === 'failed' && (
                    <Notice tone="danger" role="alert" title="Nie udało się wystawić faktury">
                        {problem.message}
                    </Notice>
                )}
                {problem?.kind === 'unknown' && (
                    <Notice tone="warn" role="alert" title="Faktura mogła zostać wystawiona">
                        Serwer nie potwierdził wystawienia. Zanim spróbujesz ponownie, sprawdź dokumenty
                        wizyty: drugie „Wystaw” dałoby drugą fakturę w KSeF.
                    </Notice>
                )}
                {problem?.kind === 'checkFailed' && (
                    <Notice tone="warn" role="alert" title="Nie udało się sprawdzić dokumentów wizyty">
                        Nadal nie wiemy, czy faktura powstała. Sprawdź połączenie i spróbuj za chwilę.
                    </Notice>
                )}
                {problem?.kind === 'notIssued' && (
                    <Notice tone="info" role="status" title="Przy wizycie nie ma faktury">
                        Poprzednia próba jej nie wystawiła. Możesz wystawić ją ponownie.
                    </Notice>
                )}

                {hasCompanyData && (
                    <CompanyWarning>
                        <AlertTriangle />
                        <span>
                            W karcie klienta są dane firmowe
                            {visit.customer.companyNip ? ` (NIP ${visit.customer.companyNip})` : ''}. Tu
                            wystawisz tylko fakturę na osobę prywatną. Fakturę na firmę wystaw w Finansach.
                        </span>
                    </CompanyWarning>
                )}

                <Section>
                    <SectionTitle>Nabywca</SectionTitle>
                    <Box>
                        <BuyerLine>
                            <User />
                            <BuyerName>{buyerName.trim() || 'Osoba fizyczna'}</BuyerName>
                        </BuyerLine>
                        <FieldGrid>
                            <Field>
                                Imię i nazwisko
                                <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                            </Field>
                            <Field>
                                E-mail (opcjonalnie)
                                <Input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} />
                            </Field>
                            <Field>
                                Adres (opcjonalnie)
                                <Input
                                    value={addressLine1}
                                    onChange={e => setAddressLine1(e.target.value)}
                                    placeholder="ulica i numer"
                                />
                            </Field>
                            <Field>
                                Kod i miejscowość (opcjonalnie)
                                <Input
                                    value={addressLine2}
                                    onChange={e => setAddressLine2(e.target.value)}
                                    placeholder="00-000 Miasto"
                                />
                            </Field>
                        </FieldGrid>
                    </Box>
                </Section>

                <Section>
                    <SectionTitle>Pozycje</SectionTitle>
                    <InvoiceItemsEditor
                        items={items}
                        onChange={setItems}
                        exemptionBasis={exemptionBasis}
                        onExemptionBasisChange={setExemptionBasis}
                    />
                </Section>

                <Section>
                    <SectionTitle>Płatność</SectionTitle>
                    <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
                    <FieldGrid>
                        <Field>
                            Data wystawienia i sprzedaży
                            <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                        </Field>
                    </FieldGrid>
                </Section>

                <Section>
                    <TotalsRow>
                        <span>Razem brutto</span>
                        <strong>{formatCurrency(gross / 100, currency)}</strong>
                    </TotalsRow>
                </Section>
            </ModalContent>

            <ModalFooter>
                <BtnGhost onClick={onClose} disabled={isSaving}>Anuluj</BtnGhost>
                {needsCheck ? (
                    <BtnPrimary onClick={checkIssued} disabled={isChecking}>
                        {isChecking ? 'Sprawdzam…' : 'Sprawdź dokumenty wizyty'}
                    </BtnPrimary>
                ) : (
                    <BtnPrimary onClick={handleSubmit} disabled={!canSubmit} title={problems[0]}>
                        {isSaving ? 'Wystawiam…' : 'Wystaw fakturę'}
                    </BtnPrimary>
                )}
            </ModalFooter>
        </ModalShell>
    );
};
