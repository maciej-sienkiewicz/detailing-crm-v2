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

export const ModalOverlay = styled.div<{ $isOpen: boolean; $contentLeft?: number }>`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: ${p => p.$isOpen ? 'rgba(15, 23, 42, 0.48)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${p => p.$isOpen ? 'blur(6px)' : 'none'};
    opacity: ${p => p.$isOpen ? 1 : 0};
    pointer-events: ${p => p.$isOpen ? 'auto' : 'none'};
    transition: background 300ms ease, backdrop-filter 300ms ease, opacity 300ms ease;
    animation: ${p => p.$isOpen ? overlayFadeIn : 'none'} 250ms ease-out;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        left: ${p => (p.$contentLeft ?? 0)}px;
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
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${p => p.$isOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)'};
    opacity: ${p => p.$isOpen ? 1 : 0};
    transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease;
    animation: ${p => p.$isOpen ? modalScaleIn : 'none'} 300ms cubic-bezier(0.32, 0.72, 0, 1);
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
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 0;

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
`;

// ─── Horizontal divider inside content ────────────────────────────────────────

export const ModalDivider = styled.div`
    height: 1px;
    background: #f1f5f9;
    margin: 4px 0;
`;

/** @deprecated Use ModalDivider */
export { ModalDivider as ModalSectionDivider };
