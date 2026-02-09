// src/modules/calendar/views/CalendarPageView.tsx

import React from 'react';
import styled from 'styled-components';
import { CalendarView } from '../components/CalendarView';

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background: linear-gradient(135deg, #fafbff 0%, #f5f7ff 100%);
`;

const PageHeader = styled.div`
    padding: 28px 36px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);

    @media (max-width: 768px) {
        padding: 20px 20px;
    }

    @media (max-width: 480px) {
        padding: 16px 16px;
    }
`;

const PageTitle = styled.h1`
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.5px;

    @media (max-width: 768px) {
        font-size: 24px;
    }

    @media (max-width: 480px) {
        font-size: 20px;
    }
`;

const PageSubtitle = styled.p`
    font-size: 14px;
    color: #94a3b8;
    margin: 6px 0 0;
    font-weight: 400;

    @media (max-width: 480px) {
        font-size: 13px;
    }
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
