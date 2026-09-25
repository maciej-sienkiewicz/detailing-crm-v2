// src/common/components/ui/SummaryStrip.tsx
//
// Pasek podsumowania: kwota, po którą się wraca, jest NAGŁÓWKIEM sekcji, a nie
// stopką pod długą tabelą (CLAUDE.md §2, „hierarchia liczby").
//
// Wizyta pokazywała „Razem do zapłaty" 22px na dole wykazu usług - przy kilku
// pozycjach i pakietach trzeba było przewinąć całą tabelę, żeby zobaczyć sumę.
// Zlecenia zbiorcze mają ten sam wzór od czasu przebudowy: etykieta, kwota 20px,
// obok w szarości rozpisanie, po prawej akcje sekcji.
//
// Układ zależy od szerokości PASKA (zapytanie kontenerowe), nie okna: wąski pasek
// kładzie akcje pod kwotą na całą szerokość - tak jak na telefonie w makiecie.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from './tokens';

const Container = styled.div`
    container: summary-strip / inline-size;
    min-width: 0;
`;

const Strip = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px 16px;
    padding: 12px 16px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};

    @container summary-strip (max-width: 520px) {
        flex-direction: column;
        align-items: stretch;
        padding: 12px;
    }
`;

const Text = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

const Label = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

const AmountLine = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    min-width: 0;
`;

const Amount = styled.span`
    font-size: 20px;
    line-height: 1.25;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

/* Kwota jeszcze się wczytuje: szary pasek w jej miejscu, nie „…" - trzy kropki
   w rozmiarze kwoty wyglądały jak zepsuta liczba. */
const Skeleton = styled.span`
    display: block;
    width: 140px;
    height: 24px;
    margin: 1px 0;
    border-radius: 6px;
    background: ${ui.surfaceAlt};
`;

const Details = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;

    @container summary-strip (max-width: 520px) {
        > button, > a, > label { flex: 1 1 0; min-width: 0; }
    }
`;

interface Props {
    label: ReactNode;
    amount: ReactNode;
    /** Rozpisanie zwykłym zdaniem: „netto 5 624,72 zł, VAT 1 293,68 zł". */
    details?: ReactNode;
    actions?: ReactNode;
    loading?: boolean;
    className?: string;
}

export function SummaryStrip({ label, amount, details, actions, loading, className }: Props) {
    return (
        <Container className={className}>
            <Strip>
                <Text>
                    <Label>{label}</Label>
                    <AmountLine aria-live="polite">
                        {loading ? <Skeleton aria-label="Wczytywanie kwoty" /> : <Amount>{amount}</Amount>}
                        {!loading && details && <Details>{details}</Details>}
                    </AmountLine>
                </Text>
                {actions && <Actions>{actions}</Actions>}
            </Strip>
        </Container>
    );
}
