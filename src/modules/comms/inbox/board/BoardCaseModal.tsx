// src/modules/comms/inbox/board/BoardCaseModal.tsx
// Sprawa otwarta z tablicy - ten sam widok sprawy co w liście (CaseDetail: rozmowa,
// wycena, odpowiedź), tylko w oknie nad tablicą.
//
// Okno wyrasta z klikniętej karty i do niej wraca, jak okno w macOS z ikony w Docku:
// tablica zostaje pod spodem, więc wzrok musi wiedzieć, SKĄD przyszło okno i DOKĄD
// wróci sprawa. Treść pojawia się z lekkim opóźnieniem - w pierwszych klatkach okno
// ma proporcje karty i rozciągnięty tekst wyglądałby jak błąd, a nie jak ruch.
//
// Na telefonie okno jest arkuszem na cały ekran wysuwanym od dołu (jak w iOS):
// karta ma tam szerokość ekranu, więc „wyrastanie" z niej byłoby tylko zjazdem w górę.
//
// Blokada przewijania, Escape i chowanie dolnej nawigacji - useModalViewport (CLAUDE.md §3).
import { useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/common/hooks';
import { useModalViewport } from '@/common/hooks/useModalViewport';
import { CaseDetail } from '../CaseDetail';
import { IconBtn } from '../primitives';
import { ix } from '../tokens';
import { DURATION, EASE_OUT, EASE_SPRING, prefersReducedMotion } from './motion';

/**
 * Panel sprawy obok rozmowy: rozmowa 460 + panel 300 + oddech, plus marginesy okna (2 × 32).
 * Z szerokości ekranu, nie z pomiaru panelu - panel w chwili otwarcia ma jeszcze rozmiar
 * karty, a układ przełączany w trakcie animacji przeskakuje.
 */
const RAIL_BESIDE_QUERY = '(min-width: 864px)';

const Overlay = styled.div<{ $phone: boolean }>`
    position: fixed;
    inset: 0;
    /* Jak rozmowa na telefonie (InboxPage): nad aplikacją, pod oknami otwieranymi ze sprawy. */
    z-index: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${p => (p.$phone ? 0 : '32px')};
    font-family: ${ix.font};
    color: ${ix.ink};
    line-height: normal;
    -webkit-font-smoothing: antialiased;
`;

const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.32);
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
`;

const Panel = styled.div<{ $phone: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
    transform-origin: 0 0;
    will-change: transform;
    ${p => (p.$phone
        ? css`
            width: 100%;
            height: 100%;
            padding-bottom: env(safe-area-inset-bottom, 0px);
        `
        : css`
            width: min(1240px, 100%);
            height: min(880px, 100%);
            border-radius: 20px;
            box-shadow:
                0 0 0 1px rgba(15, 23, 42, 0.06),
                0 24px 64px -12px rgba(15, 23, 42, 0.38),
                0 8px 20px -8px rgba(15, 23, 42, 0.18);
        `)}
`;

const Content = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
`;

interface BoardCaseModalProps {
    leadId: string;
    phone: boolean;
    /** Karta, z której okno wyrasta; null - otwarcie z adresu (odświeżenie, link). */
    origin: DOMRect | null;
    /** Gdzie karta stoi TERAZ - mogła przejść do innej kolumny, gdy okno było otwarte. */
    findCard: (leadId: string) => HTMLElement | null;
    onClose: () => void;
}

/** Transformacja, która kładzie panel dokładnie na prostokącie karty. */
const onto = (target: DOMRect, panel: DOMRect): string =>
    `translate(${target.left - panel.left}px, ${target.top - panel.top}px) scale(${target.width / panel.width}, ${target.height / panel.height})`;

export function BoardCaseModal({ leadId, phone, origin, findCard, onClose }: BoardCaseModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const wide = useMediaQuery(RAIL_BESIDE_QUERY);
    const contentRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);

    // ── Wejście ───────────────────────────────────────────────────────────────
    useLayoutEffect(() => {
        const panel = panelRef.current;
        const backdrop = backdropRef.current;
        const content = contentRef.current;
        if (!panel || !backdrop || !content) return;
        const reduce = prefersReducedMotion();
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 360, easing: 'ease-out' });
        if (reduce) {
            panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
            return;
        }
        if (phone) {
            panel.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: DURATION.open, easing: EASE_SPRING });
            return;
        }
        const from = origin
            ? [{ transform: onto(origin, panel.getBoundingClientRect()), borderRadius: '14px' }]
            : [{ transform: 'translateY(12px) scale(0.96)', opacity: 0 }];
        panel.animate([...from, { transform: 'none', borderRadius: '20px', opacity: 1 }], { duration: DURATION.open, easing: EASE_SPRING });
        content.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 150, easing: 'ease-out', fill: 'backwards' });
        // Tylko przy otwarciu - kolejne rendery (nowa wiadomość, zmiana kolumny) nie animują okna.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Wyjście: do karty, jeśli wciąż jest na tablicy ────────────────────────
    const requestClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        const panel = panelRef.current;
        const backdrop = backdropRef.current;
        const content = contentRef.current;
        if (!panel || !backdrop || !content || prefersReducedMotion()) {
            onClose();
            return;
        }
        const card = phone ? null : findCard(leadId);
        const target = card?.getBoundingClientRect();
        const to = phone
            ? { transform: 'translateY(100%)' }
            : target && target.width > 0
              ? { transform: onto(target, panel.getBoundingClientRect()), borderRadius: '14px' }
              : { transform: 'translateY(8px) scale(0.96)', opacity: 0 };
        content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
        backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURATION.close, easing: EASE_OUT, fill: 'forwards' });
        const animation = panel.animate([{ transform: 'none', borderRadius: '20px' }, to], {
            duration: DURATION.close,
            easing: EASE_OUT,
            fill: 'forwards',
        });
        animation.onfinish = onClose;
        animation.oncancel = onClose;
    }, [findCard, leadId, onClose, panelRef, phone]);

    useModalViewport(true, overlayRef, requestClose);

    const closeButton = (
        <IconBtn aria-label="Zamknij lead i wróć do tablicy" onClick={requestClose}>
            <X />
        </IconBtn>
    );

    return createPortal(
        <Overlay ref={overlayRef} $phone={phone} role="dialog" aria-modal="true" aria-labelledby="case-title">
            <Backdrop ref={backdropRef} onClick={requestClose} />
            <Panel ref={panelRef} $phone={phone}>
                <Content ref={contentRef}>
                    <CaseDetail
                        leadId={leadId}
                        phone={phone}
                        railBeside={!phone && wide}
                        onBack={phone ? requestClose : undefined}
                        headerAction={phone ? undefined : closeButton}
                        // Usunięta sprawa nie ma już karty, do której okno mogłoby wrócić.
                        onClosed={onClose}
                    />
                </Content>
            </Panel>
        </Overlay>,
        document.body
    );
}
