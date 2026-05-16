import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px 0 8px;
`;

const WarningBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #FEF9C3;
    border-left: 3px solid #EAB308;
    border-radius: ${st.radiusSm};
`;

const WarningIconWrap = styled.div`
    flex-shrink: 0;
    color: #CA8A04;
    display: flex;
    align-items: center;

    svg {
        width: 18px;
        height: 18px;
    }
`;

const WarningText = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #78350F;
    line-height: 1.4;
`;

const Description = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.55;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid ${st.border};
`;

const CancelBtn = styled.button`
    padding: 8px 18px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
    }
`;

const ConfirmBtn = styled.button`
    padding: 8px 20px;
    background: #EAB308;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: #CA8A04;
    }
`;

const TriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

interface SkipSigningConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const SkipSigningConfirmDialog = ({ isOpen, onConfirm, onCancel }: SkipSigningConfirmDialogProps) => (
    <ModalShell isOpen={isOpen} onClose={onCancel} maxWidth="440px">
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle>Pomiń podpisy?</ModalTitle>
            </ModalTitleGroup>
            <CloseBtn onClick={onCancel} />
        </ModalHeader>

        <ModalContent>
            <Body>
                <WarningBanner>
                    <WarningIconWrap><TriangleIcon /></WarningIconWrap>
                    <WarningText>Brak podpisów może utrudnić rozpatrzenie ewentualnych reklamacji.</WarningText>
                </WarningBanner>

                <Description>
                    Wizyta zostanie rozpoczęta bez zebrania podpisów na protokołach.
                    Brakujące podpisy możesz uzupełnić później w szczegółach wizyty.
                </Description>

                <Footer>
                    <CancelBtn onClick={onCancel}>Wróć, chcę zebrać podpisy</CancelBtn>
                    <ConfirmBtn onClick={onConfirm}>Rozpocznij bez podpisów</ConfirmBtn>
                </Footer>
            </Body>
        </ModalContent>
    </ModalShell>
);
