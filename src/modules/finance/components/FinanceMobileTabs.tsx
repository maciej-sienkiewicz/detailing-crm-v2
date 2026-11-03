// src/modules/finance/components/FinanceMobileTabs.tsx
//
// Zakładki Finansów na telefonie. Dawniej była tu natywna lista <select> ostylowana na
// pasek „Kasa ⌄" pod trzema kaflami. Biznes zgłosił, że zmiana zakładki jest
// nieintuicyjna, i miał rację z trzech powodów: pasek wyglądał jak nagłówek zwijanej
// karty, a nie jak nawigacja; pozostałych trzech widoków nie było widać przed dotknięciem;
// a stał w połowie ekranu, więc po przewinięciu historii kasy trzeba było wracać na górę.
//
// Teraz wszystkie zakładki widać naraz, pod nagłówkiem strony, a gdy przełącznik wyjedzie
// za górną krawędź, ta sama kopia przypina się do góry ekranu.
//
// Przypięcie robi `position: fixed` w portalu, a nie `sticky`: LayoutContainer ma
// `overflow-x: hidden`, co czyni go kontenerem przewijania, który sam nigdy się nie
// przewija - `sticky` pod nim nie łapie nigdy. Zmiana na `clip` ożywiłaby ok. 30 innych
// przyklejonych elementów w aplikacji naraz, których nikt w tym stanie nie oglądał.
// Portal, bo animacja wejścia widoku (transform) robi z kontenera blok odniesienia
// dla `fixed`.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Segmented, type SegmentedOption } from '@/common/components/ui';
import { ui } from '@/common/components/ui/tokens';
import type { FinanceTab } from '../types';

/** Wysokość przypiętego paska: przełącznik (40) + odstęp 8 od góry i od dołu. */
const PINNED_HEIGHT = 56;

/* Od 640 px zakładki są paskiem kart w panelu (FinanceView). */
const desktopHidden = '@media (min-width: 640px) { display: none; }';

const Inline = styled.div`
    ${desktopHidden}
`;

const Pinned = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    /* Pod dolnym paskiem nawigacji (97), menu i oknami - to nawigacja treści, nie okno. */
    z-index: 90;
    padding: calc(8px + env(safe-area-inset-top, 0px)) 16px 8px;
    background: rgba(238, 242, 247, 0.94);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid ${ui.line};
    ${desktopHidden}
`;

/*
 * Cztery opcje w jednym rzędzie: na 320 px każdej zostaje ok. 70 px, więc „Przychody"
 * w 13 px wychodziłoby na sąsiada. Węższy ekran dostaje mniejsze pismo i ciaśniejszy
 * margines zamiast ucinania nazw.
 */
const Switcher = styled(Segmented)`
    /* Tor w domyślnym surfaceAlt zlewa się z tłem strony (bg) - niewybrane zakładki
       wyglądały jak luźny tekst, a nie jak część jednego przełącznika. */
    background: ${ui.line};

    @media (max-width: 374px) {
        button { font-size: 12px; padding: 0 4px; }
    }
` as typeof Segmented;

interface Props {
    tabs: SegmentedOption<FinanceTab>[];
    value: FinanceTab;
    onChange: (tab: FinanceTab) => void;
    /** Początek treści zakładki - tam wraca widok po zmianie z przypiętego paska. */
    contentRef: RefObject<HTMLElement | null>;
}

export const FinanceMobileTabs = ({ tabs, value, onChange, contentRef }: Props) => {
    const inlineRef = useRef<HTMLDivElement>(null);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        const el = inlineRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        // Tylko wyjazd GÓRĄ: przełącznik poniżej ekranu (krótki telefon w poziomie) nie
        // znaczy, że ktoś przewinął treść.
        const observer = new IntersectionObserver(([entry]) => {
            setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    /*
     * Zmiana z przypiętego paska przenosi na początek nowej zakładki. Bez tego ktoś
     * głęboko w historii kasy po dotknięciu „Przychody" lądował w połowie listy
     * dokumentów albo, przy krótszej zakładce, pod jej końcem.
     */
    const changeFromPinned = useCallback((tab: FinanceTab) => {
        onChange(tab);
        const content = contentRef.current;
        if (!content) return;
        const top = content.getBoundingClientRect().top + window.scrollY - PINNED_HEIGHT - 8;
        window.scrollTo({ top: Math.max(0, top) });
    }, [onChange, contentRef]);

    if (tabs.length < 2) return null;

    return (
        <>
            <Inline ref={inlineRef}>
                <Switcher options={tabs} value={value} onChange={onChange} label="Widok finansów" block />
            </Inline>
            {pinned && createPortal(
                <Pinned data-testid="finance-tabs-pinned">
                    <Switcher options={tabs} value={value} onChange={changeFromPinned} label="Widok finansów" block />
                </Pinned>,
                document.body,
            )}
        </>
    );
};
