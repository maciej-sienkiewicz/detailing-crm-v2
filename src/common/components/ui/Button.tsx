// src/common/components/ui/Button.tsx
//
// Jeden przycisk dla widoku wizyty i zleceń zbiorczych.
//
// Zanim powstał, sama karta wizyty miała ~18 odmian przycisków: pastylki 6px
// i 9px, prostokąty z promieniem 6px, wypełnione sky, wypełnione #3B82F6,
// wypełnione zielone. Cztery z nich były wypełnione na stałe w jednym oknie,
// więc nic nie wygrywało (CLAUDE.md §2).
//
// Warianty to PRIORYTET, nie dekoracja:
//   primary / success  - jedyne wypełnienie w oknie (krok następny); zielony
//                         wyłącznie dla kroków domykających („Oznacz jako gotowe")
//   tinted / tintedSuccess - główna akcja SEKCJI: odcień jako tło i obwódka
//   outline            - akcje drugorzędne
//   ghost / danger     - w wierszach i obok treści, bez obwódki
//   onDark             - tylko w ciemnym nagłówku strony
//
// Metryka jest jedna: pigułka, 13-14px, grubość 600, 30 / 36 / 40px,
// a pod palcem każdy rozmiar rośnie do 44px.

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';
import { buttonStyles, type ButtonSize, type ButtonStyleProps, type ButtonVariant } from './buttonStyles';

export type { ButtonSize, ButtonStyleProps, ButtonVariant } from './buttonStyles';

const Base = styled.button<ButtonStyleProps>`${buttonStyles}`;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Na całą szerokość rodzica (panel boczny, telefon). */
    block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'outline', size = 'md', block, type = 'button', ...rest }, ref) => (
        <Base ref={ref} type={type} $variant={variant} $size={size} $block={block} {...rest} />
    ),
);
Button.displayName = 'Button';

/** `<label>` wyglądający jak Button - dla wyboru pliku bez przycisku-pośrednika. */
export const ButtonLabel = styled.label<ButtonStyleProps>`
    ${buttonStyles}
    input[type='file'] { display: none; }
`;

/** `<a>` wyglądający jak Button - tel:, mailto:, pobranie pliku. */
export const ButtonLink = styled.a<ButtonStyleProps>`
    ${buttonStyles}
`;

export const ButtonBase = Base;
