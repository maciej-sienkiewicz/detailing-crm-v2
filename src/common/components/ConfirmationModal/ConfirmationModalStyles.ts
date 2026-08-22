import styled from 'styled-components';
import type { ConfirmationVariant } from './ConfirmationModal';
import { ModalOverlay, ModalBox, ModalFooter } from '@/common/styles';

// ConfirmationModal must always sit above every other modal layer (rbac Overlay = 3000).
export const Overlay = styled(ModalOverlay)`
    z-index: 4000;
`;
export { ModalBox as ModalContainer };
export { ModalFooter as Footer };

/**
 * Nagłówek do lewej, jak w każdym innym oknie aplikacji.
 *
 * Wyśrodkowana kolumna z wielkim kółkiem ikony nad tytułem to język okien
 * systemowych, a nie tej aplikacji: reszta modali ma tytuł przy lewej krawędzi
 * i krzyżyk w prawym górnym rogu. Dwa różne układy okna w jednym produkcie
 * każą czytać każde od nowa.
 */
export const Header = styled.div`
    padding: 24px 28px 18px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    position: relative;

    @media (max-width: 640px) {
        padding: 18px 18px 14px;
    }
`;

export const HeaderText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    /* Miejsce na krzyżyk w rogu — inaczej długi tytuł wchodzi pod niego. */
    padding-right: 28px;
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 20px;
    right: 20px;
    width: 32px;
    height: 32px;
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
    }

    svg { width: 16px; height: 16px; }
`;

const iconPalette: Record<ConfirmationVariant, { bg: string; color: string }> = {
    danger:  { bg: '#fee2e2', color: '#dc2626' },
    warning: { bg: '#fef3c7', color: '#d97706' },
    info:    { bg: '#dbeafe', color: '#3b82f6' },
};

/**
 * Znak wariantu przy tytule, nie nad nim. Kolor niesie tu jedyną informację,
 * jaką ma nieść: czy to pytanie o coś nieodwracalnego, czy zwykłe potwierdzenie.
 */
export const IconContainer = styled.div<{ $variant: ConfirmationVariant }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    background: ${p => iconPalette[p.$variant].bg};
    color: ${p => iconPalette[p.$variant].color};

    svg { width: 18px; height: 18px; stroke-width: 2.25; }
`;

export const Title = styled.h2`
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.1px;
    margin: 0;
    line-height: 1.3;
`;

export const Message = styled.p`
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
`;

const confirmPalette: Record<ConfirmationVariant, { bg: string; hover: string }> = {
    danger:  { bg: '#dc2626', hover: '#b91c1c' },
    warning: { bg: '#d97706', hover: '#b45309' },
    info:    { bg: '#0ea5e9', hover: '#0284c7' },
};

/*
 * Przyciski szerokie na tyle, ile trzeba na napis — nie na pół okna.
 *
 * `flex: 1` rozciągał je na połowę szerokości modala każdy, przez co zwykłe
 * „Anuluj" wyglądało jak akcja główna strony. Wymiary i promienie są teraz te
 * same, co w stopkach pozostałych okien (IconButton / PrimaryButton).
 */
export const CancelButton = styled.button`
    padding: 8px 18px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms ease;

    &:hover {
        background: #f8fafc;
        color: #0f172a;
        border-color: #94a3b8;
    }
`;

export const ConfirmButton = styled.button<{ $variant: ConfirmationVariant }>`
    padding: 8px 18px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #ffffff;
    background: ${p => confirmPalette[p.$variant].bg};
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms ease;

    &:hover { background: ${p => confirmPalette[p.$variant].hover}; }
`;
