// src/modules/gallery/components/GalleryLightbox.tsx

import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { PiiValue } from '@/common/pii';
import { useNavigate } from 'react-router-dom';
import { TagChip } from '@/modules/photos/components/TagChip';
import type { GalleryPhoto } from '../types';

// ─── animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); }`;

// ─── backdrop ─────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${p => p.theme.spacing.md};
    animation: ${fadeIn} 0.18s ease;

    @media (max-width: 768px) {
        padding: 0;
        align-items: flex-end;
    }
`;

// ─── modal shell ──────────────────────────────────────────────────────────────

const Modal = styled.div`
    position: relative;
    display: flex;
    width: 100%;
    max-width: 1100px;
    max-height: 90vh;
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.55);
    animation: ${slideUp} 0.22s ease;

    @media (max-width: 768px) {
        flex-direction: column;
        max-height: 95vh;
        border-radius: ${p => p.theme.radii.xl} ${p => p.theme.radii.xl} 0 0;
    }
`;

// ─── left: image area ─────────────────────────────────────────────────────────

const ImageArea = styled.div`
    flex: 1;
    min-width: 0;
    background: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;

    @media (max-width: 768px) {
        height: 240px;
        flex: none;
    }
`;

const MainImage = styled.img`
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
`;

const FullResBtn = styled.a`
    position: absolute;
    bottom: ${p => p.theme.spacing.md};
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.12);
    color: white;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    border-radius: ${p => p.theme.radii.full};
    text-decoration: none;
    backdrop-filter: blur(6px);
    transition: background 0.15s ease;
    white-space: nowrap;

    &:hover { background: rgba(255, 255, 255, 0.22); }

    svg { width: 14px; height: 14px; }
`;

const SourceBadgeImg = styled.span<{ $source: 'VEHICLE' | 'VISIT' }>`
    position: absolute;
    top: ${p => p.theme.spacing.md};
    left: ${p => p.theme.spacing.md};
    padding: 4px 10px;
    border-radius: ${p => p.theme.radii.full};
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    ${p => p.$source === 'VISIT' ? `
        background: rgba(16,185,129,0.85);
        color: white;
    ` : `
        background: rgba(14,165,233,0.85);
        color: white;
    `}
`;

// ─── right: info panel ────────────────────────────────────────────────────────

const InfoPanel = styled.div`
    width: 320px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid ${p => p.theme.colors.border};
    overflow-y: auto;

    @media (max-width: 768px) {
        width: 100%;
        border-left: none;
        border-top: 1px solid ${p => p.theme.colors.border};
        flex: 1;
        overflow-y: auto;
    }
`;

const InfoHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${p => p.theme.spacing.md} ${p => p.theme.spacing.lg};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    flex-shrink: 0;
`;

const InfoTitle = styled.h3`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const CloseBtn = styled.button`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
        background: #fee2e2;
        color: #dc2626;
    }

    svg { width: 16px; height: 16px; }
`;

const InfoBody = styled.div`
    padding: ${p => p.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.lg};
    flex: 1;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.sm};
`;

const SectionLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${p => p.theme.colors.textMuted};
`;

const SectionValue = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    word-break: break-word;
`;

const MetaRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${p => p.theme.spacing.sm};
`;

const MetaIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surfaceAlt};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${p => p.theme.colors.textMuted};

    svg { width: 15px; height: 15px; }
`;

const MetaContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const MetaLabel = styled.span`
    font-size: 10px;
    color: ${p => p.theme.colors.textMuted};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const MetaVal = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    font-weight: 500;
    word-break: break-word;
`;

const TagsWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid ${p => p.theme.colors.border};
    margin: 0;
`;

const LinksSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${p => p.theme.spacing.sm};
`;

const LinkButton = styled.button`
    display: flex;
    align-items: center;
    gap: ${p => p.theme.spacing.sm};
    padding: ${p => p.theme.spacing.sm} ${p => p.theme.spacing.md};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    width: 100%;

    &:hover {
        background: rgba(14, 165, 233, 0.06);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    svg { width: 15px; height: 15px; flex-shrink: 0; }

    span {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .arrow {
        flex-shrink: 0;
        opacity: 0.4;
    }
`;

const DescBox = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    line-height: 1.5;
    font-style: italic;
`;

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── component ─────────────────────────────────────────────────────────────────

interface GalleryLightboxProps {
    photo: GalleryPhoto;
    onClose: () => void;
}

export const GalleryLightbox = ({ photo, onClose }: GalleryLightboxProps) => {
    const navigate = useNavigate();

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const vehicleLabel = [photo.vehicleBrand, photo.vehicleModel].filter(Boolean).join(' ');
    const vehicleSubLabel = [photo.vehicleLicensePlate, photo.vehicleYear].filter(Boolean).join(' · ');

    return (
        <Backdrop onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>

                {/* ── Image side ── */}
                <ImageArea>
                    <SourceBadgeImg $source={photo.source}>
                        {photo.source === 'VISIT' ? 'Wizyta' : 'Pojazd'}
                    </SourceBadgeImg>

                    <MainImage
                        src={photo.thumbnailUrl}
                        alt={photo.description ?? photo.fileName}
                    />

                    <FullResBtn
                        href={photo.fullSizeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                        Pełna rozdzielczość
                    </FullResBtn>
                </ImageArea>

                {/* ── Info panel ── */}
                <InfoPanel>
                    <InfoHeader>
                        <InfoTitle>Szczegóły zdjęcia</InfoTitle>
                        <CloseBtn onClick={onClose} title="Zamknij">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </CloseBtn>
                    </InfoHeader>

                    <InfoBody>
                        {/* File info */}
                        <Section>
                            <MetaRow>
                                <MetaIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                        <polyline points="13 2 13 9 20 9" />
                                    </svg>
                                </MetaIcon>
                                <MetaContent>
                                    <MetaLabel>Nazwa pliku</MetaLabel>
                                    <MetaVal>{photo.fileName}</MetaVal>
                                </MetaContent>
                            </MetaRow>

                            <MetaRow>
                                <MetaIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </MetaIcon>
                                <MetaContent>
                                    <MetaLabel>Data dodania</MetaLabel>
                                    <MetaVal>{formatDate(photo.uploadedAt)}</MetaVal>
                                </MetaContent>
                            </MetaRow>

                            <MetaRow>
                                <MetaIcon>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </MetaIcon>
                                <MetaContent>
                                    <MetaLabel>Dodał/a</MetaLabel>
                                    <MetaVal>{photo.uploadedByName}</MetaVal>
                                </MetaContent>
                            </MetaRow>
                        </Section>

                        {/* Description */}
                        {photo.description && (
                            <>
                                <Divider />
                                <Section>
                                    <SectionLabel>Opis</SectionLabel>
                                    <DescBox>{photo.description}</DescBox>
                                </Section>
                            </>
                        )}

                        {/* Tags */}
                        {photo.tags.length > 0 && (
                            <>
                                <Divider />
                                <Section>
                                    <SectionLabel>Tagi</SectionLabel>
                                    <TagsWrap>
                                        {photo.tags.map(tag => (
                                            <TagChip key={tag} label={tag} size="sm" />
                                        ))}
                                    </TagsWrap>
                                </Section>
                            </>
                        )}

                        <Divider />

                        {/* Navigation links */}
                        <LinksSection>
                            <SectionLabel>Przejdź do</SectionLabel>

                            {photo.vehicleId && (
                                <LinkButton onClick={() => { navigate(`/vehicles/${photo.vehicleId}`); onClose(); }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="1" y="3" width="15" height="13" rx="2" />
                                        <path d="M16 8h4l3 3v5h-7V8z" />
                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                    </svg>
                                    <span>
                                        <strong style={{ display: 'block', lineHeight: 1.3 }}>
                                            {vehicleLabel || 'Pojazd'}
                                        </strong>
                                        {vehicleSubLabel && (
                                            <span style={{ fontSize: '11px', opacity: 0.6 }}>{vehicleSubLabel}</span>
                                        )}
                                    </span>
                                    <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </LinkButton>
                            )}

                            {photo.visitId && (
                                <LinkButton onClick={() => { navigate(`/visits/${photo.visitId}`); onClose(); }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    <span>
                                        <strong style={{ display: 'block', lineHeight: 1.3 }}>Wizyta</strong>
                                        {photo.visitNumber && (
                                            <span style={{ fontSize: '11px', opacity: 0.6 }}>{photo.visitNumber}</span>
                                        )}
                                    </span>
                                    <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </LinkButton>
                            )}

                            {photo.customerId && (
                                <LinkButton onClick={() => { navigate(`/customers/${photo.customerId}`); onClose(); }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>
                                        <strong style={{ display: 'block', lineHeight: 1.3 }}>Klient</strong>
                                        {photo.customerName && (
                                            <span style={{ fontSize: '11px', opacity: 0.6 }}><PiiValue value={photo.customerName} kind="name" /></span>
                                        )}
                                    </span>
                                    <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </LinkButton>
                            )}
                        </LinksSection>
                    </InfoBody>
                </InfoPanel>
            </Modal>
        </Backdrop>
    );
};
