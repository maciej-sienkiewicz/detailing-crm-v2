import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { COMPANY_ADDRESS, COMPANY_CAPITAL, COMPANY_COURT, COMPANY_IDS, COMPANY_NAME } from '@/core/companyLegal';
import { AuthDotField } from './AuthDotField';
import { LEGAL_DOCUMENTS, legalPath, type LegalSlug } from '@/modules/legal/documents';
import { PaymentFlags } from '@/modules/legal/components/PaymentFlags';

/**
 * Brama między stroną detailboost.pl a aplikacją: ekran logowania, rejestracji
 * i resetu hasła ma ten sam podział co wnętrze CRM - ciemny pas po lewej (tam, gdzie
 * w aplikacji stoi pasek boczny) i jasna przestrzeń robocza po prawej.
 *
 * Lewy pas to scena strony, z której się przychodzi: czerń, złota poświata, żywa
 * siatka kropek, logo DetailBoost i jedno zdanie. Prawa strona to już język aplikacji: jasne
 * tło CRM, etykiety pól jak w formularzach aplikacji, ciemny przycisk w kolorze
 * jej paska bocznego. Bez karty, kafelka z literą i „lub" - sam formularz.
 *
 * Na telefonie lewy pas staje się pasem u góry: znak i zdanie, pod nim formularz.
 */
const drift = keyframes`
    from { transform: translate3d(-4%, -3%, 0) scale(1); }
    to { transform: translate3d(4%, 2%, 0) scale(1.08); }
`;

const Shell = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr;
    background: ${props => props.theme.colors.background};

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-rows: none;
        grid-template-columns: minmax(380px, 42%) 1fr;
    }
`;

const Brand = styled.aside`
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 24px 24px 32px;
    background: #08080a;
    color: #f4f4f2;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        position: sticky;
        top: 0;
        height: 100vh;
        height: 100dvh;
        justify-content: space-between;
        padding: 40px 48px;
    }

    /* Złota poświata u góry i chłodna z boku, jak pod nagłówkiem strony. */
    &::before {
        content: '';
        position: absolute;
        inset: -20% -20%;
        z-index: -2;
        pointer-events: none;
        background:
            radial-gradient(ellipse 55% 40% at 40% 10%, rgba(220, 174, 92, 0.16), transparent 70%),
            radial-gradient(ellipse 40% 45% at 0% 70%, rgba(200, 210, 230, 0.06), transparent 70%);
        filter: blur(8px);
        animation: ${drift} 26s ease-in-out infinite alternate;
    }

    @media (prefers-reduced-motion: reduce) {
        &::before {
            animation: none;
        }
    }
`;

const Dots = styled.div`
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    mask-image: radial-gradient(ellipse 85% 70% at 40% 45%, #000 30%, transparent 85%);
    -webkit-mask-image: radial-gradient(ellipse 85% 70% at 40% 45%, #000 30%, transparent 85%);
`;

/** Logo poziome z paczki marki, biała (Paper) wersja na ciemny pas. Proporcje 684,48 × 80,64. */
const Mark = styled.div`
    display: flex;
    align-items: center;

    img {
        display: block;
        height: 18px;
        width: auto;
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        img {
            height: 22px;
        }
    }
`;

const Statement = styled.div`
    max-width: 26rem;

    h2 {
        font-size: 28px;
        line-height: 1.08;
        font-weight: 700;
        letter-spacing: -0.03em;
        text-wrap: balance;
    }

    h2 span {
        color: #dcae5c;
    }

    ul {
        margin-top: 20px;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    li {
        display: grid;
        grid-template-columns: 14px 1fr;
        gap: 10px;
        align-items: baseline;
        font-size: 14px;
        line-height: 1.5;
        color: rgba(244, 244, 242, 0.7);
    }

    li::before {
        content: '';
        height: 1px;
        transform: translateY(-4px);
        background: #dcae5c;
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        h2 {
            font-size: 44px;
        }
        ul {
            margin-top: 28px;
        }
        li {
            font-size: 15px;
        }
    }
`;

/**
 * Dane spółki z KRS (src/core/companyLegal.ts). Na komputerze stoją na dole ciemnego
 * pasa, na telefonie - pod formularzem.
 */
const Legal = styled.footer`
    display: none;
    max-width: 26rem;
    font-size: 12px;
    line-height: 1.55;
    color: rgba(244, 244, 242, 0.4);

    strong {
        font-weight: 500;
        color: rgba(244, 244, 242, 0.6);
    }

    a {
        color: rgba(244, 244, 242, 0.6);
        text-decoration: none;

        &:hover {
            color: rgba(244, 244, 242, 0.9);
        }
    }

    > span {
        display: flex;
        flex-wrap: wrap;
        gap: 0 10px;
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        display: block;
    }
`;

const MobileLegal = styled.footer`
    width: 100%;
    max-width: 380px;
    margin-top: 40px;
    font-size: 11px;
    line-height: 1.55;
    text-align: center;
    color: ${props => props.theme.colors.textSecondary};

    strong {
        font-weight: 500;
    }

    a {
        color: inherit;
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    > span {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0 10px;
    }

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        display: none;
    }
`;

const FOOTER_DOCUMENTS: LegalSlug[] = ['regulamin', 'polityka-prywatnosci', 'formularz-odstapienia'];

function CompanyInfo() {
    return (
        <>
            <strong>© {new Date().getFullYear()} {COMPANY_NAME}</strong>
            <div>{COMPANY_ADDRESS}</div>
            <div>{COMPANY_COURT}</div>
            <span>
                {COMPANY_IDS.map((id) => (
                    <span key={id}>{id}</span>
                ))}
            </span>
            <div>{COMPANY_CAPITAL}</div>
            {/* Przelewy24 wymaga regulaminu i polityki pod ręką na każdej stronie przed zakupem. */}
            <span>
                {FOOTER_DOCUMENTS.map((slug) => {
                    const doc = LEGAL_DOCUMENTS.find((d) => d.slug === slug)!;
                    return (
                        <a key={slug} href={legalPath(slug)} target="_blank" rel="noopener noreferrer">
                            {doc.title}
                        </a>
                    );
                })}
            </span>
            <PaymentFlags />
        </>
    );
}

const Work = styled.main`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px 56px;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: 56px 48px;
    }
`;

const Column = styled.div<{ $wide: boolean }>`
    width: 100%;
    max-width: ${p => (p.$wide ? 480 : 380)}px;
`;

export function AuthLayout({
    statement,
    points,
    wide = false,
    children,
}: {
    /** Jedno zdanie na ciemnym pasie - bez kropki na końcu, kropkę stawia layout (złotą). */
    statement: string;
    /** Do trzech krótkich faktów pod zdaniem (np. warunki okresu próbnego). */
    points?: readonly string[];
    /** Szersza kolumna dla treści, która nie jest formularzem (wybór pakietu po rejestracji). */
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <Shell>
            <Brand>
                <Dots>
                    <AuthDotField strength={0.4} />
                </Dots>
                <Mark>
                    <img src="/brand/detailboost-horizontal-white.svg?v=3" alt="DetailBoost" width={685} height={81} />
                </Mark>
                <Statement>
                    <h2>
                        {statement}
                        <span>.</span>
                    </h2>
                    {points && points.length > 0 && (
                        <ul>
                            {points.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    )}
                </Statement>
                <Legal>
                    <CompanyInfo />
                </Legal>
            </Brand>
            <Work>
                <Column $wide={wide}>{children}</Column>
                <MobileLegal>
                    <CompanyInfo />
                </MobileLegal>
            </Work>
        </Shell>
    );
}
