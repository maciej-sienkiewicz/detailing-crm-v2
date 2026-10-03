import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { AuthDotField } from './AuthDotField';

/**
 * Brama między stroną detailboost.pl a aplikacją: ekran logowania, rejestracji
 * i resetu hasła ma ten sam podział co wnętrze CRM - ciemny pas po lewej (tam, gdzie
 * w aplikacji stoi pasek boczny) i jasna przestrzeń robocza po prawej.
 *
 * Lewy pas to scena strony, z której się przychodzi: czerń, złota poświata, żywa
 * siatka kropek, znak DB i jedno zdanie. Prawa strona to już język aplikacji: jasne
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

const Mark = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;

    img {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
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

const Legal = styled.p`
    display: none;
    font-size: 12px;
    color: rgba(244, 244, 242, 0.4);

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        display: block;
    }
`;

const Work = styled.main`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px 56px;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        padding: 56px 48px;
    }
`;

const Column = styled.div`
    width: 100%;
    max-width: 380px;
`;

export function AuthLayout({
    statement,
    points,
    children,
}: {
    /** Jedno zdanie na ciemnym pasie - bez kropki na końcu, kropkę stawia layout (złotą). */
    statement: string;
    /** Do trzech krótkich faktów pod zdaniem (np. warunki okresu próbnego). */
    points?: readonly string[];
    children: ReactNode;
}) {
    return (
        <Shell>
            <Brand>
                <Dots>
                    <AuthDotField strength={0.4} />
                </Dots>
                <Mark>
                    <img src="/icons/icon-192.png" alt="" />
                    DetailBoost
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
                <Legal>© {new Date().getFullYear()} M&amp;M Solutions sp. z o.o.</Legal>
            </Brand>
            <Work>
                <Column>{children}</Column>
            </Work>
        </Shell>
    );
}
