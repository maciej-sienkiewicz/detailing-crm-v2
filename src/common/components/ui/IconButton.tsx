// src/common/components/ui/IconButton.tsx
//
// Przycisk z samą ikoną. Etykieta jest OBOWIĄZKOWA: trafia do aria-label i do
// dymka - ikona bez podpisu to zagadka dla czytnika ekranu i dla nowej osoby
// w studiu.
//
// Menu wiersza (⋮) stoi zawsze widoczne, nie dopiero po najechaniu: niewidoczne
// ⋮ było powodem zgłoszenia „nie da się edytować cen" w zleceniach zbiorczych.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { ButtonBase, type ButtonSize, type ButtonVariant } from './Button';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Co robi przycisk - „Więcej akcji: Audi A6", „Zamknij". */
    label: string;
    children: ReactNode;
    variant?: Extract<ButtonVariant, 'outline' | 'ghost' | 'onDark' | 'tinted' | 'danger'>;
    size?: ButtonSize;
    /** `square` - zaokrąglony kwadrat dla menu wiersza w tabeli; reszta to koło. */
    shape?: 'round' | 'square';
    /** Stan „otwarte" (menu rozwinięte) - obwódka jak po najechaniu. */
    active?: boolean;
}

const Square = styled(ButtonBase)<{ $square?: boolean; $active?: boolean }>`
    ${p => p.$square && css`border-radius: 10px;`}
    ${p => p.$active && css`border-color: #94a3b8; background: #f1f5f9;`}
`;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ label, children, variant = 'outline', size = 'md', shape = 'round', active, type = 'button', title, ...rest }, ref) => (
        <Square
            ref={ref}
            type={type}
            aria-label={label}
            title={title ?? label}
            $variant={variant}
            $size={size}
            $iconOnly
            $square={shape === 'square'}
            $active={active}
            {...rest}
        >
            {children}
        </Square>
    ),
);
IconButton.displayName = 'IconButton';
