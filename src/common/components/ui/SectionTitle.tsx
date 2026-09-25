// src/common/components/ui/SectionTitle.tsx
//
// Nagłówek sekcji: 15px, grubość 700, a liczba obok w szarości. Zastępuje sześć
// stylów nagłówków widoku wizyty i etykiety 11px wersalikami, które były
// jedyną ramą sekcji (CLAUDE.md §2 - wycofane).

import type { HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from './tokens';

const Heading = styled.h2<{ $size: 'md' | 'lg' }>`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 8px;
    min-width: 0;
    margin: 0;
    font-size: ${p => p.$size === 'lg' ? '17px' : '15px'};
    font-weight: 700;
    letter-spacing: -0.005em;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Count = styled.span`
    font-size: 13px;
    font-weight: 500;
    color: ${ui.textMuted};
`;

interface Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'style'> {
    children: ReactNode;
    /** Liczba albo krótkie doprecyzowanie: „8 zdjęć, 1 PDF", „3 usługi". */
    count?: ReactNode;
    size?: 'md' | 'lg';
    as?: 'h2' | 'h3' | 'span';
}

export function SectionTitle({ children, count, size = 'md', as = 'h2', ...rest }: Props) {
    return (
        <Heading as={as} $size={size} {...rest}>
            {children}
            {count !== undefined && count !== null && count !== '' && <Count>{count}</Count>}
        </Heading>
    );
}
