// src/modules/statistics/components/StatsNav.tsx
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { TrendingUp, Clock } from 'lucide-react';
import { st } from './StatisticsTheme';

const Nav = styled.nav`
    display: flex;
    gap: 2px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 4px;
    width: fit-content;
`;

const Tab = styled(NavLink)`
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 16px;
    border-radius: 10px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    text-decoration: none;
    transition: all ${st.transition};
    white-space: nowrap;

    svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }

    &:hover {
        color: ${st.text};
        background: ${st.bgCard};
    }

    &.active {
        color: ${st.text};
        background: ${st.bgCard};
        box-shadow: ${st.shadowSm};
    }
`;

export const StatsNav = () => (
    <Nav>
        <Tab to="/statistics" end>
            <TrendingUp />
            Przychody i sprzedaż
        </Tab>
        <Tab to="/statistics/delays">
            <Clock />
            Analiza opóźnień
        </Tab>
    </Nav>
);
