// src/modules/statistics/components/StatsNav.tsx
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { TrendingUp, Clock, Receipt } from 'lucide-react';
import { st } from './StatisticsTheme';

const Nav = styled.nav`
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 9999px;
    padding: 4px;
    width: fit-content;
`;

const Tab = styled(NavLink)`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 16px;
    border-radius: 9999px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    transition: all 180ms ease;
    white-space: nowrap;
    font-family: inherit;

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }

    &:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.08);
    }

    &.active {
        color: #f1f5f9;
        background: rgba(255, 255, 255, 0.14);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
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
        <Tab to="/statistics/delays">
            <Clock />
            Analiza opóźnień
        </Tab>
    </Nav>
);
