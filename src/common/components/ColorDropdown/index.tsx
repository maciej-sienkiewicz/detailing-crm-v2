// src/common/components/ColorDropdown/index.tsx
//
// Wybór koloru kalendarza jako zwykłe pole formularza: kolorowy kwadracik,
// nazwa i lista rozwijana. Wyciągnięte z arkusza przyjęcia pojazdu, żeby
// szybka rezerwacja na telefonie miała dokładnie ten sam element zamiast
// rzędu kropek, w które trudno trafić palcem.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/** Minimalny kształt koloru — pasuje do typów obu modułów, które go używają. */
export interface ColorOption {
    id: string;
    name: string;
    hexColor: string;
}

const ColorDropdownContainer = styled.div`
    position: relative;
`;

const ColorTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 16px;
    border: 1.5px solid ${st.border};
    border-radius: 12px;
    background: #ffffff;
    cursor: pointer;
    transition: all ${st.transition};
    font-size: 14px;
    font-weight: 400;
    color: ${st.text};

    &:hover {
        border-color: ${st.borderHover};
        background: #FAFBFC;
    }

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: ${st.shadowBlue};
        background: #ffffff;
    }
`;

const ColorSwatch = styled.span<{ $color: string }>`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background-color: ${props => props.$color};
    border: 1px solid rgba(0, 0, 0, 0.10);
    flex-shrink: 0;
`;

const ColorCaret = styled.span`
    margin-left: auto;
    border: solid ${st.textMuted};
    border-width: 0 2px 2px 0;
    display: inline-block;
    padding: 3px;
    transform: rotate(45deg);
`;

const ColorMenu = styled.div`
    position: fixed;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
    padding: 4px 0;
    z-index: 9999;
    overflow: auto;
`;

const ColorMenuItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    background: ${props => props.$selected ? st.bgCardAlt : 'transparent'};
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-weight: ${props => props.$selected ? 600 : 400};
    color: ${st.text};
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

const ColorMenuSeparator = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

const ColorMenuAddBtn = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: ${st.accentBlue};
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }
`;

export interface ColorDropdownProps {
    colors: ColorOption[];
    value: string;
    onChange: (value: string) => void;
    onAddColor?: () => void;
    placeholder?: string;
}

export const ColorDropdown = ({ colors, value, onChange, onAddColor, placeholder = 'Wybierz kolor' }: ColorDropdownProps) => {
    const [open, setOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({ left: 0, width: 0, maxHeight: 0 });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        const vvHeight = window.visualViewport?.height ?? window.innerHeight;
        const spaceBelow = vvHeight - r.bottom - 4;
        const spaceAbove = r.top - 4;
        const maxH = 300;
        if (spaceBelow < 120 && spaceAbove > spaceBelow) {
            setMenuPos({ bottom: vvHeight - r.top + 4, left: r.left, width: r.width, maxHeight: Math.min(maxH, spaceAbove) });
        } else {
            setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.min(maxH, spaceBelow) });
        }
    }, []);

    const handleOpen = () => {
        calcPos();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const inContainer = containerRef.current?.contains(e.target as Node);
            const inMenu = menuRef.current?.contains(e.target as Node);
            if (!inContainer && !inMenu) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onScroll = () => { calcPos(); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        window.addEventListener('scroll', onScroll, true);
        window.visualViewport?.addEventListener('resize', onScroll);
        window.visualViewport?.addEventListener('scroll', onScroll);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
            window.removeEventListener('scroll', onScroll, true);
            window.visualViewport?.removeEventListener('resize', onScroll);
            window.visualViewport?.removeEventListener('scroll', onScroll);
        };
    }, [open, calcPos]);

    const selected = colors.find(c => c.id === value);

    return (
        <ColorDropdownContainer ref={containerRef}>
            <ColorTrigger ref={triggerRef} type="button" onClick={handleOpen} aria-haspopup="listbox" aria-expanded={open}>
                <ColorSwatch $color={selected?.hexColor || '#cccccc'} />
                <span>{selected?.name || placeholder}</span>
                <ColorCaret />
            </ColorTrigger>
            {open && createPortal(
                <ColorMenu ref={menuRef} role="listbox" style={{ top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: menuPos.width, maxHeight: menuPos.maxHeight }}>
                    {colors.map(c => (
                        <ColorMenuItem
                            key={c.id}
                            role="option"
                            aria-selected={c.id === value}
                            $selected={c.id === value}
                            onClick={() => { onChange(c.id); setOpen(false); }}
                        >
                            <ColorSwatch $color={c.hexColor} />
                            <span>{c.name}</span>
                        </ColorMenuItem>
                    ))}
                    {onAddColor && (
                        <>
                            <ColorMenuSeparator />
                            <ColorMenuAddBtn
                                type="button"
                                onClick={() => { setOpen(false); onAddColor(); }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                                Dodaj nowy kolor
                            </ColorMenuAddBtn>
                        </>
                    )}
                </ColorMenu>,
                document.body
            )}
        </ColorDropdownContainer>
    );
};
