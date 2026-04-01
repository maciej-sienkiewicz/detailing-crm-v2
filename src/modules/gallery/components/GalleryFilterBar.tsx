// src/modules/gallery/components/GalleryFilterBar.tsx

import { useState, useRef, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';

// ─── tag pill (no colors — plain monochrome) ──────────────────────────────────

const TagPill = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
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

const RemoveX = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.7;
    &:hover { opacity: 1; }
`;

// ─── layout ───────────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.sm};
    padding: ${p => p.theme.spacing.md} ${p => p.theme.spacing.lg};
    background: ${p => p.theme.colors.surface};
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const TopRow = styled.div`
    display: flex;
    gap: ${p => p.theme.spacing.sm};
    align-items: center;
    flex-wrap: wrap;
`;

// ─── brand / model wrapper ────────────────────────────────────────────────────

const SelectWrap = styled.div`
    width: 180px;

    @media (max-width: 600px) {
        width: 140px;
    }

    /* Style the BrandSelect / ModelSelect trigger to match other filter controls */
    button {
        padding: 8px 12px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        background: ${p => p.theme.colors.surfaceAlt};
        font-size: ${p => p.theme.fontSizes.sm};
        color: ${p => p.theme.colors.text};
        transition: border-color 0.15s ease, box-shadow 0.15s ease;

        &:hover:not(:disabled) {
            background: white;
        }
        &:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
            background: white;
        }
    }
`;

// ─── tag dropdown ─────────────────────────────────────────────────────────────

const TagDropdownWrap = styled.div`
    position: relative;
`;

const TagToggleBtn = styled.button<{ $hasActive: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid ${p => p.$hasActive ? 'var(--brand-primary)' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.$hasActive ? 'rgba(14,165,233,0.07)' : p.theme.colors.surface};
    color: ${p => p.$hasActive ? 'var(--brand-primary)' : p.theme.colors.text};
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    svg { width: 15px; height: 15px; }

    &:hover {
        border-color: var(--brand-primary);
        background: rgba(14,165,233,0.05);
        color: var(--brand-primary);
    }
`;

const ActiveCount = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9999px;
    background: var(--brand-primary);
    color: white;
    font-size: 10px;
    font-weight: 700;
`;

const TagDropdown = styled.div<{ $open: boolean }>`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 200;
    width: 300px;
    background: white;
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

const TagSearchWrap = styled.div`
    padding: 8px 10px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: white;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 1;
`;

const TagSearchInput = styled.input`
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surfaceAlt};
    transition: border-color 0.15s ease;
    box-sizing: border-box;

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }
    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14,165,233,0.1);
        background: white;
    }
`;

const TagListScroll = styled.div`
    overflow-y: auto;
    max-height: 240px;
    padding: ${p => p.theme.spacing.sm};
`;

const TagListInner = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const NoTagsMsg = styled.p`
    margin: 0;
    padding: ${p => p.theme.spacing.sm};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    text-align: center;
`;

// ─── active chips row ─────────────────────────────────────────────────────────

const ActiveRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
`;

const ActiveLabel = styled.span`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    font-weight: 600;
`;

// ─── right side ───────────────────────────────────────────────────────────────

const ClearBtn = styled.button`
    padding: 4px 10px;
    border: none;
    background: none;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    border-radius: ${p => p.theme.radii.sm};
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
        color: #dc2626;
        background: rgba(220,38,38,0.06);
    }
`;

const ResultSummary = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    margin-left: auto;
    white-space: nowrap;
`;

const Separator = styled.div`
    width: 1px;
    height: 24px;
    background: ${p => p.theme.colors.border};
    flex-shrink: 0;
`;

// ─── component ─────────────────────────────────────────────────────────────────

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

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus search input when dropdown opens
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

    const hasAnyFilter = !!brand || !!model || activeTags.length > 0;

    const photoCountLabel = isFetching
        ? 'Ładowanie…'
        : `${totalPhotos} ${totalPhotos === 1 ? 'zdjęcie' : totalPhotos < 5 ? 'zdjęcia' : 'zdjęć'}`;

    return (
        <Bar>
            <TopRow>
                {/* Brand */}
                <SelectWrap>
                    <BrandSelect
                        value={brand || undefined}
                        onChange={b => { onBrandChange(b); onModelChange(''); }}
                        placeholder="Marka"
                    />
                </SelectWrap>

                {/* Model */}
                <SelectWrap>
                    <ModelSelect
                        brand={brand || undefined}
                        value={model || undefined}
                        onChange={onModelChange}
                        placeholder="Model"
                    />
                </SelectWrap>

                <Separator />

                {/* Tag dropdown */}
                <TagDropdownWrap ref={dropdownRef}>
                    <TagToggleBtn
                        $hasActive={activeTags.length > 0}
                        onClick={() => setDropdownOpen(o => !o)}
                        type="button"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        Tagi
                        {activeTags.length > 0 && <ActiveCount>{activeTags.length}</ActiveCount>}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </TagToggleBtn>

                    <TagDropdown $open={dropdownOpen}>
                        <TagSearchWrap>
                            <TagSearchInput
                                ref={tagSearchRef}
                                type="text"
                                placeholder="Szukaj tagu…"
                                value={tagSearch}
                                onChange={e => setTagSearch(e.target.value)}
                            />
                        </TagSearchWrap>
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
                                            {tag}
                                        </TagPill>
                                    ))}
                                </TagListInner>
                            )}
                        </TagListScroll>
                    </TagDropdown>
                </TagDropdownWrap>

                {hasAnyFilter && (
                    <ClearBtn onClick={onClearAll} type="button">
                        Wyczyść filtry
                    </ClearBtn>
                )}

                <ResultSummary>{photoCountLabel}</ResultSummary>
            </TopRow>

            {/* Active tag pills */}
            {activeTags.length > 0 && (
                <ActiveRow>
                    <ActiveLabel>Aktywne tagi:</ActiveLabel>
                    {activeTags.map(tag => (
                        <TagPill
                            key={tag}
                            $active
                            onClick={() => onTagToggle(tag)}
                            type="button"
                        >
                            {tag}
                            <RemoveX>
                                <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <line x1="2" y1="2" x2="8" y2="8" />
                                    <line x1="8" y1="2" x2="2" y2="8" />
                                </svg>
                            </RemoveX>
                        </TagPill>
                    ))}
                    <ClearBtn onClick={onClearTags} type="button">usuń wszystkie</ClearBtn>
                </ActiveRow>
            )}
        </Bar>
    );
};
