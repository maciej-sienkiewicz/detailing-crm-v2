// src/modules/legal/views/LegalDocumentView.tsx
//
// Publiczna strona dokumentu prawnego (bez logowania): regulamin, polityka
// prywatności, klauzula, umowa powierzenia, instrukcja usuwania danych.
// Linkują do niej formularz rejestracji, ustawianie hasła przez pracownika oraz
// zewnętrzne serwisy (Google, Meta, Przelewy24), więc musi działać bez sesji.
//
// Design language mirrors the public Visit Card (/vc/:token): neutral light
// background, white bordered card, one restrained accent, mobile-first.

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { LEGAL_DOCUMENTS, legalPath, type LegalBlock, type LegalSlug } from '../documents';
import { PaymentFlags } from '../components/PaymentFlags';

const BG = '#f1f3f6';
const CARD = '#ffffff';
const BORDER = '#e4e7ec';
const INK = '#101828';
const MUTED = '#667085';
const ACCENT = '#0369a1';

// **pogrubienie**, adresy https:// i e-mail jako linki - tyle znaczników mają pliki treści.
const INLINE = /(\*\*[^*]+\*\*|https:\/\/[^\s,;)]+[^\s,;).]|[\w.+-]+@[\w-]+\.[\w.]+[a-z])/g;

function inline(text: string): ReactNode[] {
    return text.split(INLINE).filter(Boolean).map((part, i) => {
        if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('https://')) return <a key={i} href={part}>{part}</a>;
        if (/^[\w.+-]+@/.test(part)) return <a key={i} href={`mailto:${part}`}>{part}</a>;
        return <Fragment key={i}>{part}</Fragment>;
    });
}

function Block({ block }: { block: LegalBlock }) {
    switch (block.t) {
        case 'h':
            return <SectionTitle>{block.text}</SectionTitle>;
        case 'li':
            return <Item $indent={2}><Label>{block.n}</Label><span>{inline(block.text)}</span></Item>;
        case 'table':
            return (
                <TableWrap>
                    <table>
                        <thead><tr>{block.rows[0].map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                        <tbody>
                            {block.rows.slice(1).map((r, i) => (
                                <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </TableWrap>
            );
        default:
            return block.n
                ? <Item $indent={1}><Label>{block.n}</Label><span>{inline(block.text)}</span></Item>
                : <Para>{inline(block.text)}</Para>;
    }
}

export function LegalDocumentView({ slug }: { slug: LegalSlug }) {
    const doc = LEGAL_DOCUMENTS.find(d => d.slug === slug)!;
    const [loaded, setLoaded] = useState<{ slug: LegalSlug; blocks: LegalBlock[] } | null>(null);
    const blocks = loaded?.slug === slug ? loaded.blocks : null;

    useEffect(() => {
        let alive = true;
        doc.load().then(m => { if (alive) setLoaded({ slug: doc.slug, blocks: m.default }); });
        document.title = `${doc.title} – DetailBoost`;
        window.scrollTo(0, 0);
        return () => { alive = false; };
    }, [doc]);

    return (
        <Page>
            <Shell>
                <Nav aria-label="Dokumenty">
                    {LEGAL_DOCUMENTS.map(d => (
                        <NavLink key={d.slug} to={legalPath(d.slug)} aria-current={d.slug === slug ? 'page' : undefined}>
                            {d.title}
                        </NavLink>
                    ))}
                </Nav>
                <Card>
                    <Title>{doc.title}</Title>
                    <Meta>DetailBoost CRM · M&amp;M SOLUTIONS sp. z o.o. · ostatnia aktualizacja: {doc.updatedAt}</Meta>
                    {blocks
                        ? blocks.map((b, i) => <Block key={i} block={b} />)
                        : <Para>Wczytywanie…</Para>}
                </Card>
                <Footer>
                    Pytania dotyczące dokumentów: <a href="mailto:biuro@detailboost.pl">biuro@detailboost.pl</a>
                    {' · '}<Link to="/login">Zaloguj się</Link>
                    <FlagsRow><PaymentFlags /></FlagsRow>
                </Footer>
            </Shell>
        </Page>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${BG};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;

    a {
        color: ${ACCENT};
        overflow-wrap: anywhere;
    }
`;

const Shell = styled.div`
    max-width: 820px;
    margin: 0 auto;
    padding: 16px 16px 48px;

    @media (min-width: 640px) {
        padding: 28px 20px 64px;
    }
`;

const Nav = styled.nav`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
`;

const NavLink = styled(Link)`
    padding: 6px 12px;
    border: 1px solid ${BORDER};
    border-radius: 999px;
    background: ${CARD};
    color: ${MUTED} !important;
    font-size: 13px;
    text-decoration: none;

    &[aria-current='page'] {
        border-color: ${ACCENT};
        color: ${ACCENT} !important;
        font-weight: 600;
    }
`;

const Card = styled.article`
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 20px 18px;

    @media (min-width: 640px) {
        padding: 32px 36px;
    }
`;

const Title = styled.h1`
    margin: 0 0 4px;
    font-size: 24px;
    line-height: 1.25;
`;

const Meta = styled.p`
    margin: 0 0 20px;
    color: ${MUTED};
    font-size: 13px;
`;

const SectionTitle = styled.h2`
    margin: 28px 0 10px;
    font-size: 16px;
`;

const Para = styled.p`
    margin: 0 0 10px;
`;

const Item = styled.p<{ $indent: number }>`
    display: flex;
    gap: 8px;
    margin: 0 0 8px;
    padding-left: ${p => (p.$indent - 1) * 24}px;
`;

const Label = styled.span`
    flex: 0 0 auto;
    min-width: 20px;
    color: ${MUTED};
    font-variant-numeric: tabular-nums;
`;

const TableWrap = styled.div`
    overflow-x: auto;
    margin: 8px 0 16px;

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
    }

    th, td {
        border: 1px solid ${BORDER};
        padding: 6px 10px;
        text-align: left;
        vertical-align: top;
    }

    th {
        background: ${BG};
    }
`;

const FlagsRow = styled.span`
    display: flex;
    justify-content: center;
`;

const Footer = styled.div`
    margin-top: 16px;
    color: ${MUTED};
    font-size: 13px;
    text-align: center;
`;
