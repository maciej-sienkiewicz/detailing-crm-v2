/**
 * Modal primitives — canonical design system
 *
 * Every modal in the app imports from here (via @/common/components/ModalKit).
 * Do not define local Overlay / ModalBox / Header / Footer / CloseButton — use these.
 */
import styled, { keyframes } from 'styled-components';

// ─── Animations ───────────────────────────────────────────────────────────────

export const overlayFadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

export const modalScaleIn = keyframes`
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
`;

// ─── Overlay ──────────────────────────────────────────────────────────────────

/**
 * The overlay owns the available space; the box only fills it.
 *
 * `inset: 0` on a fixed element resolves against the LARGE viewport on mobile
 * Safari — i.e. the height the page would have if the address bar were hidden.
 * With the bar visible, the bottom of the overlay (and the centred box inside
 * it) sits underneath browser chrome, which is exactly why modal footers used
 * to be unreachable on a phone. `100dvh` tracks the viewport that is actually
 * visible right now, so the footer always lands on screen.
 */
export const ModalOverlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding:
        max(20px, env(safe-area-inset-top, 0px))
        max(20px, env(safe-area-inset-right, 0px))
        max(20px, env(safe-area-inset-bottom, 0px))
        max(20px, env(safe-area-inset-left, 0px));
    background: ${p => p.$isOpen ? 'rgba(15, 23, 42, 0.48)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${p => p.$isOpen ? 'blur(6px)' : 'none'};
    opacity: ${p => p.$isOpen ? 1 : 0};
    pointer-events: ${p => p.$isOpen ? 'auto' : 'none'};
    transition: background 300ms ease, backdrop-filter 300ms ease, opacity 300ms ease;
    animation: ${p => p.$isOpen ? overlayFadeIn : 'none'} 250ms ease-out;

    @media (max-width: 640px) {
        padding:
            max(12px, env(safe-area-inset-top, 0px))
            max(12px, env(safe-area-inset-right, 0px))
            max(12px, env(safe-area-inset-bottom, 0px))
            max(12px, env(safe-area-inset-left, 0px));
    }

    /* Landscape phone: vertical space is the scarce resource, reclaim it. */
    @media (max-height: 480px) {
        padding-top: max(8px, env(safe-area-inset-top, 0px));
        padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    }
`;

// ─── Modal box ────────────────────────────────────────────────────────────────

export const ModalBox = styled.div<{ $isOpen: boolean; $maxWidth?: string }>`
    background: #ffffff;
    border-radius: 24px;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 4px 8px -2px rgba(0, 0, 0, 0.06),
        0 16px 40px -8px rgba(0, 0, 0, 0.16);
    width: 100%;
    max-width: ${p => p.$maxWidth ?? '520px'};
    /* 100% of the overlay's content box — i.e. viewport minus padding and safe
       areas. Header and footer are flex-shrink:0, so whatever is left goes to
       ModalContent, which scrolls. The footer can never be pushed off-screen. */
    max-height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${p => p.$isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)'};
    opacity: ${p => p.$isOpen ? 1 : 0};
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease;
    animation: ${p => p.$isOpen ? modalScaleIn : 'none'} 300ms cubic-bezier(0.32, 0.72, 0, 1);

    @media (max-width: 640px) {
        border-radius: 18px;
    }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const ModalHeader = styled.div`
    padding: 28px 28px 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    border-bottom: 1px solid #f1f5f9;

    @media (max-width: 640px) {
        padding: 18px 18px 14px;
    }

    @media (max-height: 480px) {
        padding-top: 14px;
        padding-bottom: 10px;
    }
`;

export const ModalTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
`;

export const ModalTitle = styled.h2`
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
    line-height: 1.2;
    /* Titles are sometimes file names — break them rather than blow out the box. */
    overflow-wrap: anywhere;

    @media (max-width: 640px) {
        font-size: 18px;
    }
`;

export const ModalSubtitle = styled.p`
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #64748b;
    font-weight: 400;
    line-height: 1.5;
`;

export const ModalCloseButton = styled.button`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    cursor: pointer;
    color: #64748b;
    transition: all 150ms ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
        border-color: #cbd5e1;
    }

    svg { width: 16px; height: 16px; }
`;

// ─── Section heading inside modal content ─────────────────────────────────────

export const ModalSectionTitle = styled.p`
    margin: 0 0 12px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
`;

// ─── Scrollable content ───────────────────────────────────────────────────────

export const ModalContent = styled.div`
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* Scrolling inside the modal must not chain to the page behind it. */
    overscroll-behavior: contain;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 0;

    @media (max-width: 640px) {
        padding: 18px;
        gap: 16px;
    }

    @media (max-height: 480px) {
        padding-top: 12px;
        padding-bottom: 12px;
    }

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

// ─── Footer — always visible above scrollable content ─────────────────────────

export const ModalFooter = styled.div`
    padding: 16px 28px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfd;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
    flex-wrap: wrap;

    @media (max-width: 640px) {
        padding: 12px 18px;
        gap: 8px;

        /* Polish action labels are long ("Zatwierdź i wydaj pojazd"); let them
           wrap inside the pill rather than spill past the modal edge. */
        button { white-space: normal; }

        /* Share the row when they fit, fill the row when they wrap — so a
           stacked footer never leaves a stray half-width pill floating right. */
        > button { flex: 1 1 auto; min-width: 0; }
    }

    @media (max-height: 480px) {
        padding-top: 10px;
        padding-bottom: 10px;
    }
`;

// ─── Horizontal divider inside content ────────────────────────────────────────

export const ModalDivider = styled.div`
    height: 1px;
    background: #f1f5f9;
    margin: 4px 0;
`;

/** @deprecated Use ModalDivider */
export { ModalDivider as ModalSectionDivider };
