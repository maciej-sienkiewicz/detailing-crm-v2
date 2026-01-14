// src/modules/appointments/views/AppointmentEditView.tsx

import { useParams } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 48px 24px;
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 16px;
    text-align: center;
`;

const Description = styled.p`
    font-size: 16px;
    color: #64748b;
    text-align: center;
    max-width: 500px;
    line-height: 1.6;
`;

const ComingSoonBadge = styled.div`
    display: inline-block;
    padding: 8px 16px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 24px;
`;

export const AppointmentEditView = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();

    return (
        <Container>
            <ComingSoonBadge>Wkrótce dostępne</ComingSoonBadge>
            <Title>Edycja rezerwacji</Title>
            <Description>
                Funkcja edycji rezerwacji (ID: {appointmentId}) jest obecnie w trakcie implementacji.
                Będzie dostępna w najbliższej aktualizacji systemu.
            </Description>
        </Container>
    );
};
