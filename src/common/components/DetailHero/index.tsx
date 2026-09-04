// src/common/components/DetailHero/index.tsx
//
// Nagłówek karty szczegółów: ciemny pas z awatarem, nazwą, wierszem metadanych
// i akcjami. Wspólny dla kart klienta i pojazdu - obie odpowiadają na to samo
// pytanie („z czym mam do czynienia i co mogę z tym zrobić"), więc mają
// wyglądać tak samo. Same style; treść i akcje dokłada widok.

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

export const HeroHeader = styled.header`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border-radius: 16px;
    margin-bottom: 22px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,0,0,0.14);

    &::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -60px;
        width: 320px;
        height: 320px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 60%);
        pointer-events: none;
    }

    @media (max-width: 640px) {
        border-radius: 12px;
        margin-bottom: 14px;
    }
`;

export const HeroContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 22px 28px 20px;

    @media (max-width: 900px) {
        padding: 18px 20px 16px;
    }

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        padding: 14px 16px 14px;
    }
`;

export const HeroLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;

    @media (max-width: 640px) {
        width: 100%;
    }
`;

export const HeroAvatarLg = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    letter-spacing: -0.3px;
    border: 2px solid rgba(255,255,255,0.12);
    box-shadow: 0 4px 16px rgba(14,165,233,0.25);
`;

export const HeroNameBlock = styled.div`
    min-width: 0;
    flex: 1;
`;

export const HeroName = styled.h1`
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.15;
    color: #fff;
    word-break: break-word;

    @media (max-width: 900px) { font-size: 20px; }
    @media (max-width: 640px) { font-size: 18px; letter-spacing: -0.2px; }
`;

export const HeroMetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    font-size: 13px;
    color: #94a3b8;

    @media (max-width: 640px) { gap: 8px; font-size: 12px; }
`;

export const HeroMetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    svg { width: 13px; height: 13px; opacity: 0.65; flex-shrink: 0; }
`;

/**
 * Telefon i e-mail w nagłówku to nie etykiety, tylko skróty do kontaktu:
 * numer wybiera połączenie, adres otwiera nową wiadomość z wpisanym odbiorcą.
 */
export const HeroMetaAction = styled(HeroMetaItem).attrs({ as: 'button', type: 'button' })`
    background: none;
    border: none;
    padding: 2px 6px;
    margin: -2px -6px;
    border-radius: ${st.radiusFull};
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition}, color ${st.transition};

    &:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    &:hover svg { opacity: 1; }
`;


export const HeroRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 4px;

    @media (max-width: 640px) {
        width: 100%;
        padding-top: 0;
    }
`;

export const HeroPrimaryBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;
    white-space: nowrap;
    background: #0ea5e9;
    color: #fff;
    border: 1px solid #0ea5e9;
    box-shadow: 0 2px 8px rgba(14,165,233,0.35);
    svg { width: 15px; height: 15px; }

    &:hover {
        background: #0284c7;
        box-shadow: 0 4px 14px rgba(14,165,233,0.45);
        transform: translateY(-1px);
    }

    @media (max-width: 640px) { flex: 1; justify-content: center; padding: 11px 18px; font-size: 14px; }
`;

export const HeroKebabWrap = styled.div`
    position: relative;
    flex-shrink: 0;
`;

export const HeroKebabBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.08);
    color: #f1f5f9;
    cursor: pointer;
    transition: background 180ms ease;
    svg { width: 4px; height: 18px; }
    &:hover { background: rgba(255,255,255,0.15); }
`;

export const HeroKebabMenu = styled.div`
    position: fixed;
    min-width: 200px;
    background: #1e293b;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.45);
    z-index: 9000;
    overflow: hidden;
`;

export const HeroKebabItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 14px;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 140ms ease;
    color: ${p => p.$danger ? '#fca5a5' : '#e2e8f0'};

    &:last-child { border-bottom: none; }
    &:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    svg { width: 14px; height: 14px; flex-shrink: 0; opacity: 0.8; }
`;
