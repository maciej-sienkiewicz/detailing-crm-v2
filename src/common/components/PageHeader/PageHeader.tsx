import React from 'react';
import styled from 'styled-components';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  /**
   * Zwykle tekst. Węzeł przyjmujemy dlatego, że w kreatorach tytułem strony jest
   * nazwa tworzonego obiektu - i wtedy najlepszym miejscem na jej wpisanie jest
   * właśnie ten nagłówek, a nie osobne pole gdzieś niżej.
   */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
//
// Tytuł strony leży na tle, bez ciemnej karty. Granatowy baner z poświatą stał
// na każdej liście obok granatowego paska bocznego - dwie ciężkie masy na
// ekranie, a tytuł mówił głośniej niż dane. Kalendarz i Leady miały już jasny
// nagłówek; teraz cała aplikacja mówi tym samym językiem. Ciemne nagłówki
// zostają tam, gdzie niosą treść: powitanie na pulpicie i karty wizyty,
// klienta i pojazdu.

const HeroCard = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 16px;
  flex-wrap: wrap;
  padding: 4px 0 2px;
`;

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const HeroHeading = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.4px;
  line-height: 1.15;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    font-size: 28px;
  }
`;

const HeroSubtitle = styled.div`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const HeroActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 639px) {
    width: 100%;
  }
`;

// ─── Licznik przy podtytule („142 klientów”) ─────────────────────────────────
//
// Jeden dla wszystkich list - wcześniej pięć widoków miało własną kopię w jaskrawym
// #0369a1 na jasnobłękitnym tle, która świeciła mocniej niż tytuł strony.

export const PageHeaderCount = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: rgba(3, 105, 161, 0.07);
  color: #0369a1;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1px;
  font-variant-numeric: tabular-nums;
`;

// ─── Primary action button, matches Dashboard "Nowa wizyta" style ────────────

// Głęboki, pełny błękit (jak główny przycisk w oknach), nie jaskrawe #0369a1 -
// akcja nagłówka nie musi świecić mocniej niż dane pod nią.
export const PageHeaderPrimaryButton = styled.button`
  background: #0369a1;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 6px rgba(3, 105, 161, 0.22);
  transition: all 180ms ease;
  font-family: inherit;

  &:hover {
    background: #075985;
    box-shadow: 0 4px 10px rgba(3, 105, 161, 0.28);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }

  /* Na telefonie akcja naglowka nie musi byc najwiekszym elementem ekranu. */
  @media (max-width: 639px) {
    padding: 8px 15px;
    font-size: 13px;
    gap: 6px;

    svg { width: 14px; height: 14px; }
  }
`;

export const PageHeaderGhostButton = styled.button`
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 180ms ease;
  font-family: inherit;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <HeroCard>
    <HeroText>
      <HeroHeading>{title}</HeroHeading>
      {subtitle && <HeroSubtitle>{subtitle}</HeroSubtitle>}
    </HeroText>
    {actions && <HeroActions>{actions}</HeroActions>}
  </HeroCard>
);
