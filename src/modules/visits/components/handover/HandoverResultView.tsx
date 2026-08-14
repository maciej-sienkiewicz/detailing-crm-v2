import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/common/utils';
import { SharedButton } from '@/common/styles';
import { ksefRevenueApi } from '@/modules/finance/api/ksefRevenueApi';
import { useToast } from '@/common/components/Toast';
import { apiErrorMessage } from '../../api/apiError';
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

/** KSeF 440 — numer dokumentu jest już zajęty pod tym NIP-em. */
export const isDuplicateRejection = (error?: string | null): boolean =>
    !!error && (error.includes('440') || /duplikat/i.test(error));

/**
 * Status KSeF → co pokazać. REJECTED jest wprost nazwane błędem: wizyta jest
 * zakończona, ale faktura wymaga poprawy — dotąd użytkownik dostawał w tym
 * miejscu komunikat sukcesu i odesłanie do innego modułu.
 */
const present = (result: CompleteVisitResponse): Presentation => {
    if (!result.ksefInvoiceNumber) {
        return {
            tone: 'ok',
            title: 'Pojazd wydany',
            lead: result.financialDocumentNumber
                ? 'Dokument został zapisany w module finansów.'
                : 'Wizyta została zakończona.',
        };
    }
    switch (result.ksefStatus) {
        case 'ACCEPTED':
            return { tone: 'ok', title: 'Pojazd wydany', lead: 'Faktura została przyjęta przez KSeF.' };
        case 'QUEUED_RETRY':
            return {
                tone: 'warn',
                title: 'Pojazd wydany',
                lead: 'KSeF jest chwilowo niedostępny — faktura zostanie dosłana automatycznie w trybie offline24.',
            };
        case 'REJECTED':
            // Duplikat (kod 440) to inna sytuacja niż błąd walidacji: dane są dobre,
            // zajęty jest numer. Ponowna wysyłka tego samego dokumentu nic nie da —
            // trzeba wystawić fakturę od nowa, dostanie kolejny numer w serii.
            return isDuplicateRejection(result.ksefError)
                ? {
                      tone: 'bad',
                      title: 'Faktura odrzucona — duplikat numeru',
                      lead: 'Pojazd został wydany, ale pod NIP-em firmy istnieje już faktura o tym numerze. Wystaw fakturę ponownie w module Finanse → Dokumenty przychodowe.',
                  }
                : {
                      tone: 'bad',
                      title: 'Faktura odrzucona przez KSeF',
                      lead: 'Pojazd został wydany, ale faktura nie przeszła walidacji. Popraw dane nabywcy lub pozycji i wyślij ponownie.',
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
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    const [status, setStatus] = useState(result.ksefStatus ?? null);
    const [error, setError] = useState(result.ksefError ?? null);

    const view = present({ ...result, ksefStatus: status, ksefError: error });
    const duplicate = status === 'REJECTED' && isDuplicateRejection(error);

    const retry = useMutation({
        mutationFn: () => ksefRevenueApi.retryInvoice(result.ksefInvoiceId!),
        onSuccess: invoice => {
            setStatus(invoice.ksefStatus ?? null);
            setError(invoice.lastSendError ?? null);
            queryClient.invalidateQueries({ queryKey: ['ksef', 'revenue'] });
            if (invoice.ksefStatus === 'REJECTED') {
                showError(
                    'KSeF nadal odrzuca fakturę',
                    invoice.lastSendError ??
                        'Popraw dane w module Finanse → Faktury KSeF i spróbuj ponownie.'
                );
            } else {
                showSuccess('Faktura wysłana ponownie', `Status: ${invoice.ksefStatus ?? 'w toku'}.`);
            }
        },
        onError: (error: unknown) =>
            showError(
                'Nie udało się wysłać ponownie',
                apiErrorMessage(error, 'Spróbuj ponownie za chwilę.')
            ),
    });

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
                {/* Przy duplikacie ponowna wysyłka tego samego XML-a zawsze da ten sam
                    błąd — przycisk tylko frustrowałby użytkownika */}
                {status === 'REJECTED' && !duplicate && result.ksefInvoiceId && (
                    <SharedButton
                        $variant="secondary"
                        type="button"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate()}
                    >
                        <RefreshCw size={14} />
                        {retry.isPending ? 'Wysyłanie…' : 'Wyślij ponownie'}
                    </SharedButton>
                )}
                <SharedButton $variant="primary" type="button" onClick={onClose}>
                    Wróć do wizyty
                </SharedButton>
            </Actions>
        </Wrap>
    );
};
