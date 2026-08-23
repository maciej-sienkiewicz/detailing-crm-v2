// src/modules/calendar/views/CalendarPageView.tsx

import React from 'react';
import styled from 'styled-components';
import { CalendarView } from '../components/CalendarView';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav';

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    width: 100%;
    background: #fff;
    overflow: hidden;

    /* Layout dokłada na telefonie dolny padding pod pasek nawigacji, więc pełne
       100dvh robiło stronę wyższą niż ekran. Dokument dostawał wtedy własny
       scroll, a każde scrollIntoView wewnątrz kalendarza przewijało całą stronę
       i wypychało pasek zakładek (Dzień/Miesiąc/Lista) poza widok. */
    @media (max-width: ${p => p.theme.breakpoints.md}) {
        height: calc(100dvh - ${BOTTOM_NAV_SPACE});
    }
`;

export const CalendarPageView: React.FC = () => {
    return (
        <PageContainer>
            <CalendarView />
        </PageContainer>
    );
};
