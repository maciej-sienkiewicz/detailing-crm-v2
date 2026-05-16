// src/modules/photos/components/PhotoTagEditModal.tsx
// Modal for editing tags of a single photo – used in both check-in and visit views

import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { TagInput } from './TagInput';
import { TagChip } from './TagChip';

// ─── Styles ───────────────────────────────────────────────────────────────────

const PhotoThumb = styled.div`
    width: 52px;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid ${st.border};
    background: ${st.bgCardAlt};
    flex-shrink: 0;
`;

const ThumbImg = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const ThumbPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${st.textMuted};
    svg { width: 20px; height: 20px; }
`;

const Section = styled.div``;

const SectionLabel = styled.p`
    margin: 0 0 10px;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const SuggestionsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const SuggestionChipBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 9999px;
    border: 1px dashed ${st.border};
    background: transparent;
    font-size: 11px;
    font-weight: 500;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }

    svg { width: 10px; height: 10px; }
`;

const EmptyTagsHint = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-style: italic;
`;

const TagCount = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhotoTagEditModalProps {
    isOpen: boolean;
    photoId: string;
    fileName: string;
    thumbnailUrl?: string;
    initialTags: string[];
    suggestions: string[];
    onClose: () => void;
    /** Called on every tag change (debounced auto-save from parent) */
    onTagsChange: (photoId: string, tags: string[]) => void;
    isSaving?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PhotoTagEditModal = ({
    isOpen,
    photoId,
    fileName,
    thumbnailUrl,
    initialTags,
    suggestions,
    onClose,
    onTagsChange,
    isSaving = false,
}: PhotoTagEditModalProps) => {
    const [localTags, setLocalTags] = useState<string[]>(initialTags);

    // Keep local state in sync when a different photo is opened
    useEffect(() => {
        setLocalTags(initialTags);
    }, [photoId, initialTags]);

    const handleClose = useCallback(() => {
        onTagsChange(photoId, localTags);
        onClose();
    }, [photoId, localTags, onTagsChange, onClose]);

    const handleTagsChange = (tags: string[]) => {
        setLocalTags(tags);
    };

    const quickSuggestions = suggestions
        .filter(s => !localTags.includes(s))
        .slice(0, 12);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="520px">
            <ModalHeader>
                <PhotoThumb>
                    {thumbnailUrl ? (
                        <ThumbImg src={thumbnailUrl} alt={fileName} />
                    ) : (
                        <ThumbPlaceholder>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V6.75A1.5 1.5 0 0021 5.25H3A1.5 1.5 0 001.5 6.75v12A1.5 1.5 0 003 20.25z" />
                            </svg>
                        </ThumbPlaceholder>
                    )}
                </PhotoThumb>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj tagi</ModalTitle>
                    <ModalSubtitle title={fileName}>{fileName}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                {/* Tag input */}
                <Section>
                    <SectionLabel>Przypisane tagi</SectionLabel>
                    {localTags.length === 0 && (
                        <EmptyTagsHint style={{ marginBottom: 8 }}>Brak tagów — dodaj je poniżej</EmptyTagsHint>
                    )}
                    <TagInput
                        tags={localTags}
                        suggestions={suggestions}
                        onChange={handleTagsChange}
                        autoFocus
                    />
                </Section>

                {/* Quick suggestions */}
                {quickSuggestions.length > 0 && (
                    <Section>
                        <SectionLabel>Szybkie podpowiedzi</SectionLabel>
                        <SuggestionsRow>
                            {quickSuggestions.map(s => (
                                <SuggestionChipBtn
                                    key={s}
                                    type="button"
                                    onClick={() => handleTagsChange([...localTags, s])}
                                >
                                    <svg fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                        <line x1="5" y1="1" x2="5" y2="9" />
                                        <line x1="1" y1="5" x2="9" y2="5" />
                                    </svg>
                                    {s}
                                </SuggestionChipBtn>
                            ))}
                        </SuggestionsRow>
                    </Section>
                )}

                {/* Preview row */}
                {localTags.length > 0 && (
                    <Section>
                        <SectionLabel>Podgląd</SectionLabel>
                        <SuggestionsRow>
                            {localTags.map(t => (
                                <TagChip
                                    key={t}
                                    label={t}
                                    size="md"
                                    onRemove={() => handleTagsChange(localTags.filter(x => x !== t))}
                                />
                            ))}
                        </SuggestionsRow>
                    </Section>
                )}
            </ModalContent>

            <ModalFooter>
                <TagCount>
                    {localTags.length > 0
                        ? `${localTags.length} ${localTags.length === 1 ? 'tag' : 'tagi/tagów'}`
                        : 'Brak tagów'}
                </TagCount>
                <SharedButton
                    type="button"
                    $variant={isSaving ? 'secondary' : 'primary'}
                    $size="sm"
                    onClick={handleClose}
                    disabled={isSaving}
                >
                    {isSaving ? 'Zapisuję…' : 'Gotowe'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
