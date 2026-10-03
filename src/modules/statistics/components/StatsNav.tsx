// src/modules/statistics/components/StatsNav.tsx
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { TrendingUp, Receipt, FileText } from 'lucide-react';
import { st } from './StatisticsTheme';

const Nav = styled.nav`
    display: flex;
    gap: 2px;
    background: rgba(15, 23, 42, 0.05);
    border: 1px solid ${st.border};
    border-radius: 9999px;
    padding: 4px;
    width: fit-content;

    @media (max-width: 639px) {
        padding: 3px;
    }
`;

const Tab = styled(NavLink)`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 16px;
    border-radius: 9999px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    text-decoration: none;
    transition: all 180ms ease;
    white-space: nowrap;
    font-family: inherit;

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }

    @media (max-width: 639px) {
        font-size: 0;
        gap: 0;
        padding: 8px 10px;
        svg { width: 16px; height: 16px; }
    }

    &:hover {
        color: ${st.text};
        background: rgba(15, 23, 42, 0.04);
    }

    &.active {
        color: ${st.text};
        background: #ffffff;
        box-shadow: ${st.shadowXs};
    }
`;

export const StatsNav = () => (
    <Nav>
        <Tab to="/statistics" end>
            <TrendingUp />
            Przychody i sprzedaż
        </Tab>
        <Tab to="/statistics/costs">
            <Receipt />
            Koszta
        </Tab>
        <Tab to="/statistics/reports">
            <FileText />
            Raporty
        </Tab>
    </Nav>
);
