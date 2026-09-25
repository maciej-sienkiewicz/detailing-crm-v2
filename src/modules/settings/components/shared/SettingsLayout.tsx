// src/modules/settings/components/shared/SettingsLayout.tsx
//
// Wspólne klocki sekcji ustawień: przewodnik „Jak to działa" i pasek zapisu.
//
// Przewodnik był własną nakładką: bez Escape, bez blokady przewijania tła
// i z siatką 220px + reszta bez wersji na telefon (na treść zostawało ~100px).
// Teraz stoi na ModalShell, a na wąskim ekranie spis tematów zamienia się
// w poziomy pasek nad treścią.
//
// Pasek zapisu pojawia się tylko przy zmianach, mówi ile pól zmieniono i które
// wymaga poprawy („Pokaż pole" przewija do niego). Zgłasza też niezapisane zmiany
// ramie ustawień - to ona pyta przed wyjściem z sekcji. Wcześniej pasek pisał
// „Opuszczenie strony bez zapisu spowoduje utratę zmian", ale nikt tego nie pilnował.

import React, { useState } from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, CloseBtn,
} from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { useSettingsDirty } from './settingsChrome';

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface HelpItem {
    id: string;
    label: string;
    description: string;
    group?: string;
    usedIn: string[];
}

export interface HelpContent {
    title: string;
    items: HelpItem[];
}

// ─── Przewodnik ───────────────────────────────────────────────────────────────

const HelpBody = styled.div`
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 24px;
    min-height: 360px;

    @media (max-width: 720px) {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
        min-height: 0;
    }
`;

const Topics = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 16px;
    border-right: 1px solid ${ui.lineFaint};

    @media (max-width: 720px) {
        flex-direction: row;
        gap: 6px;
        padding: 0 0 10px;
        border-right: none;
        border-bottom: 1px solid ${ui.lineFaint};
        overflow-x: auto;
        overscroll-behavior-x: contain;
    }
`;

const TopicGroup = styled.span`
    padding: 10px 10px 4px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};

    &:first-child { padding-top: 0; }
    @media (max-width: 720px) { display: none; }
`;

const Topic = styled.button<{ $active: boolean }>`
    display: block;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 9px;
    background: ${p => p.$active ? ui.brandTint : 'transparent'};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.$active ? 600 : 500};
    color: ${p => p.$active ? ui.brandInk : ui.inkSoft};
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => p.$active ? ui.brandTint : ui.surfaceAlt}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }

    @media (max-width: 720px) {
        width: auto;
        flex-shrink: 0;
        white-space: nowrap;
        border: 1px solid ${p => p.$active ? ui.brandLine : ui.line};
        border-radius: 999px;
        padding: 6px 12px;
    }
`;

const Article = styled.article`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;

    h4 { margin: 0; font-size: 17px; font-weight: 700; color: ${ui.ink}; }
    p { margin: 0; font-size: 14px; line-height: 1.7; color: ${ui.inkSoft}; }
    ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
    li { font-size: 14px; line-height: 1.6; color: ${ui.inkSoft}; }
`;

const UsedIn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid ${ui.lineFaint};

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: ${ui.inkSoft}; }
    svg { width: 14px; height: 14px; color: ${ui.okInk}; flex-shrink: 0; }
`;

/** Akapity oddzielone pustą linią; linie zaczynające się od „•" albo „–" to lista. */
function renderDescription(text: string) {
    const out: React.ReactNode[] = [];
    let key = 0;
    text.split('\n\n').forEach(block => {
        let bullets: string[] = [];
        let lines: string[] = [];
        const flushBullets = () => {
            if (!bullets.length) return;
            out.push(<ul key={key++}>{bullets.map((b, i) => <li key={i}>{b.replace(/^[•–]\s*/, '')}</li>)}</ul>);
            bullets = [];
        };
        const flushLines = () => {
            if (!lines.length) return;
            out.push(<p key={key++}>{lines.join(' ')}</p>);
            lines = [];
        };
        block.split('\n').forEach(line => {
            if (line.startsWith('•') || line.startsWith('–')) {
                flushLines();
                bullets.push(line);
            } else {
                flushBullets();
                if (line !== '') lines.push(line);
            }
        });
        flushBullets();
        flushLines();
    });
    return out;
}

export function HelpModal({ content, onClose }: { content: HelpContent; onClose: () => void }) {
    const [activeId, setActiveId] = useState(content.items[0]?.id ?? '');
    const active = content.items.find(i => i.id === activeId) ?? content.items[0];

    const groups: Array<{ label: string | undefined; items: HelpItem[] }> = [];
    content.items.forEach(item => {
        const last = groups[groups.length - 1];
        if (last && last.label === item.group) last.items.push(item);
        else groups.push({ label: item.group, items: [item] });
    });

    return (
        <ModalShell isOpen onClose={onClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{content.title}</ModalTitle>
                    <ModalSubtitle>Jak działają ustawienia tej sekcji</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <HelpBody>
                    <Topics aria-label="Tematy">
                        {groups.map(({ label, items }) => (
                            <React.Fragment key={label ?? '__ungrouped'}>
                                {label && <TopicGroup>{label}</TopicGroup>}
                                {items.map(item => (
                                    <Topic
                                        key={item.id}
                                        type="button"
                                        $active={item.id === active?.id}
                                        aria-current={item.id === active?.id ? 'true' : undefined}
                                        onClick={() => setActiveId(item.id)}
                                    >
                                        {item.label}
                                    </Topic>
                                ))}
                            </React.Fragment>
                        ))}
                    </Topics>
                    {active && (
                        <Article key={active.id}>
                            <h4>{active.label}</h4>
                            {renderDescription(active.description)}
                            {active.usedIn.length > 0 && (
                                <UsedIn>
                                    <strong>Gdzie to działa</strong>
                                    {active.usedIn.map((place, i) => (
                                        <span key={i}><Check aria-hidden="true" />{place}</span>
                                    ))}
                                </UsedIn>
                            )}
                        </Article>
                    )}
                </HelpBody>
            </ModalContent>
        </ModalShell>
    );
}

// ─── Pasek zapisu ─────────────────────────────────────────────────────────────

/*
 * Stały przy dolnej krawędzi okna, bo `position: sticky` nie działa pod kontenerem
 * aplikacji z `overflow-x: hidden`. Na telefonie stoi nad dolną nawigacją.
 * Ciemny, żeby nie zlewał się z białymi kartami sekcji; jedyne wypełnienie to
 * „Zapisz zmiany" - otwarty edytor przejmuje okno (CLAUDE.md §2, wyjątek edytora).
 */
const Bar = styled.div`
    position: fixed;
    right: 24px;
    bottom: 20px;
    z-index: 1100;
    width: min(760px, calc(100vw - 48px));
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 18px;
    border-radius: 16px;
    background: #0f172a;
    color: #cbd5e1;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.32);
    font-size: 13.5px;
    line-height: 1.45;

    @media (max-width: 767px) {
        right: 12px;
        bottom: calc(76px + env(safe-area-inset-bottom, 0px));
        width: calc(100vw - 24px);
        flex-wrap: wrap;
        padding: 12px 14px;
    }
`;

const BarText = styled.p`
    flex: 1;
    min-width: 200px;
    margin: 0;

    strong { color: #fff; font-weight: 600; }
`;

const ShowProblem = styled.button`
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 600;
    color: #7dd3fc;
    text-decoration: underline;
    cursor: pointer;
`;

const BarActions = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 767px) { width: 100%; > * { flex: 1; } }
`;

const DiscardButton = styled(Button)`
    color: #e2e8f0;
    &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #fff; }
`;

/** 1 pole, 2 pola, 5 pól, 22 pola. */
function fieldsWord(n: number): string {
    if (n === 1) return 'pole';
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'pola' : 'pól';
}

export interface UnsavedChangesBannerProps {
    visible: boolean;
    onSave: () => void;
    onDiscard: () => void;
    isSaving?: boolean;
    /** Ile pól zmieniono - pasek mówi to zdaniem zamiast ogólnika. */
    changedCount?: number;
    /** Co blokuje zapis, np. „REGON wymaga poprawy". */
    problem?: string;
    /** Przewija do pola z problemem. */
    onShowProblem?: () => void;
    /** @deprecated Nazwa sekcji stoi w nagłówku ramy - pasek jej nie powtarza. */
    sectionName?: string;
}

export function UnsavedChangesBanner({
    visible, onSave, onDiscard, isSaving, changedCount, problem, onShowProblem,
}: UnsavedChangesBannerProps) {
    useSettingsDirty(visible);
    if (!visible) return null;

    const lead = changedCount ? `Zmieniono ${changedCount} ${fieldsWord(changedCount)}.` : 'Masz niezapisane zmiany.';

    return (
        <Bar role="region" aria-label="Niezapisane zmiany">
            <BarText>
                <strong>{lead}</strong>{' '}
                {problem ? (
                    <>
                        {problem}, zanim zapiszesz.{' '}
                        {onShowProblem && <ShowProblem type="button" onClick={onShowProblem}>Pokaż pole</ShowProblem>}
                    </>
                ) : 'Zapisz je albo cofnij, zanim wyjdziesz z sekcji.'}
            </BarText>
            <BarActions>
                <DiscardButton variant="ghost" onClick={onDiscard} disabled={isSaving}>Cofnij zmiany</DiscardButton>
                <Button variant="primary" onClick={onSave} disabled={isSaving}>
                    {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
            </BarActions>
        </Bar>
    );
}
