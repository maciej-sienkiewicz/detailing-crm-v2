import styled from 'styled-components';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    padding: 32px;
    text-align: center;
    color: ${p => p.theme.colors.textSecondary};
`;

const IconWrap = styled.div`
    color: ${p => p.theme.colors.textSecondary};
    opacity: 0.4;
`;

const Title = styled.h2`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    margin: 0;
`;

const Description = styled.p`
    font-size: 0.875rem;
    max-width: 380px;
    margin: 0;
    line-height: 1.6;
`;

const BackButton = styled.button`
    margin-top: 8px;
    padding: 8px 20px;
    border-radius: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.text};
    font-size: 0.875rem;
    cursor: pointer;
    &:hover { background: ${p => p.theme.colors.backgroundSecondary}; }
`;

export function AccessDeniedView() {
    const navigate = useNavigate();
    return (
        <Wrapper>
            <IconWrap><ShieldOff size={48} /></IconWrap>
            <Title>Brak dostępu</Title>
            <Description>
                Nie masz uprawnień do wyświetlenia tej sekcji.
                Skontaktuj się z właścicielem konta, jeśli uważasz, że to błąd.
            </Description>
            <BackButton onClick={() => navigate('/dashboard')}>Wróć do tablicy</BackButton>
        </Wrapper>
    );
}
