// src/modules/gallery/components/GalleryFilterBar.tsx

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { TagChip } from '@/modules/photos/components/TagChip';

// ─── styles ────────────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.md};
    padding: ${p => p.theme.spacing.lg};
    background: ${p => p.theme.colors.surface};
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const TopRow = styled.div`
    display: flex;
    gap: ${p => p.theme.spacing.md};
    align-items: center;
    flex-wrap: wrap;
`;

const SearchBox = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 360px;

    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 8px 12px 8px 38px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surfaceAlt};
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    box-sizing: border-box;

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
        background: white;
    }
`;

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
    z-index: 100;
    width: 320px;
    max-height: 280px;
    overflow-y: auto;
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: ${p => p.theme.shadows.lg};
    padding: ${p => p.theme.spacing.sm};
    display: ${p => p.$open ? 'block' : 'none'};

    @media (max-width: 480px) {
        width: 280px;
    }
`;

const TagDropdownInner = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: ${p => p.theme.spacing.xs};
`;

const TagDropdownLabel = styled.p`
    margin: 0 0 8px;
    padding: 4px ${p => p.theme.spacing.xs};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const ActiveTagsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
`;

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

// ─── component ─────────────────────────────────────────────────────────────────

interface GalleryFilterBarProps {
    search: string;
    onSearchChange: (v: string) => void;
    activeTags: string[];
    availableTags: string[];
    onTagToggle: (tag: string) => void;
    onClearTags: () => void;
    totalPhotos: number;
    isFetching: boolean;
}

export const GalleryFilterBar = ({
    search,
    onSearchChange,
    activeTags,
    availableTags,
    onTagToggle,
    onClearTags,
    totalPhotos,
    isFetching,
}: GalleryFilterBarProps) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const photoCountLabel = isFetching
        ? 'Ładowanie…'
        : `${totalPhotos} ${totalPhotos === 1 ? 'zdjęcie' : totalPhotos < 5 ? 'zdjęcia' : 'zdjęć'}`;

    return (
        <Bar>
            <TopRow>
                {/* Search */}
                <SearchBox>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <SearchInput
                        type="text"
                        placeholder="Szukaj po marce, modelu, kliencie…"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </SearchBox>

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
                        <TagDropdownLabel>Filtruj po tagach</TagDropdownLabel>
                        <TagDropdownInner>
                            {availableTags.map(tag => (
                                <TagChip
                                    key={tag}
                                    label={tag}
                                    size="sm"
                                    active={activeTags.includes(tag)}
                                    onClick={() => onTagToggle(tag)}
                                />
                            ))}
                        </TagDropdownInner>
                    </TagDropdown>
                </TagDropdownWrap>

                {/* Clear + summary */}
                {(activeTags.length > 0 || search) && (
                    <ClearBtn onClick={() => { onClearTags(); onSearchChange(''); }}>
                        Wyczyść filtry
                    </ClearBtn>
                )}

                <ResultSummary>{photoCountLabel}</ResultSummary>
            </TopRow>

            {/* Active tag chips */}
            {activeTags.length > 0 && (
                <ActiveTagsRow>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                        Aktywne:
                    </span>
                    {activeTags.map(tag => (
                        <TagChip
                            key={tag}
                            label={tag}
                            size="sm"
                            active
                            onRemove={() => onTagToggle(tag)}
                        />
                    ))}
                    <ClearBtn onClick={onClearTags}>usuń wszystkie</ClearBtn>
                </ActiveTagsRow>
            )}
        </Bar>
    );
};
