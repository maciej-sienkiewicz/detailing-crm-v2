// src/modules/tutorial-tips/components/TutorialTip.tsx
//
// Chmurka na dole widoku z instruktażem do tego modułu: plakat lekcji z długością,
// jej tytuł i liczba rozdziałów, „Obejrzyj" i ciche „Nie pokazuj więcej".
//
//   - wysuwa się od dołu chwilę po wejściu na widok - najpierw użytkownik widzi to,
//     po co przyszedł;
//   - tylko na widokach, do których jest lekcja (tutorialLessons.ts);
//   - kliknięcie w plakat albo „Obejrzyj" otwiera animację w oknie, w programie;
//   - „Nie pokazuj więcej" zamyka ją na tym widoku na zawsze, na koncie użytkownika
//     (na każdym urządzeniu). Krzyżyk i obejrzenie chowają ją tylko do następnego
//     wejścia na widok;
//   - tylko od tabletu w górę: lekcje pokazują program na dużym ekranie, a na telefonie
//     dół ekranu zajmują dolny pasek i zachęta do powiadomień.
//
// Bez wypełnionego przycisku (CLAUDE.md §2) - karta stoi nad cudzym widokiem, który ma
// własny krok następny; „Obejrzyj" jest odcieniem marki.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Play, X } from 'lucide-react';
import { Button, ui } from '@/common/components/ui';
import {
    chaptersLabel, formatDuration, lessonFor, lessonPosterSrc, type TutorialLesson,
} from '../tutorialLessons';
import { useDismissedTutorialViews, useDismissTutorialTip } from '../hooks/useTutorialTips';
import { TutorialLessonModal } from './TutorialLessonModal';

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

type TipState = 'waiting' | 'card' | 'watching' | 'closed';

function Tip({ lesson }: { lesson: TutorialLesson }) {
    const dismiss = useDismissTutorialTip();
    const [state, setState] = useState<TipState>('waiting');

    useEffect(() => {
        const timer = window.setTimeout(() => setState(s => (s === 'waiting' ? 'card' : s)), SHOW_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    const watch = () => setState('watching');
    const meta = `Animacja, ${chaptersLabel(lesson.chapters)}`;

    return (
        <>
            {state === 'card' && (
                <Card role="region" aria-label="Instruktaż do tego modułu">
                    <Close type="button" aria-label="Zamknij" onClick={() => setState('closed')}><X /></Close>
                    <Row type="button" onClick={watch}>
                        <Thumb style={{ backgroundImage: `url(${lessonPosterSrc(lesson)})` }}>
                            <PlayBadge><Play /></PlayBadge>
                            <Duration>{formatDuration(lesson.seconds)}</Duration>
                        </Thumb>
                        <Copy>
                            <Eyebrow>Instruktaż · {lesson.module}</Eyebrow>
                            <Title>{lesson.title}</Title>
                            <Meta>{meta}</Meta>
                        </Copy>
                    </Row>
                    <Foot>
                        <Never type="button" onClick={() => dismiss.mutate(lesson.view)}>
                            Nie pokazuj więcej
                        </Never>
                        <Button variant="tinted" size="sm" onClick={watch}>
                            <Play />Obejrzyj
                        </Button>
                    </Foot>
                </Card>
            )}
            <TutorialLessonModal lesson={lesson} isOpen={state === 'watching'} onClose={() => setState('closed')} />
        </>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(calc(100% + 32px)); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Card = styled.div`
    position: fixed;
    right: 28px;
    bottom: 28px;
    /* Nad treścią i dolnym paskiem (97), pod oknami (1000) - jak zachęta do powiadomień. */
    z-index: 98;
    width: min(392px, calc(100vw - 56px));
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: ${ui.radiusPanel};
    border: 1px solid ${ui.line};
    background: ${ui.surface};
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.14);
    animation: ${slideUp} 520ms cubic-bezier(0.16, 1, 0.3, 1) both;

    @media (max-width: ${props => props.theme.breakpoints.md}) { display: none; }
    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Close = styled.button`
    position: absolute;
    top: 10px;
    right: 10px;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: ${ui.textFaint};
    cursor: pointer;

    svg { width: 15px; height: 15px; }
    &:hover { background: ${ui.surfaceAlt}; color: ${ui.inkSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const Row = styled.button`
    display: grid;
    grid-template-columns: 132px 1fr;
    gap: 14px;
    align-items: center;
    padding: 0 22px 0 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 4px; border-radius: 10px; }
`;

const Thumb = styled.span`
    position: relative;
    display: block;
    width: 132px;
    height: 82px;
    border-radius: 10px;
    overflow: hidden;
    background: ${ui.ink} center / cover no-repeat;
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.45));
    }
`;

const PlayBadge = styled.span`
    position: absolute;
    z-index: 1;
    left: 50%;
    top: 50%;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.94);
    color: ${ui.brandInk};
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
    transition: transform 150ms ease;

    svg { width: 14px; height: 14px; margin-left: 2px; fill: currentColor; }
    ${Row}:hover & { transform: scale(1.08); }
`;

const Duration = styled.span`
    position: absolute;
    z-index: 1;
    right: 6px;
    bottom: 6px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(15, 23, 42, 0.72);
    font-size: 11px;
    font-weight: 600;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
`;

const Copy = styled.span`
    min-width: 0;
`;

const Eyebrow = styled.span`
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${ui.brandInk};
`;

const Title = styled.span`
    display: block;
    margin-top: 4px;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.3;
    color: ${ui.ink};
    transition: color 150ms ease;

    ${Row}:hover & { color: ${ui.brandInk}; }
`;

const Meta = styled.span`
    display: block;
    margin-top: 4px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Foot = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid ${ui.surfaceAlt};
`;

/** Delikatny: tekst bez tła i obwódki, nie konkuruje z „Obejrzyj". */
const Never = styled.button`
    padding: 4px 6px;
    margin-left: -6px;
    border: 0;
    border-radius: 6px;
    background: none;
    font: inherit;
    font-size: 12.5px;
    color: ${ui.textMuted};
    cursor: pointer;

    &:hover { color: ${ui.inkSoft}; text-decoration: underline; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;
