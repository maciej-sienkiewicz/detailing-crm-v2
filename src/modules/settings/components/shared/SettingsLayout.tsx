import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HelpItem {
    id: string;
    label: string;
    description: string;
    usedIn: string[];
}

export interface HelpContent {
    title: string;
    items: HelpItem[];
}

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const scaleIn = keyframes`
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
`;

// ─── SectionHeader ────────────────────────────────────────────────────────────

const HeaderWrap = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const CategoryLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #94a3b8;
    margin-bottom: 4px;
`;

const Title = styled.h2`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 5px;
    color: #0f172a;
    line-height: 1.2;
`;

const Description = styled.p`
    font-size: 13px;
    color: #475569;
    margin: 0;
    max-width: 640px;
    line-height: 1.6;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 2px;
    flex-shrink: 0;
`;

const LearnMoreBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    background: white;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;
    white-space: nowrap;

    &:hover {
        border-color: #0ea5e9;
        color: #0ea5e9;
        background: rgba(14, 165, 233, 0.04);
    }
`;

const QuestionIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export interface SectionHeaderProps {
    category?: string;
    title: string;
    description: string;
    help: HelpContent;
    children?: React.ReactNode;
}

export function SectionHeader({ category, title, description, help, children }: SectionHeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <HeaderWrap>
                <HeaderLeft>
                    {category && <CategoryLabel>{category}</CategoryLabel>}
                    <Title>{title}</Title>
                    <Description>{description}</Description>
                </HeaderLeft>

                <HeaderRight>
                    <LearnMoreBtn onClick={() => setOpen(true)}>
                        <QuestionIcon />
                        Dowiedz się więcej
                    </LearnMoreBtn>
                    {children}
                </HeaderRight>
            </HeaderWrap>

            {open && <HelpModal content={help} onClose={() => setOpen(false)} />}
        </>
    );
}

// ─── HelpModal ────────────────────────────────────────────────────────────────

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.44);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: ${fadeIn} 180ms ease;
`;

const ModalCard = styled.div`
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 780px;
    max-height: min(600px, 90vh);
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22), 0 4px 16px rgba(15, 23, 42, 0.1);
    animation: ${scaleIn} 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    overflow: hidden;
`;

const ModalHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

const ModalTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
`;

const ModalSubtitle = styled.span`
    font-size: 12px;
    font-weight: 400;
    color: #94a3b8;
    margin-left: 10px;
`;

const ModalCloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 150ms;
    flex-shrink: 0;

    &:hover {
        background: #f8fafc;
        color: #0f172a;
        border-color: #cbd5e1;
    }
`;

const ModalBody = styled.div`
    display: grid;
    grid-template-columns: 220px 1fr;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

// ─── Left nav ─────────────────────────────────────────────────────────────────

const NavSidebar = styled.nav`
    border-right: 1px solid #f1f5f9;
    overflow-y: auto;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #fafbfc;
`;

const NavItem = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    border: none;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.$active ? 600 : 500};
    color: ${p => p.$active ? '#0ea5e9' : '#475569'};
    cursor: pointer;
    text-align: left;
    transition: all 150ms;
    box-shadow: ${p => p.$active ? '0 1px 4px rgba(15,23,42,0.07)' : 'none'};
    position: relative;

    &:hover:not([data-active="true"]) {
        background: #f1f5f9;
        color: #0f172a;
    }
`;

const NavItemDot = styled.span<{ $active: boolean }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$active ? '#0ea5e9' : '#cbd5e1'};
    transition: background 150ms;
`;

// ─── Right content ────────────────────────────────────────────────────────────

const ContentPanel = styled.div`
    overflow-y: auto;
    padding: 28px 28px 32px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const ContentTitle = styled.h4`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.3px;
`;

const ContentDesc = styled.p`
    font-size: 14px;
    color: #334155;
    line-height: 1.75;
    margin: 0;
`;

const UsedInSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const UsedInLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
`;

const UsedInList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const UsedInRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #334155;
`;

const UsedInIcon = styled.div`
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: rgba(14, 165, 233, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #0284c7;
`;

const CheckSmIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const Divider = styled.div`
    height: 1px;
    background: #f1f5f9;
`;

function HelpModal({ content, onClose }: { content: HelpContent; onClose: () => void }) {
    const [activeId, setActiveId] = useState(content.items[0]?.id ?? '');
    const active = content.items.find(i => i.id === activeId) ?? content.items[0];

    return (
        <ModalOverlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard>
                <ModalHead>
                    <div>
                        <ModalTitle>
                            {content.title}
                            <ModalSubtitle>— przewodnik po polach</ModalSubtitle>
                        </ModalTitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    <NavSidebar>
                        {content.items.map(item => (
                            <NavItem
                                key={item.id}
                                $active={item.id === activeId}
                                onClick={() => setActiveId(item.id)}
                            >
                                <NavItemDot $active={item.id === activeId} />
                                {item.label}
                            </NavItem>
                        ))}
                    </NavSidebar>

                    {active && (
                        <ContentPanel key={active.id}>
                            <ContentTitle>{active.label}</ContentTitle>
                            <Divider />
                            <ContentDesc>{active.description}</ContentDesc>

                            {active.usedIn.length > 0 && (
                                <UsedInSection>
                                    <UsedInLabel>Gdzie jest używane</UsedInLabel>
                                    <UsedInList>
                                        {active.usedIn.map((place, i) => (
                                            <UsedInRow key={i}>
                                                <UsedInIcon>
                                                    <CheckSmIcon />
                                                </UsedInIcon>
                                                {place}
                                            </UsedInRow>
                                        ))}
                                    </UsedInList>
                                </UsedInSection>
                            )}
                        </ContentPanel>
                    )}
                </ModalBody>
            </ModalCard>
        </ModalOverlay>
    );
}

// ─── UnsavedChangesBanner ─────────────────────────────────────────────────────

const BannerRoot = styled.div<{ $visible: boolean }>`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2500;
    pointer-events: ${p => p.$visible ? 'auto' : 'none'};
    display: flex;
    justify-content: center;
    padding: 0 24px 24px;
    transform: translateY(${p => p.$visible ? '0' : 'calc(100% + 24px)'});
    opacity: ${p => p.$visible ? 1 : 0};
    transition: transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms;
`;

const BannerCard = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px 10px 16px;
    background: #1e293b;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.28), 0 2px 8px rgba(15, 23, 42, 0.14);
    max-width: 580px;
    width: 100%;
`;

const BannerIconWrap = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(245, 158, 11, 0.14);
    border: 1px solid rgba(245, 158, 11, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #f59e0b;
`;

const BannerText = styled.div`
    flex: 1;
    min-width: 0;
`;

const BannerTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    line-height: 1.3;
`;

const BannerSub = styled.div`
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.4;
`;

const BannerActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const BannerDiscardBtn = styled.button`
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;
    white-space: nowrap;

    &:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.22);
        color: #e2e8f0;
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const BannerSaveBtn = styled.button`
    padding: 7px 18px;
    border-radius: 8px;
    border: none;
    background: #0ea5e9;
    font-size: 13px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: #0284c7;
    }

    &:active:not(:disabled) {
        transform: scale(0.98);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const WarnIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export interface UnsavedChangesBannerProps {
    visible: boolean;
    onSave: () => void;
    onDiscard: () => void;
    isSaving?: boolean;
    sectionName?: string;
}

export function UnsavedChangesBanner({ visible, onSave, onDiscard, isSaving, sectionName }: UnsavedChangesBannerProps) {
    return (
        <BannerRoot $visible={visible}>
            <BannerCard>
                <BannerIconWrap>
                    <WarnIcon />
                </BannerIconWrap>

                <BannerText>
                    <BannerTitle>Niezapisane zmiany</BannerTitle>
                    <BannerSub>
                        {sectionName ? `Sekcja „${sectionName}" · ` : ''}
                        Opuszczenie strony bez zapisu spowoduje utratę zmian.
                    </BannerSub>
                </BannerText>

                <BannerActions>
                    <BannerDiscardBtn onClick={onDiscard} disabled={isSaving}>
                        Odrzuć
                    </BannerDiscardBtn>
                    <BannerSaveBtn onClick={onSave} disabled={isSaving}>
                        {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                    </BannerSaveBtn>
                </BannerActions>
            </BannerCard>
        </BannerRoot>
    );
}
