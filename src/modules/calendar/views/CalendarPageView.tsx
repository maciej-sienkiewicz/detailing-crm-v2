// src/modules/calendar/views/CalendarPageView.tsx

import React from 'react';
import styled from 'styled-components';
import { CalendarView } from '../components/CalendarView';

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background: #ffffff;
`;

const PageHeader = styled.div`
    padding: 24px 32px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
`;

const PageTitle = styled.h1`
    font-size: 28px;
    font-weight: 400;
    color: #1f2937;
    margin: 0;
`;

const PageSubtitle = styled.p`
    font-size: 14px;
    color: #6b7280;
    margin: 8px 0 0;
`;

const CalendarContent = styled.div`
    flex: 1;
    overflow: hidden;
    padding: 0;
`;

export const CalendarPageView: React.FC = () => {
    return (
        <PageContainer>
            <PageHeader>
                <PageTitle>Kalendarz</PageTitle>
                <PageSubtitle>
                    Zarządzaj wizytami i terminami. Kliknij lub przeciągnij, aby utworzyć nowy termin.
                </PageSubtitle>
            </PageHeader>

            <CalendarContent>
                <CalendarView />
            </CalendarContent>
        </PageContainer>
    );
};
