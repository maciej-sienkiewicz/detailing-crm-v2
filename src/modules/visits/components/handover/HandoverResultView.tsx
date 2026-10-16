import { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle2, Clock, Download, FileText, MessageSquareHeart } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { useToast } from '@/common/components/Toast';
import { useKsefAutomation } from '@/modules/finance/hooks';
import { ksefRevenueApi } from '@/modules/finance/api/ksefRevenueApi';
import { Button, ui } from '@/common/components/ui';
import type { CompleteVisitResponse } from '../../types/stateTransitions';

/*
 * Ekran wyniku ma dwie warstwy. Górna - „Auto wydane” - jest zielona i ostateczna,
 * niezależna od KSeF: wydanie auta nie czeka na serwer ministerstwa. Dolna to karta
 * dokumentu z własnym odcieniem statusu (przyjęta, czeka, odrzucona). Dotąd jeden
 * nagłówek mieszał oba fakty i „Pojazd wydany” stało nad odrzuconą fakturą.
 */

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    padding: 8px 0;
`;

const Head = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
`;

const Mark = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${ui.okTint};
    border: 1px solid ${ui.okLine};
    color: ${ui.okInk};

    svg { width: 28px; height: 28px; }
`;

const Title = styled.h3`
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: ${ui.ink};
`;

const Lead = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.textSecondary};
`;

const Cards = styled.div`
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

const TONE: Record<Tone, { bg: string; line: string; ink: string }> = {
    ok: { bg: '#f0fdf4', line: '#86efac', ink: '#166534' },
    warn: { bg: '#fffbeb', line: '#fde68a', ink: '#92400e' },
    bad: { bg: '#fef2f2', line: '#fecaca', ink: '#991b1b' },
    neutral: { bg: '#f8fafc', line: '#e2e8f0', ink: '#334155' },
};

const DocCard = styled.section<{ $tone: Tone }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 18px;
    border-radius: 16px;
    border: 1px solid ${p => TONE[p.$tone].line};
    background: ${p => TONE[p.$tone].bg};
    color: ${p => TONE[p.$tone].ink};
`;

const DocHead = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;

    > svg { width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
`;

const DocTitle = styled.strong`
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

const DocText = styled.span`
    display: block;
    margin-top: 2px;
    font-size: 13px;
    line-height: 1.5;
`;

const Lines = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 13px;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;
`;

const DocActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Note = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textSecondary};
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    svg { width: 14px; height: 14px; color: ${ui.brandInk}; }
`;

/** KSeF 440: numer dokumentu jest już zajęty pod tym NIP-em. */
const isDuplicateRejection = (error?: string | null): boolean =>
    !!error && (error.includes('440') || /duplikat/i.test(error));

interface InvoiceCard {
    tone: Tone;
    title: string;
    text: string;
}

/** Status faktury → karta. Nagłówek „Auto wydane” stoi nad nią zawsze, niezależnie od KSeF. */
const invoiceCard = (result: CompleteVisitResponse, ksefMisconfigured: boolean): InvoiceCard => {
    const number = result.ksefInvoiceNumber ?? '';
    if (result.ksefStatus === 'NOT_SENT') {
        return { tone: 'neutral', title: `Faktura ${number} wystawiona bez wysyłki do KSeF`, text: 'Wyślesz ją później w Finansach → Dokumenty przychodowe.' };
    }
    // Bez tokenu wysyłka nie przejdzie nigdy, więc nie obiecujemy ponowienia.
    if (ksefMisconfigured && result.ksefStatus !== 'ACCEPTED' && result.ksefStatus !== 'REJECTED') {
        return { tone: 'warn', title: `Faktura ${number} czeka na wysyłkę`, text: 'Brakuje tokenu KSeF. Dodaj go w Ustawieniach → KSeF i wyślij fakturę z Finansów.' };
    }
    switch (result.ksefStatus) {
        case 'ACCEPTED':
            return { tone: 'ok', title: `Faktura ${number} przyjęta w KSeF`, text: 'Klient może ją pobrać z KSeF albo dostać PDF.' };
        case 'QUEUED_RETRY':
            return { tone: 'warn', title: `Faktura ${number} wystawiona, KSeF chwilowo nie działa`, text: 'Wyślemy ją sami, gdy KSeF wróci.' };
        case 'REJECTED':
            // Odrzucona faktura nie istnieje w KSeF; jej numer jest spalony, a XML zamrożony.
            // Duplikat (440) wyróżniamy: dane są poprawne, zajęty jest tylko numer.
            return isDuplicateRejection(result.ksefError)
                ? { tone: 'bad', title: 'KSeF nie przyjął faktury: numer jest zajęty', text: 'Wystaw ją ponownie w Finansach → Dokumenty przychodowe, dostanie kolejny numer.' }
                : { tone: 'bad', title: 'KSeF nie przyjął faktury', text: result.ksefError ?? 'Popraw dane i wystaw ją ponownie w Finansach → Dokumenty przychodowe.' };
        default:
            return { tone: 'warn', title: `Faktura ${number} wysłana do KSeF`, text: 'Czekamy na numer KSeF. Status sprawdzimy sami, możesz zamknąć okno.' };
    }
};

/** Termin podziękowania → „17.09, 16:30”, w tym samym formacie co pole wyboru. */
const formatThankYouWhen = (date: Date): string =>
    date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface HandoverResultViewProps {
    result: CompleteVisitResponse;
    grossAmount: number;
    currency: string;
    /** Forma zapłaty słowem („Karta”) - do zdania „Płatność … zapisana”. */
    paymentLabel?: string;
    /** Kiedy wyjdzie SMS z podziękowaniem; null, gdy nie wyjdzie. */
    thankYouAt: Date | null;
    /** Reszta zapisana na innym dokumencie - zapis „DOK/…” nie jest paragonem. */
    remainderWithoutReceipt?: boolean;
    onClose: () => void;
}

export const HandoverResultView = ({
    result,
    grossAmount,
    currency,
    paymentLabel,
    thankYouAt,
    remainderWithoutReceipt = false,
    onClose,
}: HandoverResultViewProps) => {
    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);
    const status = result.ksefStatus ?? null;

    const ksef = useKsefAutomation({ enabled: !!result.ksefInvoiceId });
    const { showError } = useToast();
    const [downloading, setDownloading] = useState(false);
    const [openingPdf, setOpeningPdf] = useState(false);

    // `configured` jest false także w trakcie ładowania - wtedy nie mówimy o braku tokenu.
    const card = result.ksefInvoiceId
        ? invoiceCard(result, !ksef.isLoading && ksef.moduleEnabled && !ksef.configured)
        : null;

    // XML przydaje się, gdy faktura istnieje, a KSeF jej jeszcze nie przyjął (wgranie ręczne).
    // Nie przy odrzuconej: ten sam plik zostałby odrzucony drugi raz.
    const canDownloadXml = !!result.ksefInvoiceId && status !== 'ACCEPTED' && status !== 'REJECTED';

    const handleOpenPdf = async () => {
        if (!result.ksefInvoiceId) return;
        setOpeningPdf(true);
        try {
            await ksefRevenueApi.openInvoicePdf(result.ksefInvoiceId);
        } catch {
            showError('Nie udało się otworzyć faktury', 'Spróbuj ponownie w Finansach → Dokumenty przychodowe.');
        } finally {
            setOpeningPdf(false);
        }
    };

    const handleDownload = async () => {
        if (!result.ksefInvoiceId) return;
        setDownloading(true);
        try {
            await ksefRevenueApi.downloadInvoiceXml(result.ksefInvoiceId, result.ksefInvoiceNumber ?? 'faktura');
        } catch {
            showError('Nie udało się pobrać pliku', 'Spróbuj ponownie w Finansach → Dokumenty przychodowe.');
        } finally {
            setDownloading(false);
        }
    };

    const lead = grossAmount > 0
        ? `Płatność${paymentLabel ? ` ${paymentLabel.toLowerCase()}` : ''} ${fmt(grossAmount)} zapisana.`
        : 'Wizyta bez opłat.';

    return (
        <Wrap>
            <Head>
                <Mark aria-hidden="true"><CheckCircle2 /></Mark>
                <Title>Auto wydane</Title>
                <Lead>{lead}</Lead>
            </Head>

            <Cards>
                {card && (
                    <DocCard $tone={card.tone} aria-label="Faktura">
                        <DocHead>
                            {card.tone === 'ok' ? <FileText aria-hidden="true" /> : card.tone === 'bad' ? <AlertTriangle aria-hidden="true" /> : <Clock aria-hidden="true" />}
                            <div>
                                <DocTitle>{card.title}</DocTitle>
                                <DocText>{card.text}</DocText>
                            </div>
                        </DocHead>
                        {result.remainderDocumentNumber && (
                            <Lines>
                                <span>
                                    {remainderWithoutReceipt ? 'Inny dokument' : 'Paragon na resztę'} {result.remainderDocumentNumber}
                                </span>
                            </Lines>
                        )}
                        <DocActions>
                            <Button onClick={handleOpenPdf} disabled={openingPdf}>
                                <FileText />
                                {openingPdf ? 'Otwieranie…' : 'Faktura PDF'}
                            </Button>
                            {canDownloadXml && (
                                <Button onClick={handleDownload} disabled={downloading}>
                                    <Download />
                                    {downloading ? 'Pobieranie…' : 'Pobierz XML'}
                                </Button>
                            )}
                        </DocActions>
                    </DocCard>
                )}

                {result.invoicedExternally && (
                    <DocCard $tone="neutral" aria-label="Faktura">
                        <DocTitle>Fakturę wystawi księgowość</DocTitle>
                        <DocText>W CRM zapisaliśmy płatność i dane nabywcy.</DocText>
                    </DocCard>
                )}

                {/* Numer zapisu płatności (FAK/…) przy fakturze księgowości nie jest numerem
                    faktury i wyglądałby jak on - pokazujemy go tylko przy paragonie i „innym”. */}
                {!card && !result.invoicedExternally && result.financialDocumentNumber && (
                    <DocCard $tone="neutral" aria-label="Dokument">
                        <DocTitle>Dokument {result.financialDocumentNumber}</DocTitle>
                        <DocText>Znajdziesz go w Finansach.</DocText>
                    </DocCard>
                )}

                {status === 'ACCEPTED' && (
                    <Note>Pomyłka w fakturze? Poprawisz ją na wizycie: Usługi → Popraw rozliczenie.</Note>
                )}
                {thankYouAt && (
                    <Note><MessageSquareHeart aria-hidden="true" />SMS z podziękowaniem wyjdzie {formatThankYouWhen(thankYouAt)}.</Note>
                )}
            </Cards>

            <Button variant="primary" size="lg" onClick={onClose}>Gotowe</Button>
        </Wrap>
    );
};
