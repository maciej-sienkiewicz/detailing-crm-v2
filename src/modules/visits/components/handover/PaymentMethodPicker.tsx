import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ui } from '@/common/components/ui';
import { Pill, PillRow } from './HandoverKit';
import { primaryPaymentMethods, secondaryPaymentMethods } from './paymentOptions';
import type { PaymentMethod } from '../../types/stateTransitions';

const Wrapper = styled.div`
    display: inline-flex;
`;

/*
 * Menu w portalu do <body>, w `position: fixed`, ustawiane przez useFloatingPanel.
 * Stojąc `absolute` pod przyciskiem „Inna metoda" wyjeżdżało na telefonie za prawą
 * krawędź, a w korekcie rozliczenia ucinał je przewijany środek okna. z-index nad
 * każdą warstwą okien (ModalShell 1000, okna podrzędne 1400), bo picker stoi
 * w oknach. Do pierwszego pomiaru menu jest niewidoczne.
 */
const Menu = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9000;
    visibility: hidden;
    box-sizing: border-box;
    overscroll-behavior: contain;
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
    background: ${p => (p.$selected ? ui.brandTint : 'transparent')};
    color: ${p => (p.$selected ? ui.brandDeep : st.text)};
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$selected ? 600 : 500)};
    text-align: left;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;

    &:hover { background: ${ui.surfaceAlt}; color: ${st.text}; }
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
 * Rzadsze metody nie znikają, schodzą o jedno kliknięcie niżej, a wybrana
 * z nich zostaje na przycisku, więc widać, co jest zaznaczone.
 */
export const PaymentMethodPicker = ({ value, onChange }: PaymentMethodPickerProps) => {
    const [isOpen, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useFloatingPanel(isOpen, wrapperRef, menuRef, { align: 'left', offset: 6 });

    useEffect(() => {
        if (!isOpen) return;
        // Menu jest w portalu, więc nie leży w wrapperRef - kliknięcie w pozycję
        // trzeba uznać za „w środku" osobno, inaczej mousedown zamknąłby menu,
        // zanim onClick zdąży wybrać metodę.
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
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

                {isOpen && createPortal(
                    <Menu ref={menuRef} role="menu">
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
                    </Menu>,
                    document.body,
                )}
            </Wrapper>
        </PillRow>
    );
};
