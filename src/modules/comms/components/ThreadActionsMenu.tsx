// src/modules/comms/components/ThreadActionsMenu.tsx
// Menu „reszty" akcji nagłówka rozmowy.
//
// Nagłówek rósł o jeden przycisk za każdym razem, gdy dochodziła funkcja, aż
// przestał być nagłówkiem, a stał się paskiem narzędzi — i temat wątku, czyli
// jedyna rzecz, po którą się tu patrzy, przegrywał z trzema pigułkami obok.
// Menu jest miejscem, które może przyjąć kolejne akcje bez odbierania miejsca
// tematowi: zamiast rosnąć w bok, rośnie w dół i tylko po kliknięciu.
//
// Wchodzi tu wszystko, co nie jest następnym krokiem w rozmowie: porządki
// (archiwum), akcje odwracalne, akcje rzadkie. Krok następny zostaje na wierzchu
// jako jedyny przycisk główny.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { MoreHorizontal } from 'lucide-react';

const MENU_WIDTH = 232;
const MENU_GAP = 6;
/** Zapas na wysokość menu, gdy nie mieści się pod przyciskiem — wtedy otwiera się nad. */
const MENU_MAX_HEIGHT = 260;

const Trigger = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    border: 1px solid ${({ $open, theme }) => ($open ? theme.colors.textMuted : theme.colors.border)};
    background: ${({ $open, theme }) => ($open ? theme.colors.surfaceHover : theme.colors.surface)};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
    }

    svg { width: 16px; height: 16px; }
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1200;
`;

const Menu = styled.div`
    position: fixed;
    z-index: 1201;
    width: ${MENU_WIDTH}px;
    max-height: ${MENU_MAX_HEIGHT}px;
    overflow-y: auto;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.18);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const Item = styled.button`
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.text};
    border-radius: ${p => p.theme.radii.sm};
    padding: 8px 10px;
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
`;

export interface ThreadAction {
    key: string;
    label: string;
    icon: ReactNode;
    onSelect: () => void;
}

interface ThreadActionsMenuProps {
    actions: ThreadAction[];
    /** Opis dla czytników ekranu — nagłówek ma tylko ikonę. */
    label?: string;
}

export function ThreadActionsMenu({ actions, label = 'Więcej akcji' }: ThreadActionsMenuProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    // Pozycję liczymy przed malowaniem — menu nie ma prawa mrugnąć w lewym górnym rogu.
    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const opensUpward = rect.bottom + MENU_GAP + MENU_MAX_HEIGHT > window.innerHeight;
        setPosition({
            top: opensUpward
                ? Math.max(MENU_GAP, rect.top - MENU_GAP - MENU_MAX_HEIGHT)
                : rect.bottom + MENU_GAP,
            // Menu wyrównane prawą krawędzią do przycisku: rozwija się w głąb widoku,
            // a nie poza jego prawą krawędź, przy której ten przycisk stoi.
            left: Math.max(MENU_GAP, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - MENU_GAP)),
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    if (actions.length === 0) return null;

    return (
        <>
            <Trigger
                ref={triggerRef}
                type="button"
                $open={open}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                title={label}
                onClick={() => setOpen((current) => !current)}
            >
                <MoreHorizontal />
            </Trigger>

            {open && position && createPortal(
                <>
                    <Backdrop onClick={() => setOpen(false)} />
                    <Menu role="menu" style={{ top: position.top, left: position.left }}>
                        {actions.map((action) => (
                            <Item
                                key={action.key}
                                type="button"
                                role="menuitem"
                                onClick={() => { setOpen(false); action.onSelect(); }}
                            >
                                {action.icon}
                                {action.label}
                            </Item>
                        ))}
                    </Menu>
                </>,
                document.body
            )}
        </>
    );
}
