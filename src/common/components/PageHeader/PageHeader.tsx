import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HeroCard = styled.div`
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #0c1f35 100%);
  border-radius: ${(p) => p.theme.radii.xl};
  padding: 28px 32px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 8px 32px rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  &::before {
    content: '';
    position: absolute;
    top: -80px;
    right: -60px;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, transparent 65%);
    pointer-events: none;
  }

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    padding: 22px 20px;
  }
`;

const HeroText = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HeroHeading = styled.h1`
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.5px;
  line-height: 1.1;

  @media (min-width: ${(p) => p.theme.breakpoints.md}) {
    font-size: 34px;
  }
`;

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #475569;
  font-weight: 500;
`;

const HeroActions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

// ─── Primary action button — matches Dashboard "Nowa wizyta" style ────────────

export const PageHeaderPrimaryButton = styled.button`
  background: #0ea5e9;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
  transition: all 180ms ease;
  font-family: inherit;

  &:hover {
    background: #0284c7;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }
`;

export const PageHeaderGhostButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(4px);
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 180ms ease;
  font-family: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
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
