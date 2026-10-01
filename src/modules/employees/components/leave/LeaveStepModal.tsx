// src/modules/employees/components/leave/LeaveStepModal.tsx
//
// Rama okien urlopowych „krok po kroku": wniosek pracownika, decyzja rozpatrującego
// i urlop dodawany przez administratora. Zastąpiła boczne szuflady - zgłoszenie
// brzmiało „zamiast bocznego panelu zrób modale, bardziej czytelnie i intuicyjnie":
// szuflada pokazywała wszystko naraz, a okno pokazuje jeden krok, nad nim, gdzie
// jesteś, a w stopce - co dalej.
//
// Stopka ma dokładnie JEDNO wypełnienie - krok następny (CLAUDE.md §2); „Wstecz",
// „Anuluj" i „Odrzuć" niosą obwódkę albo odcień. Blokadę przewijania tła daje
// ModalShell (CLAUDE.md §3) - tu jej nie dokładamy.
//
// Na telefonie pastylki kroków nie mieszczą się w jednej linii i zawijały się
// w dwie albo trzy, więc tam stoi zwięzłe „Krok 2 z 4: Termin" z paskiem postępu.

import { useEffect, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import {
    CloseBtn, ModalContent, ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup,
} from '@/common/components/ModalKit';
import { StepPills, ui, type StepState } from '@/common/components/ui';

export interface LeaveStep {
    key: string;
    label: string;
}

/** Stan pastylek z listy kroków i indeksu bieżącego. */
function stepStates(steps: LeaveStep[], current: number): { key: string; label: string; state: StepState }[] {
    return steps.map((s, i) => ({ ...s, state: i < current ? 'done' : i === current ? 'active' : 'todo' }));
}

interface Props {
    titleId: string;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Plakietki obok tytułu (status wniosku). */
    status?: ReactNode;
    /** Bez kroków (np. podgląd rozpatrzonego wniosku) pasek kroków znika. */
    steps?: LeaveStep[];
    current?: number;
    stepsLabel?: string;
    footer?: ReactNode;
    onClose: () => void;
    /**
     * Escape zamyka okno - chyba że nad nim jest otwarty kalendarz: wtedy Escape
     * zamyka kalendarz, a nie cały wniosek razem ze szkicem.
     */
    closeOnEscape?: boolean;
    /** Okna nad tym oknem (potwierdzenie, odwołanie urlopu). */
    overlays?: ReactNode;
    children: ReactNode;
}

export function LeaveStepModal({
    titleId, title, subtitle, status, steps, current = 0, stepsLabel = 'Kroki', footer, onClose,
    closeOnEscape = true, overlays, children,
}: Props) {
    const active = steps?.[current];
    // Treść przewija się w jednym elemencie przez wszystkie kroki - bez tego nowy krok
    // otwierał się przewinięty tam, gdzie skończył się poprzedni (np. w połowie pola podpisu).
    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        contentRef.current?.scrollTo?.({ top: 0 });
    }, [current]);
    return (
        <>
            {/* dismissible={false}: odruchowe stuknięcie obok okna na telefonie nie może
                wyrzucić podpisanego w połowie wniosku. Krzyżyk i Escape działają. */}
            <ModalShell
                isOpen
                onClose={onClose}
                size="md"
                stableHeight
                dismissible={false}
                closeOnEscape={closeOnEscape}
                labelledBy={titleId}
            >
                <Header>
                    <ModalTitleGroup>
                        <ModalTitle id={titleId}>{title}</ModalTitle>
                        {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
                        {status && <StatusRow>{status}</StatusRow>}
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </Header>

                {steps && steps.length > 1 && active && (
                    <StepsBar>
                        <WideSteps>
                            <StepPills steps={stepStates(steps, current)} label={stepsLabel} />
                        </WideSteps>
                        <NarrowSteps>
                            <span>Krok {current + 1} z {steps.length}: <strong>{active.label}</strong></span>
                            <Progress>
                                {steps.map((s, i) => <Segment key={s.key} $reached={i <= current} />)}
                            </Progress>
                        </NarrowSteps>
                    </StepsBar>
                )}

                <ModalContent ref={contentRef}>{children}</ModalContent>

                {footer && (
                    <ModalFooter>
                        <FooterRow>{footer}</FooterRow>
                    </ModalFooter>
                )}
            </ModalShell>
            {overlays}
        </>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Header = styled(ModalHeader)`
    padding-bottom: 14px;
`;

const StatusRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
`;

const NARROW = '(max-width: 560px)';

const StepsBar = styled.div`
    flex-shrink: 0;
    padding: 12px 28px;
    border-bottom: 1px solid ${ui.lineFaint};

    @media ${NARROW} { padding: 10px 18px; }
`;

const WideSteps = styled.div`
    @media ${NARROW} { display: none; }
`;

const NarrowSteps = styled.div`
    display: none;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    color: ${ui.textMuted};

    strong { font-weight: 700; color: ${ui.ink}; }
    @media ${NARROW} { display: flex; }
`;

const Progress = styled.div`
    display: flex;
    gap: 4px;
`;

/** Odcień marki, nie wypełnienie - pasek postępu nie konkuruje z krokiem następnym. */
const Segment = styled.span<{ $reached: boolean }>`
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: ${p => p.$reached ? ui.brandLine : ui.line};
`;

/** Miejsce na krok następny w stopce; reszta stopki to akcje drugorzędne. */
export const FooterPrimary = styled.div`
    margin-left: auto;
    display: flex;
    justify-content: flex-end;
    min-width: 0;
`;

const FooterRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    /* Na telefonie krok następny dostaje resztę wiersza, „Wstecz" zostaje po lewej. */
    @media ${NARROW} {
        flex-wrap: nowrap;
        > ${FooterPrimary} { flex: 1 1 auto; }
        > ${FooterPrimary} > button { width: 100%; }
    }
`;
