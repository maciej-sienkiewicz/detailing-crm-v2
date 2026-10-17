// src/modules/gallery/components/GalleryFilterBar.tsx

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { ui } from '@/common/components/ui';
import { useMediaQuery } from '@/common/hooks';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

// ─── outer shell ──────────────────────────────────────────────────────────────

// Pasek leży na górze karty galerii (jak wyszukiwarka i filtry na liście
// klientów), więc odstępy bierze z karty, a nie z gutteru strony.
const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    border-bottom: 1px solid ${ui.line};

    /*
     * Na telefonie pasek zostaje JEDNYM rzędem: marka, model, tagi i czyszczenie.
     *
     * Wcześniej był kolumną - każda sekcja miała własną etykietę („POJAZD",
     * „TAGI") i własny wiersz, więc trzy kontrolki zajmowały trzy piętra i
     * spychały zdjęcia poniżej krawędzi ekranu. Etykiety niczego nie dodawały:
     * pola same mówią, czym są („Marka", „Model", „Tagi").
     *
     * Sekcje nie znikają z kodu, tylko z układu - display: contents wpuszcza
     * ich zawartość wprost do tego rzędu (ten sam zabieg co w podglądzie leada).
     */
    @media (max-width: 768px) {
        flex-wrap: nowrap;
        padding: 12px 14px;
        gap: 8px;
    }
`;

// ─── filter section (pojazd / tagi) ──────────────────────────────────────────

const FilterSection = styled.div<{ $grow?: boolean }>`
    display: flex;
    align-items: center;
    min-width: 0;
    ${p => p.$grow && css`flex: 1;`}

    @media (max-width: 768px) {
        display: contents;
    }
`;

/* Etykiety sekcji („POJAZD", „TAGI" 10 px wersalikami) zniknęły też z szerokiego
   ekranu: były jedyną ramą sekcji, a pola i tak mówią, czym są (CLAUDE.md §2).
   Zasadę łączenia tagów niesie panel wyboru - tam, gdzie się je zaznacza. */
const SectionControls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;

    @media (max-width: 768px) {
        display: contents;
    }
`;

/**
 * Wybrane tagi jako osobne pigułki - tylko na szerokim ekranie.
 *
 * Na telefonie nie mają gdzie stanąć bez łamania rzędu, więc liczbę wybranych
 * tagów niesie sam przycisk („Tagi (2)"), a odznaczyć je można tam, gdzie się
 * je zaznacza: na liście w rozwijanym panelu.
 */
const TagChips = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
        display: none;
    }
`;

// ─── separator between sections ──────────────────────────────────────────────

const SectionDivider = styled.div`
    width: 1px;
    height: 24px;
    margin: 0 10px;
    background: ${ui.line};
    flex-shrink: 0;

    @media (max-width: 768px) {
        display: none;
    }
`;

// ─── right side: clear ────────────────────────────────────────────────────────

/* Licznik zdjęć mieszka w nagłówku strony - tu zostaje samo czyszczenie. */
const RightSide = styled.div`
    display: flex;
    align-items: center;
    margin-left: auto;
    flex-shrink: 0;

    @media (max-width: 768px) {
        display: contents;
    }
`;

const ClearAllBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 500;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg { width: 12px; height: 12px; }

    &:hover {
        color: #dc2626;
        border-color: #fca5a5;
        background: rgba(220, 38, 38, 0.04);
    }

    /* W jednym rzędzie z trzema polami zostaje na niego tyle miejsca, ile ma
       ikona - a sam krzyżyk przy polach filtrów czyta się bez podpisu. */
    @media (max-width: 768px) {
        width: 36px;
        height: 36px;
        padding: 0;
        justify-content: center;
        flex-shrink: 0;
    }
`;

/** Podpis przycisku czyszczenia - na telefonie zostaje sama ikona. */
const ClearLabel = styled.span`
    @media (max-width: 768px) {
        display: none;
    }
`;

// ─── brand / model selects ────────────────────────────────────────────────────

const SelectWrap = styled.div`
    width: 170px;

    @media (max-width: 768px) {
        /* Równy podział rzędu: trzy pola tej samej szerokości czytają się jako
           jeden zestaw, a nie jako pole i dwa dodatki. */
        width: auto;
        flex: 1 1 0;
        min-width: 0;
    }

    button {
        min-height: 36px;
        box-sizing: border-box;
        padding: 0 12px;
        border: 1px solid ${ui.line};
        border-radius: ${ui.radiusRow};
        background: ${ui.surfaceSoft};
        /* „Wybierz markę" w trzeciej części telefonu łamało się na dwie linie. */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: ${p => p.theme.fontSizes.sm};
        color: ${p => p.theme.colors.text};
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
            background: #ffffff;
            border-color: rgba(14, 165, 233, 0.4);
        }
        &:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
            background: #ffffff;
        }
    }
`;

// ─── active tag chips (inline in bar) ─────────────────────────────────────────

const TagChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid ${ui.brandLineSoft};
    border-radius: ${ui.radiusControl};
    background: ${ui.brandTint};
    color: ${ui.brandDeep};
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg { width: 10px; height: 10px; opacity: 0.6; flex-shrink: 0; }

    &:hover {
        background: rgba(220, 38, 38, 0.06);
        border-color: #fca5a5;
        color: #dc2626;
        svg { opacity: 1; }
    }
`;

// ─── "add tag" trigger + dropdown ────────────────────────────────────────────

const AddTagWrap = styled.div`
    position: relative;

    @media (max-width: 768px) {
        flex: 1 1 0;
        min-width: 0;
    }
`;

const AddTagBtn = styled.button<{ $hasActive: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 13px;
    border: 1px dashed ${p => p.$hasActive ? ui.brandLine : ui.lineStrong};
    border-radius: ${ui.radiusControl};
    background: transparent;
    color: ${p => p.$hasActive ? ui.brandInk : ui.textSecondary};
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg { width: 12px; height: 12px; }

    /* Ta sama wysokość i szerokość co pola obok - rząd ma wyglądać jak jeden
       zestaw kontrolek, a nie jak pola z doklejonym przyciskiem. */
    @media (max-width: 768px) {
        width: 100%;
        height: 36px;
        justify-content: center;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    &:hover {
        border-style: solid;
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: rgba(14, 165, 233, 0.04);
    }
`;

/*
 * Panel w portalu do <body>, w `position: fixed`, ustawiany przez useFloatingPanel.
 * Wcześniej stał `absolute` z `left: 0` pod przyciskiem - a przycisk „Tagi" na
 * telefonie jest drugi w rzędzie, więc 300-pikselowy panel wyjeżdżał za prawą
 * krawędź ekranu (węższe 260 px przy 480 px tylko zmniejszało, o ile). Teraz
 * szerokość przycina placement do ekranu, a panel przesuwa się, zanim krawędź dotknie.
 */
const DropdownPanel = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9000;
    width: 300px;
    box-sizing: border-box;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.lg};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Do pierwszego pomiaru niewidoczny, żeby nie mignął w lewym górnym rogu. */
    visibility: hidden;
    overscroll-behavior: contain;
`;

const DropdownHeader = styled.div`
    padding: 10px 12px 8px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    flex-shrink: 0;
`;

const DropdownTitle = styled.div`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 6px;
`;

const DropdownLogicNote = styled.div`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.4;
`;

const TagSearchInput = styled.input`
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    transition: border-color 0.15s ease;
    box-sizing: border-box;
    margin-top: 6px;

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        background: #ffffff;
    }
`;

const TagListScroll = styled.div`
    overflow-y: auto;
    max-height: 220px;
    padding: 8px;
`;

const TagListInner = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const TagPill = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.border};
    background: ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.surface};
    color: ${p => p.$active ? 'white' : p.theme.colors.text};
    cursor: pointer;
    transition: all 140ms ease;
    user-select: none;

    &:hover {
        border-color: var(--brand-primary);
        background: ${p => p.$active ? 'var(--brand-primary-dark)' : 'rgba(14,165,233,0.07)'};
        color: ${p => p.$active ? 'white' : 'var(--brand-primary)'};
    }
`;

const NoTagsMsg = styled.p`
    margin: 0;
    padding: 14px 10px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    text-align: center;
`;

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const IconX = ({ size = 12 }: { size?: number }) => (
    <svg viewBox="0 0 10 10" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="2" y1="2" x2="8" y2="8" />
        <line x1="8" y1="2" x2="2" y2="8" />
    </svg>
);

const IconPlus = () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="6" y1="1" x2="6" y2="11" />
        <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
);

// ─── component ────────────────────────────────────────────────────────────────

interface GalleryFilterBarProps {
    brand: string;
    model: string;
    onBrandChange: (brand: string) => void;
    onModelChange: (model: string) => void;
    activeTags: string[];
    availableTags: string[];
    onTagToggle: (tag: string) => void;
    onClearAll: () => void;
}

export const GalleryFilterBar = ({
    brand,
    model,
    onBrandChange,
    onModelChange,
    activeTags,
    availableTags,
    onTagToggle,
    onClearAll,
}: GalleryFilterBarProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const tagSearchRef = useRef<HTMLInputElement>(null);

    // Panel żyje w portalu, więc NIE jest już potomkiem dropdownRef - kliknięcie
    // w tag liczymy jako „w środku" osobno, inaczej mousedown zamknąłby panel,
    // zanim onClick tagu zdąży się wykonać.
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            setDropdownOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', onKey);
        };
    }, [dropdownOpen]);

    // Wyszukiwanie zeruje samo otwarcie (toggleDropdown), efekt tylko przenosi fokus -
    // setState w efekcie dawał dodatkowy render przy każdym otwarciu.
    useEffect(() => {
        if (dropdownOpen) {
            setTimeout(() => tagSearchRef.current?.focus(), 0);
        }
    }, [dropdownOpen]);

    const toggleDropdown = () => {
        if (!dropdownOpen) setTagSearch('');
        setDropdownOpen(o => !o);
    };

    const filteredTags = useMemo(() => {
        const q = tagSearch.trim().toLowerCase();
        if (!q) return availableTags;
        return availableTags.filter(t => t.toLowerCase().includes(q));
    }, [availableTags, tagSearch]);

    // Liczba pozycji zmienia wysokość panelu przy wyszukiwaniu - panel postawiony
    // NAD przyciskiem musi się wtedy przemierzyć, inaczej odkleiłby się od niego.
    useFloatingPanel(dropdownOpen, dropdownRef, panelRef, { align: 'left', offset: 8 }, filteredTags.length);

    const hasVehicleFilter = !!brand || !!model;
    const hasTagFilter = activeTags.length > 0;
    const hasAnyFilter = hasVehicleFilter || hasTagFilter;

    // Ten sam próg co w regułach stylów niżej - jeden rząd na telefonie ma mieć
    // krótsze podpisy, inaczej „Marka pojazdu" nie mieści się w trzeciej części
    // szerokości ekranu i urywa się w połowie słowa.
    const isNarrow = useMediaQuery('(max-width: 768px)');

    return (
        <Bar>

            {/* ── POJAZD ── */}
            <FilterSection>
                <SectionControls>
                    <SelectWrap>
                        <BrandSelect kind="ALL"
                            value={brand || undefined}
                            onChange={b => { onBrandChange(b); onModelChange(''); }}
                            placeholder={isNarrow ? 'Marka' : 'Marka pojazdu'}
                        />
                    </SelectWrap>
                    <SelectWrap>
                        <ModelSelect kind="ALL"
                            brand={brand || undefined}
                            value={model || undefined}
                            onChange={onModelChange}
                            placeholder={brand || isNarrow ? 'Model' : 'Model (wybierz markę)'}
                        />
                    </SelectWrap>
                </SectionControls>
            </FilterSection>

            <SectionDivider />

            {/* ── TAGI ── */}
            <FilterSection $grow>
                <SectionControls>
                    {/* Pusty kontener zostawiłby po sobie odstęp przed przyciskiem,
                        więc nie renderujemy go, dopóki nie ma czego pokazać. */}
                    {hasTagFilter && (
                        <TagChips>
                            {activeTags.map(tag => (
                                <TagChip key={tag} onClick={() => onTagToggle(tag)} type="button">
                                    {tag}
                                    <IconX size={10} />
                                </TagChip>
                            ))}
                        </TagChips>
                    )}

                    {/* Add tag dropdown */}
                    <AddTagWrap ref={dropdownRef}>
                        <AddTagBtn
                            $hasActive={hasTagFilter}
                            onClick={toggleDropdown}
                            type="button"
                        >
                            <IconPlus />
                            {isNarrow
                                ? (hasTagFilter ? `Tagi (${activeTags.length})` : 'Tagi')
                                : (hasTagFilter ? 'Dodaj kolejny' : 'Wybierz tagi')}
                        </AddTagBtn>

                        {dropdownOpen && createPortal(
                            <DropdownPanel ref={panelRef}>
                                <DropdownHeader>
                                    <DropdownTitle>Filtruj po tagach</DropdownTitle>
                                    <DropdownLogicNote>
                                        Pokażemy zdjęcia, które mają <strong>wszystkie</strong> zaznaczone tagi.
                                    </DropdownLogicNote>
                                    <TagSearchInput
                                        ref={tagSearchRef}
                                        type="text"
                                        placeholder="Szukaj tagu…"
                                        value={tagSearch}
                                        onChange={e => setTagSearch(e.target.value)}
                                    />
                                </DropdownHeader>
                                <TagListScroll>
                                    {filteredTags.length === 0 ? (
                                        <NoTagsMsg>Brak pasujących tagów</NoTagsMsg>
                                    ) : (
                                        <TagListInner>
                                            {filteredTags.map(tag => (
                                                <TagPill
                                                    key={tag}
                                                    $active={activeTags.includes(tag)}
                                                    onClick={() => onTagToggle(tag)}
                                                    type="button"
                                                >
                                                    {activeTags.includes(tag) && <IconX size={8} />}
                                                    {tag}
                                                </TagPill>
                                            ))}
                                        </TagListInner>
                                    )}
                                </TagListScroll>
                            </DropdownPanel>,
                            document.body,
                        )}
                    </AddTagWrap>
                </SectionControls>
            </FilterSection>

            {/* ── Right side ── */}
            <RightSide>
                {hasAnyFilter && (
                    <ClearAllBtn onClick={onClearAll} type="button" aria-label="Wyczyść filtry" title="Wyczyść filtry">
                        <IconX size={11} />
                        <ClearLabel>Wyczyść filtry</ClearLabel>
                    </ClearAllBtn>
                )}
            </RightSide>
        </Bar>
    );
};
