import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Check, ChevronDown } from 'lucide-react';
import { ui } from '@/common/components/ui';
import { usePortalDropdownPos } from '@/common/hooks/usePortalDropdownPos';
import { RATE_LABEL, type VatRateCode } from '../../types/handover';

/*
 * Stawka VAT pozycji jako lista w stylu aplikacji. Natywny <select> otwierał systemową
 * listę (szara, inna czcionka), która na ekranie wydania wyglądała jak z innej aplikacji.
 */

const RATES: VatRateCode[] = ['23', '8', '5', '0', 'zw'];

const Trigger = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    width: 100%;
    padding: 8px 8px 8px 10px;
    border: 1.5px solid ${ui.line};
    border-radius: 8px;
    background: ${ui.surface};
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    svg { width: 15px; height: 15px; color: ${ui.textMuted}; flex-shrink: 0; }
    /* Te same obramowania co InputShell z zestawu Form - pole stoi obok pól kwot. */
    &:hover { border-color: #cbd5e1; }
    &[aria-expanded='true'], &:focus-visible {
        outline: none;
        border-color: ${ui.brand};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const Menu = styled.div`
    position: fixed;
    z-index: 10000;
    min-width: 96px;
    padding: 4px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    box-shadow: ${ui.shadowMenu};
`;

const Option = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 8px;
    background: ${p => (p.$selected ? ui.brandTint : 'transparent')};
    font: inherit;
    font-size: 14px;
    font-weight: ${p => (p.$selected ? 700 : 500)};
    color: ${p => (p.$selected ? ui.brandInk : ui.ink)};
    font-variant-numeric: tabular-nums;
    text-align: left;
    cursor: pointer;

    svg { width: 14px; height: 14px; }
    &:hover { background: ${ui.brandTintHover}; }
`;

interface VatRateSelectProps {
    value: VatRateCode;
    onChange: (rate: VatRateCode) => void;
    ariaLabel: string;
}

export const VatRateSelect = ({ value, onChange, ariaLabel }: VatRateSelectProps) => {
    const [isOpen, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const { menuRef, style, open, close } = usePortalDropdownPos();

    const hide = () => { setOpen(false); close(); };

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            hide();
        };
        // Escape zamyka tylko listę: przechwycony, zanim dotrze do okna wydania pojazdu,
        // które na ten sam klawisz zamyka się w całości.
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            hide();
            triggerRef.current?.focus();
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey, true);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return (
        <>
            <Trigger
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={e => {
                    if (isOpen) { hide(); return; }
                    open(e, { align: 'left' });
                    setOpen(true);
                }}
            >
                <span>{RATE_LABEL[value]}</span>
                <ChevronDown aria-hidden="true" />
            </Trigger>
            {isOpen && createPortal(
                <Menu ref={menuRef} role="listbox" aria-label={ariaLabel} style={style}>
                    {RATES.map(rate => (
                        <Option
                            key={rate}
                            type="button"
                            role="option"
                            aria-selected={rate === value}
                            $selected={rate === value}
                            onClick={() => { onChange(rate); hide(); triggerRef.current?.focus(); }}
                        >
                            {RATE_LABEL[rate]}
                            {rate === value && <Check aria-hidden="true" />}
                        </Option>
                    ))}
                </Menu>,
                document.body,
            )}
        </>
    );
};
