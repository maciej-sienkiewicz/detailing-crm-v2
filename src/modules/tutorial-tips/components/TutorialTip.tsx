// src/modules/tutorial-tips/components/TutorialTip.tsx
//
// Chmurka na dole widoku: „Czy chcesz poznać, jak działa ten moduł?" z linkiem do
// instruktażu (animacja na podstronie „Poznaj program") i cichym „Nie pokazuj więcej".
//
//   - wysuwa się od dołu chwilę po wejściu na widok - najpierw użytkownik widzi to,
//     po co przyszedł;
//   - tylko na widokach, do których jest lekcja (tutorialLessons.ts);
//   - „Nie pokazuj więcej" zamyka ją na tym widoku na zawsze, na koncie użytkownika
//     (na każdym urządzeniu). Kliknięcie w instruktaż chowa ją tylko do następnego
//     wejścia na widok;
//   - tylko od tabletu w górę: lekcje pokazują program na dużym ekranie, a na telefonie
//     dół ekranu zajmują dolny pasek i zachęta do powiadomień.
//
// Karta jak zachęta do powiadomień (PushOnboardingPrompt): biel z obwódką marki, bez
// wypełnionego przycisku - stoi nad cudzym widokiem, który ma własny krok następny.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { PlayCircle } from 'lucide-react';
import { ui } from '@/common/components/ui';
import { lessonFor, lessonUrl, type TutorialLesson } from '../tutorialLessons';
import { useDismissedTutorialViews, useDismissTutorialTip } from '../hooks/useTutorialTips';

/** Tyle trwa „najpierw to, po co przyszedł". */
const SHOW_DELAY_MS = 1_500;

export function TutorialTip() {
    const { pathname, search } = useLocation();
    const lesson = lessonFor(pathname, search);
    const { data: dismissed } = useDismissedTutorialViews();

    // Lista zamkniętych jeszcze nie przyszła: lepiej nie pokazać, niż mignąć zamkniętą.
    if (!lesson || !dismissed || dismissed.includes(lesson.view)) return null;
    // Klucz widoku: wejście na inny widok to nowa chmurka z nowym opóźnieniem.
    return <Tip key={lesson.view} lesson={lesson} />;
}

function Tip({ lesson }: { lesson: TutorialLesson }) {
    const dismiss = useDismissTutorialTip();
    const [visible, setVisible] = useState(false);
    const [opened, setOpened] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    if (!visible || opened) return null;
    return (
        <Card role="region" aria-label="Instruktaż do tego modułu">
            <Main href={lessonUrl(lesson)} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>
                <Tile><PlayCircle /></Tile>
                <Copy>
                    <Title>Czy chcesz poznać, jak działa ten moduł?</Title>
                    <Text>Kliknij, żeby zobaczyć instruktaż.</Text>
                </Copy>
            </Main>
            <Never type="button" onClick={() => dismiss.mutate(lesson.view)}>
                Nie pokazuj więcej
            </Never>
        </Card>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(calc(100% + 24px)); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Card = styled.div`
    position: fixed;
    right: 28px;
    bottom: 28px;
    /* Nad treścią i dolnym paskiem (97), pod oknami (1000) - jak zachęta do powiadomień. */
    z-index: 98;
    width: min(360px, calc(100vw - 56px));
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    border-radius: ${ui.radiusPanel};
    border: 1px solid ${ui.brandLine};
    background: ${ui.surface};
    box-shadow: ${ui.shadowMenu};
    animation: ${slideUp} 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

    @media (max-width: ${props => props.theme.breakpoints.md}) { display: none; }
    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Main = styled.a`
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 12px;
    text-decoration: none;
    color: inherit;
    transition: background-color 150ms ease;

    &:hover { background: ${ui.brandTint}; }
    &:focus-visible { outline: 2px solid ${ui.brandInk}; outline-offset: 1px; }
`;

const Tile = styled.span`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
    color: ${ui.brandInk};

    svg { width: 20px; height: 20px; }
`;

const Copy = styled.span`
    min-width: 0;
`;

const Title = styled.span`
    display: block;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
    color: ${ui.ink};
`;

const Text = styled.span`
    display: block;
    margin-top: 2px;
    font-size: 13px;
    line-height: 1.4;
    color: ${ui.brandInk};
`;

/** Delikatny: tekst bez tła i obwódki, pod kartą, nie konkuruje z instruktażem. */
const Never = styled.button`
    align-self: flex-end;
    margin: 0 6px 4px;
    padding: 4px 6px;
    border: 0;
    border-radius: 6px;
    background: none;
    font: inherit;
    font-size: 12px;
    color: ${ui.textMuted};
    cursor: pointer;

    &:hover { color: ${ui.inkSoft}; text-decoration: underline; }
    &:focus-visible { outline: 2px solid ${ui.brandInk}; outline-offset: 1px; }
`;
