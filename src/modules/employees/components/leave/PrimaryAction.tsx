// src/modules/employees/components/leave/PrimaryAction.tsx
//
// Krok następny w oknie wniosku urlopowego - JEDYNY wypełniony element (CLAUDE.md §2).
// Dwie linie: co się stanie i dokąd to prowadzi („Złóż wniosek o urlop / trafi do
// akceptacji"), kafelek ikony, gradient i cień marki, strzałka reagująca na kursor -
// tak, żeby nie dało się go pomylić z „Zapisz". Wzorzec: FooterPrimary w LeadDetailModal.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { ui } from '@/common/components/ui';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
    icon: ReactNode;
    title: ReactNode;
    /** Druga linia: dokąd to prowadzi. */
    sub?: ReactNode;
    block?: boolean;
}

export const PrimaryAction = forwardRef<HTMLButtonElement, Props>(
    ({ icon, title, sub, block, type = 'button', ...rest }, ref) => (
        <Btn ref={ref} type={type} $block={block} data-variant="primary" {...rest}>
            <span className="glyph" aria-hidden="true">{icon}</span>
            <span className="labels">
                <span className="title">{title}</span>
                {sub && <span className="sub">{sub}</span>}
            </span>
            <ArrowRight className="arrow" aria-hidden="true" />
        </Btn>
    ),
);
PrimaryAction.displayName = 'PrimaryAction';

const Btn = styled.button<{ $block?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 11px;
    ${p => p.$block ? 'width: 100%;' : ''}
    min-height: 54px;
    padding: 8px 16px 8px 12px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, ${ui.brandStrong} 0%, ${ui.brandDeep} 100%);
    color: #ffffff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.16),
        0 12px 24px -12px rgba(3, 105, 161, 0.75);
    transition: transform 150ms ease, box-shadow 150ms ease;
    -webkit-tap-highlight-color: transparent;

    .glyph {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 34px;
        height: 34px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.18);

        svg { width: 17px; height: 17px; }
    }

    .labels { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .title { font-size: 14.5px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
    .sub { font-size: 11.5px; font-weight: 500; line-height: 1.2; color: rgba(255, 255, 255, 0.78); }

    .arrow {
        margin-left: auto;
        flex-shrink: 0;
        width: 17px;
        height: 17px;
        opacity: 0.8;
        transition: transform 200ms ease;
    }

    &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow:
            0 2px 4px rgba(15, 23, 42, 0.18),
            0 18px 32px -14px rgba(3, 105, 161, 0.8);
    }
    &:hover:not(:disabled) .arrow { transform: translateX(3px); }
    &:active:not(:disabled) { transform: translateY(0); }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 3px; }
    &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    /* Wąski telefon w stopce obok „Wstecz": strzałka oddaje miejsce tytułowi, żeby
       „Podpisz i wyślij wniosek" nie łamał się na dwie linie. */
    @media (max-width: 420px) {
        gap: 9px;
        padding-right: 12px;
        .arrow { display: none; }
        .title { font-size: 14px; }
    }
`;
