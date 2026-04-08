import styled from 'styled-components';
import { Clock } from 'lucide-react';

interface ComingSoonViewProps {
    pageName?: string;
}

export const ComingSoonView = ({ pageName }: ComingSoonViewProps) => {
    return (
        <Container>
            <IconWrapper>
                <Clock size={48} />
            </IconWrapper>
            {pageName && <PageName>{pageName}</PageName>}
            <Message>Ta strona zostanie zaprojektowana już niedługo</Message>
        </Container>
    );
};

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 400px;
    gap: 16px;
    color: #64748b;
`;

const IconWrapper = styled.div`
    color: #334155;
`;

const PageName = styled.h2`
    font-size: 18px;
    font-weight: 600;
    color: #475569;
    margin: 0;
`;

const Message = styled.p`
    font-size: 15px;
    color: #64748b;
    margin: 0;
`;
