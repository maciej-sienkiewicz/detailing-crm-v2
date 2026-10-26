// src/modules/tutorial-tips/components/TutorialLessonModal.tsx
//
// Okno z instruktażem otwierane z chmurki: animacja lekcji z odtwarzaczem strony
// „Poznaj program" (przyciski, tempo, rozdziały), bez wychodzenia z programu.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { ui } from '@/common/components/ui';
import { chaptersLabel, formatDuration, lessonFrameSrc, type TutorialLesson } from '../tutorialLessons';

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
    lesson: TutorialLesson;
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialLessonModal = ({ lesson, isOpen, onClose }: TutorialLessonModalProps) => (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="1120px" labelledBy="tutorial-lesson-title">
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle id="tutorial-lesson-title">{lesson.title}</ModalTitle>
                <ModalSubtitle>
                    Instruktaż · {lesson.module} · {formatDuration(lesson.seconds)}, {chaptersLabel(lesson.chapters)}
                </ModalSubtitle>
            </ModalTitleGroup>
            <CloseBtn onClick={onClose} />
        </ModalHeader>
        <ModalContent>
            <Stage>
                <LessonFrame lesson={lesson} />
            </Stage>
        </ModalContent>
    </ModalShell>
);
