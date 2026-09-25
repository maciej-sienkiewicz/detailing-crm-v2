// src/modules/batch-orders/components/HowItWorks.tsx
//
// Trzy kroki, które tłumaczą ekran osobie otwierającej go pierwszy raz.
//
// Zgłoszenie: „Do rozliczenia" i samo „rozliczenie" nic nie mówiły - ktoś wchodził
// i pytał „a czym właściwie jest to rozliczenie?". Stąd dwie zmiany: ekran mówi
// o konkretnym przedmiocie (ZESTAWIENIE: PDF z listą aut i sumą, który dostaje
// kontrahent), a przy pierwszej wizycie pokazuje, jak z niego korzystać. Po
// „Rozumiem" pasek znika, a wraca pod „Jak to działa?" w nagłówku.

import styled from 'styled-components';
import { X } from 'lucide-react';

const Panel = styled.section`
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    padding: 18px 56px 18px 20px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid #bae6fd;
    border-radius: 16px;

    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
        padding: 16px 48px 16px 16px;
    }
`;

const Title = styled.h2`
    grid-column: 1 / -1;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const Step = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-start;
`;

const Num = styled.span`
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e0f2fe;
    color: #075985;
    font-size: 13px;
    font-weight: 700;
`;

const StepText = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};

    strong { display: block; margin-bottom: 2px; font-size: 14px; color: ${p => p.theme.colors.text}; }
`;

const Close = styled.button`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #64748b;
    cursor: pointer;

    svg { width: 18px; height: 18px; }
    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
`;

export function HowItWorks({ onClose }: { onClose: () => void }) {
    return (
        <Panel aria-labelledby="how-it-works-title">
            <Title id="how-it-works-title">Jak działają zlecenia zbiorcze</Title>
            <Step>
                <Num>1</Num>
                <StepText>
                    <strong>Dopisujesz auta</strong>
                    Każde auto zrobione dla firmy (salonu, floty, leasingu) dodajesz od razu po wykonaniu, z usługami i ceną.
                </StepText>
            </Step>
            <Step>
                <Num>2</Num>
                <StepText>
                    <strong>Na koniec okresu tworzysz zestawienie</strong>
                    To PDF z listą aut i sumą do zapłaty. Możesz wysłać go kontrahentowi e-mailem jako podstawę do faktury.
                </StepText>
            </Step>
            <Step>
                <Num>3</Num>
                <StepText>
                    <strong>Auta z zestawienia są zamknięte</strong>
                    Nie trafią do kolejnego zestawienia drugi raz. Poprawkę zrobisz, odblokowując auto do korekty.
                </StepText>
            </Step>
            <Close type="button" aria-label="Ukryj wyjaśnienie" title="Ukryj, wróci pod przyciskiem Jak to działa?" onClick={onClose}>
                <X />
            </Close>
        </Panel>
    );
}
