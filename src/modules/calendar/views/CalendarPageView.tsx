// src/modules/calendar/views/CalendarPageView.tsx

import React from 'react';
import styled from 'styled-components';
import { CalendarView } from '../components/CalendarView';

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background: #fff;
`;

export const CalendarPageView: React.FC = () => {
    return (
        <PageContainer>
            <CalendarView />
        </PageContainer>
    );
};
