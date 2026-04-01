// src/modules/gallery/components/GalleryFilterBar.tsx

import { useState, useRef, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

// ─── outer shell ──────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    align-items: stretch;
    padding: 0 ${p => p.theme.spacing.xl};
    background: ${p => p.theme.colors.surface};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    min-height: 72px;
    gap: 0;

    @media (max-width: 768px) {
        flex-direction: column;
        padding: ${p => p.theme.spacing.md};
        gap: ${p => p.theme.spacing.sm};
        min-height: unset;
    }
`;

// ─── filter section (pojazd / tagi) ──────────────────────────────────────────

const FilterSection = styled.div<{ $grow?: boolean }>`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 10px 0;
    ${p => p.$grow && css`flex: 1; min-width: 0;`}
`;

const SectionLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    user-select: none;

    svg {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
    }
`;

const LogicHint = styled.span`
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--brand-primary);
    background: rgba(14, 165, 233, 0.08);
    border: 1px solid rgba(14, 165, 233, 0.2);
    padding: 1px 6px;
    border-radius: 9999px;
    margin-left: 2px;
`;

const SectionControls = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

// ─── separator between sections ──────────────────────────────────────────────

const SectionDivider = styled.div`
    width: 1px;
    align-self: stretch;
    margin: 14px 20px;
    background: ${p => p.theme.colors.border};
    flex-shrink: 0;

    @media (max-width: 768px) {
        display: none;
    }
`;

// ─── right side: count + clear ────────────────────────────────────────────────

const RightSide = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    padding-left: 20px;
    flex-shrink: 0;

    @media (max-width: 768px) {
        margin-left: 0;
        padding-left: 0;
        justify-content: space-between;
    }
`;

const PhotoCount = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    text-align: right;
`;

const CountNumber = styled.span`
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    line-height: 1;
`;

const CountLabel = styled.span`
    font-size: 10px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1;
`;

const ClearAllBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 13px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: transparent;
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
`;

// ─── brand / model selects ────────────────────────────────────────────────────

const SelectWrap = styled.div`
    width: 160px;

    button {
        min-height: 36px;
        box-sizing: border-box;
        padding: 0 12px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        background: ${p => p.theme.colors.surfaceAlt};
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
    height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(14, 165, 233, 0.5);
    border-radius: ${p => p.theme.radii.md};
    background: rgba(14, 165, 233, 0.07);
    color: var(--brand-primary);
    font-size: 12px;
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
`;

const AddTagBtn = styled.button<{ $hasActive: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 11px;
    border: 1px dashed ${p => p.$hasActive ? 'rgba(14,165,233,0.5)' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: transparent;
    color: ${p => p.$hasActive ? 'var(--brand-primary)' : p.theme.colors.textMuted};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg { width: 12px; height: 12px; }

    &:hover {
        border-style: solid;
        border-color: var(--brand-primary);
        color: var(--brand-primary);
        background: rgba(14, 165, 233, 0.04);
    }
`;

const DropdownPanel = styled.div<{ $open: boolean }>`
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 300;
    width: 300px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.lg};
    display: ${p => p.$open ? 'flex' : 'none'};
    flex-direction: column;
    overflow: hidden;

    @media (max-width: 480px) {
        width: 260px;
    }
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

const IconCar = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h10l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
    </svg>
);

const IconTag = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);

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
    onClearTags: () => void;
    onClearAll: () => void;
    totalPhotos: number;
    isFetching: boolean;
}

export const GalleryFilterBar = ({
    brand,
    model,
    onBrandChange,
    onModelChange,
    activeTags,
    availableTags,
    onTagToggle,
    onClearTags,
    onClearAll,
    totalPhotos,
    isFetching,
}: GalleryFilterBarProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const tagSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (dropdownOpen) {
            setTagSearch('');
            setTimeout(() => tagSearchRef.current?.focus(), 0);
        }
    }, [dropdownOpen]);

    const filteredTags = useMemo(() => {
        const q = tagSearch.trim().toLowerCase();
        if (!q) return availableTags;
        return availableTags.filter(t => t.toLowerCase().includes(q));
    }, [availableTags, tagSearch]);

    const hasVehicleFilter = !!brand || !!model;
    const hasTagFilter = activeTags.length > 0;
    const hasAnyFilter = hasVehicleFilter || hasTagFilter;

    const countLabel = isFetching
        ? '…'
        : `${totalPhotos}`;
    const countSuffix = isFetching
        ? ''
        : totalPhotos === 1 ? 'zdjęcie' : totalPhotos < 5 && totalPhotos > 0 ? 'zdjęcia' : 'zdjęć';

    return (
        <Bar>

            {/* ── POJAZD ── */}
            <FilterSection>
                <SectionLabel>
                    <IconCar />
                    Pojazd
                </SectionLabel>
                <SectionControls>
                    <SelectWrap>
                        <BrandSelect
                            value={brand || undefined}
                            onChange={b => { onBrandChange(b); onModelChange(''); }}
                            placeholder="Marka pojazdu"
                        />
                    </SelectWrap>
                    <SelectWrap>
                        <ModelSelect
                            brand={brand || undefined}
                            value={model || undefined}
                            onChange={onModelChange}
                            placeholder={brand ? 'Model' : 'Model (wybierz markę)'}
                        />
                    </SelectWrap>
                </SectionControls>
            </FilterSection>

            <SectionDivider />

            {/* ── TAGI ── */}
            <FilterSection $grow>
                <SectionLabel>
                    <IconTag />
                    Tagi
                    {activeTags.length > 1 && (
                        <LogicHint>wszystkie wymagane</LogicHint>
                    )}
                </SectionLabel>
                <SectionControls>
                    {activeTags.map(tag => (
                        <TagChip key={tag} onClick={() => onTagToggle(tag)} type="button">
                            {tag}
                            <IconX size={10} />
                        </TagChip>
                    ))}

                    {/* Add tag dropdown */}
                    <AddTagWrap ref={dropdownRef}>
                        <AddTagBtn
                            $hasActive={hasTagFilter}
                            onClick={() => setDropdownOpen(o => !o)}
                            type="button"
                        >
                            <IconPlus />
                            {hasTagFilter ? 'Dodaj kolejny' : 'Wybierz tagi'}
                        </AddTagBtn>

                        <DropdownPanel $open={dropdownOpen}>
                            <DropdownHeader>
                                <DropdownTitle>Filtruj po tagach</DropdownTitle>
                                <DropdownLogicNote>
                                    Zdjęcia muszą posiadać <strong>wszystkie</strong> zaznaczone tagi (AND).
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
                        </DropdownPanel>
                    </AddTagWrap>
                </SectionControls>
            </FilterSection>

            {/* ── Right side ── */}
            <RightSide>
                {hasAnyFilter && (
                    <ClearAllBtn onClick={onClearAll} type="button">
                        <IconX size={11} />
                        Wyczyść filtry
                    </ClearAllBtn>
                )}
                <PhotoCount>
                    <CountNumber>{countLabel}</CountNumber>
                    <CountLabel>{countSuffix || 'zdjęć'}</CountLabel>
                </PhotoCount>
            </RightSide>
        </Bar>
    );
};
