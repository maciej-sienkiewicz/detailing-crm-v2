// src/modules/photos/components/PhotoTagEditModal.tsx
// Modal for editing tags of a single photo – used in both check-in and visit views

import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { TagInput } from './TagInput';
import { TagChip } from './TagChip';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;
const slideUp = keyframes`
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: ${fadeIn} 180ms ease;
`;

const Modal = styled.div`
    width: 100%;
    max-width: 520px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowLg};
    overflow: hidden;
    animation: ${slideUp} 200ms ease;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

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

const HeaderText = styled.div`
    flex: 1;
    min-width: 0;
`;

const ModalTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const ModalSubtitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CloseBtn = styled.button`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${st.radiusSm};
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background ${st.transition}, color ${st.transition};
    flex-shrink: 0;

    &:hover {
        background: ${st.bgCardAlt};
        color: ${st.text};
    }

    svg { width: 18px; height: 18px; }
`;

const ModalBody = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
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

const ModalFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-top: 1px solid ${st.border};
    background: ${st.bg};
`;

const TagCount = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const SaveBtn = styled.button<{ $saving: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 20px;
    border-radius: ${st.radiusSm};
    border: none;
    background: ${p => p.$saving ? st.accentBlueDim : st.accentBlue};
    color: ${p => p.$saving ? st.accentBlue : '#fff'};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: ${p => p.$saving ? 'default' : 'pointer'};
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: #1D4ED8;
        color: #fff;
    }

    svg { width: 15px; height: 15px; }
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

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

    if (!isOpen) return null;

    return (
        <Backdrop onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <Modal>
                {/* Header */}
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
                    <HeaderText>
                        <ModalTitle>Edytuj tagi</ModalTitle>
                        <ModalSubtitle title={fileName}>{fileName}</ModalSubtitle>
                    </HeaderText>
                    <CloseBtn onClick={handleClose} type="button" title="Zamknij">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </CloseBtn>
                </ModalHeader>

                {/* Body */}
                <ModalBody>
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
                </ModalBody>

                {/* Footer */}
                <ModalFooter>
                    <TagCount>
                        {localTags.length > 0
                            ? `${localTags.length} ${localTags.length === 1 ? 'tag' : 'tagi/tagów'}`
                            : 'Brak tagów'}
                    </TagCount>
                    <SaveBtn
                        type="button"
                        $saving={isSaving}
                        onClick={handleClose}
                    >
                        {isSaving ? (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M12 2a10 10 0 1 0 10 10" strokeLinecap="round" />
                                </svg>
                                Zapisuję…
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Gotowe
                            </>
                        )}
                    </SaveBtn>
                </ModalFooter>
            </Modal>
        </Backdrop>
    );
};
