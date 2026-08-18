import { useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, AlertTriangle, Clock, Download } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { useToast } from '@/common/components/Toast';
import { useKsefAutomation } from '@/modules/finance/hooks';
import { ksefRevenueApi } from '@/modules/finance/api/ksefRevenueApi';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Box, BoxRow, Money, Muted } from './HandoverKit';
import type { CompleteVisitResponse } from '../../types/stateTransitions';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    text-align: center;
    padding: 8px 0;
`;

const Mark = styled.div<{ $tone: 'ok' | 'warn' | 'bad' }>`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    background: ${p =>
        p.$tone === 'ok' ? st.accentGreenDim : p.$tone === 'warn' ? st.accentAmberDim : st.accentRedDim};
    color: ${p => (p.$tone === 'ok' ? st.accentGreen : p.$tone === 'warn' ? st.accentAmber : st.accentRed)};

    svg { width: 26px; height: 26px; }
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.3px;
`;

const Lead = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
    max-width: 46ch;
`;

const Details = styled(Box)`
    width: 100%;
    text-align: left;
`;

const DocNumber = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;

    @media (max-width: 480px) {
        flex-direction: column-reverse;
        > button { width: 100%; }
    }
`;

type Tone = 'ok' | 'warn' | 'bad';

interface Presentation {
    tone: Tone;
    title: string;
    lead: string;
}

/** KSeF 440: numer dokumentu jest już zajęty pod tym NIP-em. */
export const isDuplicateRejection = (error?: string | null): boolean =>
    !!error && (error.includes('440') || /duplikat/i.test(error));

/**
 * Status KSeF → co pokazać. REJECTED jest wprost nazwane błędem: wizyta jest
 * zakończona, ale faktura wymaga poprawy, a dotąd użytkownik dostawał w tym
 * miejscu komunikat sukcesu i odesłanie do innego modułu.
 */
const present = (result: CompleteVisitResponse, ksefMisconfigured: boolean): Presentation => {
    if (!result.ksefInvoiceNumber) {
        return {
            tone: 'ok',
            title: 'Pojazd wydany',
            lead: result.financialDocumentNumber
                ? 'Dokument został zapisany w module finansów.'
                : 'Wizyta została zakończona.',
        };
    }
    // Without a token the send failed at authentication, which the dispatcher records
    // as a transient failure and queues for offline24 retry. That retry can never
    // succeed, so promising it would be a lie: say what actually has to happen.
    if (ksefMisconfigured && result.ksefStatus !== 'ACCEPTED' && result.ksefStatus !== 'REJECTED') {
        return {
            tone: 'warn',
            title: 'Pojazd wydany, faktura czeka na wysyłkę',
            lead: 'Faktura została wystawiona i zapisana, ale nie trafiła do KSeF, bo studio nie ma skonfigurowanego tokenu. Pobierz plik XML i wgraj go ręcznie w KSeF albo skonfiguruj token w Finanse → KSeF i ponów wysyłkę przy fakturze.',
        };
    }

    switch (result.ksefStatus) {
        case 'ACCEPTED':
            return { tone: 'ok', title: 'Pojazd wydany', lead: 'Faktura została przyjęta przez KSeF.' };
        case 'QUEUED_RETRY':
            return {
                tone: 'warn',
                title: 'Pojazd wydany',
                lead: 'KSeF jest chwilowo niedostępny, faktura zostanie dosłana automatycznie w trybie offline24.',
            };
        case 'REJECTED':
            // Odrzucona faktura nie istnieje w KSeF i nie da się jej „dosłać":
            // jej numer jest spalony, a XML zamrożony w chwili wystawienia. Backend
            // świadomie odmawia ponowienia: jedyną drogą jest nowy dokument.
            // Duplikat (kod 440) wyróżniamy, bo tam dane są poprawne: zajęty jest
            // wyłącznie numer i wystawienie od nowa wystarczy.
            return isDuplicateRejection(result.ksefError)
                ? {
                      tone: 'bad',
                      title: 'Faktura odrzucona: duplikat numeru',
                      lead: 'Pojazd został wydany, ale pod NIP-em firmy istnieje już faktura o tym numerze. Wystaw fakturę ponownie w module Finanse → Dokumenty przychodowe, dostanie kolejny numer w serii.',
                  }
                : {
                      tone: 'bad',
                      title: 'Faktura odrzucona przez KSeF',
                      lead: 'Pojazd został wydany, ale faktura nie przeszła walidacji. Popraw dane i wystaw ją ponownie w module Finanse → Dokumenty przychodowe.',
                  };
        default:
            return {
                tone: 'warn',
                title: 'Pojazd wydany',
                lead: 'Faktura została wysłana i oczekuje na potwierdzenie z KSeF.',
            };
    }
};

interface HandoverResultViewProps {
    result: CompleteVisitResponse;
    grossAmount: number;
    currency: string;
    onClose: () => void;
}

export const HandoverResultView = ({
    result,
    grossAmount,
    currency,
    onClose,
}: HandoverResultViewProps) => {
    const status = result.ksefStatus ?? null;
    const error = result.ksefError ?? null;

    const ksef = useKsefAutomation({ enabled: !!result.ksefInvoiceId });
    const { showError } = useToast();
    const [downloading, setDownloading] = useState(false);

    // `configured` is false while the answer is still loading, and treating that as
    // "no token" would flash the wrong explanation at studios that have one.
    const view = present(result, !ksef.isLoading && ksef.moduleEnabled && !ksef.configured);

    // The XML is worth offering whenever the invoice exists but KSeF has not taken
    // it, so the studio can upload it by hand. Not for REJECTED: that document failed
    // validation, so the same file would be rejected again.
    const canDownloadXml =
        !!result.ksefInvoiceId && status !== 'ACCEPTED' && status !== 'REJECTED';

    const handleDownload = async () => {
        if (!result.ksefInvoiceId) return;
        setDownloading(true);
        try {
            await ksefRevenueApi.downloadInvoiceXml(
                result.ksefInvoiceId,
                result.ksefInvoiceNumber ?? 'faktura',
            );
        } catch {
            showError('Nie udało się pobrać pliku', 'Spróbuj ponownie w module Finanse → Dokumenty przychodowe.');
        } finally {
            setDownloading(false);
        }
    };

    const icon =
        view.tone === 'ok' ? <CheckCircle2 /> : view.tone === 'warn' ? <Clock /> : <AlertTriangle />;

    return (
        <Wrap>
            <Mark $tone={view.tone}>{icon}</Mark>
            <Title>{view.title}</Title>
            <Lead>{view.lead}</Lead>

            <Details>
                {result.ksefInvoiceNumber && (
                    <BoxRow>
                        <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>Faktura</span>
                        <DocNumber>{result.ksefInvoiceNumber}</DocNumber>
                    </BoxRow>
                )}
                {result.financialDocumentNumber && !result.ksefInvoiceNumber && (
                    <BoxRow>
                        <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>Dokument</span>
                        <DocNumber>{result.financialDocumentNumber}</DocNumber>
                    </BoxRow>
                )}
                {result.remainderDocumentNumber && (
                    <BoxRow>
                        <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                            Paragon na resztę kwoty
                        </span>
                        <DocNumber>{result.remainderDocumentNumber}</DocNumber>
                    </BoxRow>
                )}
                <BoxRow>
                    <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>Rozliczono</span>
                    <Money>{formatCurrency(grossAmount / 100, currency)}</Money>
                </BoxRow>
                {status === 'REJECTED' && (
                    <Muted>
                        {error ?? 'Szczegóły błędu walidacji znajdziesz w module Finanse → Dokumenty przychodowe.'}
                    </Muted>
                )}
            </Details>

            <Actions>
                {canDownloadXml && (
                    <SharedButton
                        $variant="secondary"
                        type="button"
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        <Download size={15} />
                        {downloading ? 'Pobieranie...' : 'Pobierz plik'}
                    </SharedButton>
                )}
                <SharedButton $variant="primary" type="button" onClick={onClose}>
                    Wróć do wizyty
                </SharedButton>
            </Actions>
        </Wrap>
    );
};
