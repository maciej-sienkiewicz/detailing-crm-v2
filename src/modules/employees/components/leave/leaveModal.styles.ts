// src/modules/employees/components/leave/leaveModal.styles.ts
//
// Wspólne klocki okien wniosku urlopowego (kreator pracownika, decyzja kierownika).
//
// Okna są krok po kroku: każdy krok zaczyna się PYTANIEM albo poleceniem pismem
// tekstowym („Kiedy?", „Podpisz") i jednym zdaniem, co tu zrobić. Pasek kroków
// w nagłówku mówi, ile jeszcze zostało. Wcześniej był to boczny panel z całym
// formularzem naraz - użytkownik nie wiedział, od czego zacząć.

import styled from 'styled-components';
import { ui } from '@/common/components/ui';

/** Tytuł okna i pod nim pasek kroków. */
export const HeadStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    min-width: 0;
`;

/** Nagłówek kroku: pytanie i jedno zdanie instrukcji. */
export const StepHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    h3 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; color: ${ui.ink}; }
    p { margin: 0; font-size: 14px; line-height: 1.5; color: ${ui.textSecondary}; }
`;

export const StepBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/** Stopka okna: wstecz po lewej, krok następny po prawej. */
export const FooterSpacer = styled.div`
    flex: 1;
`;
