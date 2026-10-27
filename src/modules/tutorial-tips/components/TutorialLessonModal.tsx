// src/modules/tutorial-tips/components/TutorialLessonModal.tsx
//
// Okno z instruktażem otwierane z chmurki: lekcje modułu po lewej, po prawej animacja
// wybranej z odtwarzaczem strony „Poznaj program" (przyciski, tempo, rozdziały), bez
// wychodzenia z programu. Moduł z jedną lekcją dostaje sam odtwarzacz.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { ui } from '@/common/components/ui';
import {
    chaptersLabel, formatDuration, lessonFrameSrc, lessonsLabel, type TutorialLesson, type TutorialModule,
} from '../tutorialLessons';

const Layout = styled.div`
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 24px;
    align-items: start;

    @media (max-width: 760px) { grid-template-columns: 1fr; gap: 16px; }
`;

const LessonList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const LessonItem = styled.button<{ $active: boolean }>`
    width: 100%;
    display: grid;
    gap: 2px;
    padding: 10px 14px;
    border: 1px solid ${p => (p.$active ? ui.brandLine : 'transparent')};
    border-radius: 10px;
    background: ${p => (p.$active ? ui.brandTint : 'transparent')};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;

    &:hover { background: ${p => (p.$active ? ui.brandTint : ui.surfaceAlt)}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

const LessonName = styled.span<{ $active: boolean }>`
    font-size: 14px;
    font-weight: ${p => (p.$active ? 600 : 500)};
    line-height: 1.35;
    color: ${p => (p.$active ? ui.brandDeep : ui.inkSoft)};
`;

const LessonMeta = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Stage = styled.div`
    overflow: hidden;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: #ffffff;
`;

const Frame = styled.iframe`
    display: block;
    width: 100%;
    border: 0;
`;

/**
 * Ramka z tej samej domeny: wysokość mierzymy z treści (okno nie przewija się w dwóch
 * miejscach), a odtwarzanie startuje samo - kliknięcie „Obejrzyj" było prośbą o film.
 * Kto ma w systemie ograniczony ruch, dostaje pierwszą klatkę i sam naciska „Odtwórz".
 */
const LessonFrame = ({ lesson }: { lesson: TutorialLesson }) => {
    const ref = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState<number>();

    useEffect(() => {
        const frame = ref.current;
        if (!frame) return;
        let observer: ResizeObserver | undefined;
        const attach = () => {
            const doc = frame.contentDocument;
            if (!doc?.body) return;
            observer?.disconnect();
            const measure = () => setHeight(Math.ceil(doc.documentElement.scrollHeight));
            observer = new ResizeObserver(measure);
            observer.observe(doc.body);
            measure();

            const reduced = frame.contentWindow?.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reduced) doc.getElementById('bPlay')?.click();
        };
        frame.addEventListener('load', attach);
        if (frame.contentDocument?.readyState === 'complete') attach();
        return () => {
            frame.removeEventListener('load', attach);
            observer?.disconnect();
        };
    }, []);

    return (
        <Frame
            ref={ref}
            src={lessonFrameSrc(lesson)}
            title={`Animacja: ${lesson.title}`}
            // Do pierwszego pomiaru proporcje sceny, żeby okno nie skakało.
            style={height ? { height } : { aspectRatio: '16 / 9' }}
        />
    );
};

interface TutorialLessonModalProps {
    tutorial: TutorialModule;
    isOpen: boolean;
    onClose: () => void;
}

const lessonMeta = (lesson: TutorialLesson) => `${formatDuration(lesson.seconds)}, ${chaptersLabel(lesson.chapters)}`;

export const TutorialLessonModal = ({ tutorial, isOpen, onClose }: TutorialLessonModalProps) => {
    const [slug, setSlug] = useState(tutorial.lessons[0].slug);
    const current = tutorial.lessons.find(l => l.slug === slug) ?? tutorial.lessons[0];
    const many = tutorial.lessons.length > 1;
    // key: nowa lekcja zaczyna od początku i mierzy się od nowa.
    const stage = <Stage><LessonFrame key={current.slug} lesson={current} /></Stage>;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="1120px" labelledBy="tutorial-lesson-title">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id="tutorial-lesson-title">{many ? `Instruktaż: ${tutorial.module}` : current.title}</ModalTitle>
                    <ModalSubtitle>
                        {many
                            ? `${lessonsLabel(tutorial.lessons.length)} o tym module. Wybierz, od której zacząć.`
                            : `Instruktaż: ${tutorial.module}, ${lessonMeta(current)}`}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {many ? (
                    <Layout>
                        <LessonList aria-label="Lekcje">
                            {tutorial.lessons.map(l => (
                                <li key={l.slug}>
                                    <LessonItem
                                        type="button"
                                        $active={l.slug === current.slug}
                                        aria-pressed={l.slug === current.slug}
                                        onClick={() => setSlug(l.slug)}
                                    >
                                        <LessonName $active={l.slug === current.slug}>{l.title}</LessonName>
                                        <LessonMeta>{lessonMeta(l)}</LessonMeta>
                                    </LessonItem>
                                </li>
                            ))}
                        </LessonList>
                        {stage}
                    </Layout>
                ) : stage}
            </ModalContent>
        </ModalShell>
    );
};
