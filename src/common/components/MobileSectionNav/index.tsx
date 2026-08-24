// src/common/components/MobileSectionNav/index.tsx
//
// Zakładki sekcji wewnątrz jednego widoku, na telefonie. Długa karta (wizyty,
// klienta) nie mieści się na ekranie, a przewijanie jej w całości gubi
// użytkownika — dlatego dzielimy ją na kilka sekcji i przełączamy paskiem przy
// dolnej krawędzi, w zasięgu kciuka.
//
// Pasek siedzi NAD globalną nawigacją, nie na niej: to nawigacja wewnątrz
// widoku, a wyjście z widoku musi zostać dostępne.

import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';
import { useVirtualKeyboard } from '@/common/hooks';
import { useMobileChromeHidden } from '@/common/context/MobileChromeContext';

const BRAND = '#0ea5e9';

/**
 * Sekcja widoku: na telefonie widoczna tylko dla swojej zakładki, na desktopie
 * zawsze. `$desktopContents` znika z układu na desktopie (display: contents) —
 * potrzebne tam, gdzie sekcje przecinają kolumny siatki i owijający div
 * zepsułby odstępy albo rozkład kolumn.
 */
export const MobileSectionPanel = styled.div<{ $visible: boolean; $desktopContents?: boolean }>`
    @media (max-width: 767px) {
        display: ${p => p.$visible ? 'block' : 'none'};
        /* Wewnątrz owijki znika gap kolumny — odstęp dokładamy marginesem. */
        > * + * { margin-top: 14px; }
    }

    @media (min-width: 768px) {
        ${p => p.$desktopContents && 'display: contents;'}
    }
`;

const Bar = styled.nav<{ $hidden?: boolean }>`
    display: flex;
    position: fixed;
    /* Safe-area obsługuje już pasek globalny, stąd sam odstęp tutaj. */
    bottom: ${BOTTOM_NAV_SPACE};
    left: 0;
    right: 0;
    /* Pod overlayem (99) i drawerem (100) menu bocznego. */
    z-index: 96;
    /* To samo szkło co pasek globalny: oba rzędy czytają się jako jeden blok. */
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-top: 1px solid #e2e8f0;
    padding:
        6px
        max(4px, env(safe-area-inset-right, 0px))
        8px
        max(4px, env(safe-area-inset-left, 0px));
    box-shadow: 0 -2px 16px rgba(15, 23, 42, 0.06);
    transition: transform 180ms ease, opacity 180ms ease;

    /* Przy wysuniętej klawiaturze iOS trzyma ten pasek przy layout viewporcie
       (czyli już za klawiaturą) — zamiast odklejać się od dolnej krawędzi,
       pasek zjeżdża i wraca po zamknięciu klawiatury. To samo dotyczy edycji
       z własnym paskiem akcji i otwartych okien modalnych. */
    ${p => p.$hidden && `
        transform: translateY(110%);
        opacity: 0;
        pointer-events: none;
    `}

    @media (min-width: 768px) {
        display: none;
    }
`;

const NavBtn = styled.button<{ $active: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 2px;
    background: none;
    border: none;
    cursor: pointer;
    color: ${p => p.$active ? BRAND : '#94a3b8'};
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    &:active { opacity: 0.7; }
`;

const IconWrap = styled.span<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    max-width: 100%;
    height: 30px;
    border-radius: 15px;
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.12)' : 'transparent'};
    transition: background 0.2s ease;

    svg { width: 20px; height: 20px; flex-shrink: 0; }

    @media (max-width: 360px) { width: 40px; }
`;

const Label = styled.span`
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    width: 56px;
    text-align: center;

    @media (max-width: 360px) { width: 100%; font-size: 9px; }
`;

export interface MobileSectionNavItem<K extends string> {
    key: K;
    label: string;
    /** Zawartość <svg> — sam kształt, atrybuty dokłada pasek. */
    icon: React.ReactNode;
    /** Pełny opis dla czytnika ekranu, gdy etykieta jest skrótem. */
    ariaLabel?: string;
}

interface MobileSectionNavProps<K extends string> {
    items: MobileSectionNavItem<K>[];
    active: K;
    onChange: (key: K) => void;
    /** Opis paska dla czytnika ekranu, np. „Nawigacja sekcji wizyty". */
    ariaLabel: string;
}

export const MobileSectionNav = <K extends string>({
    items, active, onChange, ariaLabel,
}: MobileSectionNavProps<K>) => {
    const isKeyboardOpen = useVirtualKeyboard();
    const chromeHidden = useMobileChromeHidden();
    const hidden = isKeyboardOpen || chromeHidden;

    return createPortal(
        <Bar aria-label={ariaLabel} $hidden={hidden} aria-hidden={hidden || undefined}>
            {items.map(item => (
                <NavBtn
                    key={item.key}
                    $active={active === item.key}
                    onClick={() => onChange(item.key)}
                    aria-label={item.ariaLabel ?? item.label}
                    aria-current={active === item.key ? 'true' : undefined}
                >
                    <IconWrap $active={active === item.key}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            {item.icon}
                        </svg>
                    </IconWrap>
                    <Label>{item.label}</Label>
                </NavBtn>
            ))}
        </Bar>,
        document.body,
    );
};
