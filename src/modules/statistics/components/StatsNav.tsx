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

    /* Telefon: własny wiersz pod wyborem okresu (HdrBtns się zawija), na całą szerokość. */
    @media (max-width: 639px) {
        padding: 3px;
        width: 100%;
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

    /* Wcześniej na telefonie zostawały same ikony (font-size: 0): wykres, banknot
       i kartka nie mówiły, która zakładka to koszty, a która raporty (audyt RWD
       07.11.2026). Podpisy wracają, zakładki dzielą wiersz po równo. */
    @media (max-width: 639px) {
        flex: 1 1 0;
        min-width: 0;
        justify-content: center;
        gap: 6px;
        padding: 8px 6px;
    }

    /* Na 320-359 px trzy podpisy z ikonami się nie mieszczą - ikony ustępują. */
    @media (max-width: 359px) {
        svg { display: none; }
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
            Przychody
        </Tab>
        <Tab to="/statistics/costs">
            <Receipt />
            Koszty
        </Tab>
        <Tab to="/statistics/reports">
            <FileText />
            Raporty
        </Tab>
    </Nav>
);
