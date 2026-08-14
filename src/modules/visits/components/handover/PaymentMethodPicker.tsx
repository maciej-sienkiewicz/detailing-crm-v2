import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Pill, PillRow } from './HandoverKit';
import { primaryPaymentMethods, secondaryPaymentMethods } from './paymentOptions';
import type { PaymentMethod } from '../../types/stateTransitions';

const Wrapper = styled.div`
    position: relative;
    display: inline-flex;
`;

const Menu = styled.div`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    min-width: 190px;
    display: flex;
    flex-direction: column;
    padding: 4px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
`;

const MenuItem = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: none;
    background: ${p => (p.$selected ? st.accentBlueDim : 'transparent')};
    color: ${p => (p.$selected ? st.accentBlue : st.text)};
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$selected ? 600 : 500)};
    text-align: left;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;

    &:hover { background: ${st.accentBlueDim}; color: ${st.accentBlue}; }
    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

interface PaymentMethodPickerProps {
    value: PaymentMethod;
    onChange: (method: PaymentMethod) => void;
}

/**
 * Wybór formy zapłaty: karta i gotówka zawsze na wierzchu, reszta pod jednym
 * rozwijanym przyciskiem.
 *
 * Pięć równorzędnych pigułek zmuszało do czytania wszystkich za każdym razem,
 * choć w praktyce niemal zawsze wybierana jest jedna z dwóch pierwszych.
 * Rzadsze metody nie znikają — schodzą o jedno kliknięcie niżej, a wybrana
 * z nich zostaje na przycisku, więc widać, co jest zaznaczone.
 */
export const PaymentMethodPicker = ({ value, onChange }: PaymentMethodPickerProps) => {
    const [isOpen, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const selectedSecondary = secondaryPaymentMethods.find(method => method.value === value);

    const choose = (method: PaymentMethod) => {
        onChange(method);
        setOpen(false);
    };

    return (
        <PillRow>
            {primaryPaymentMethods.map(method => (
                <Pill
                    key={method.value}
                    type="button"
                    $selected={value === method.value}
                    onClick={() => onChange(method.value)}
                >
                    {method.icon}
                    {method.label}
                </Pill>
            ))}

            <Wrapper ref={wrapperRef}>
                <Pill
                    type="button"
                    $selected={!!selectedSecondary}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(open => !open)}
                >
                    {selectedSecondary?.icon ?? <MoreHorizontal size={13} />}
                    {selectedSecondary?.label ?? 'Inna metoda'}
                    <ChevronDown size={13} />
                </Pill>

                {isOpen && (
                    <Menu role="menu">
                        {secondaryPaymentMethods.map(method => (
                            <MenuItem
                                key={method.value}
                                type="button"
                                role="menuitem"
                                $selected={value === method.value}
                                onClick={() => choose(method.value)}
                            >
                                {method.icon}
                                {method.label}
                            </MenuItem>
                        ))}
                    </Menu>
                )}
            </Wrapper>
        </PillRow>
    );
};
