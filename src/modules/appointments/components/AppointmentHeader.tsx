// src/modules/appointments/components/AppointmentHeader.tsx
import styled from 'styled-components';
import { t } from '@/common/i18n';

const Header = styled.header`
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-bottom: ${props => props.theme.spacing.xxl};
    }
`;

const Title = styled.h1`
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0 0 ${props => props.theme.spacing.sm} 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xxxl};
    }
`;

const Subtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

export const AppointmentHeader = () => {
    return (
        <Header>
            <Title>{t.appointments.createView.title}</Title>
            <Subtitle>{t.appointments.createView.subtitle}</Subtitle>
        </Header>
    );
};