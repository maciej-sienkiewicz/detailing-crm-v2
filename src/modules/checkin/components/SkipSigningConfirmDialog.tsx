import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button } from '@/common/components/Button';

const DialogContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.md};
`;

const WarningHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.warning}15;
    border-left: 4px solid ${props => props.theme.colors.warning};
    border-radius: ${props => props.theme.radii.md};
`;

const WarningIcon = styled.div`
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${props => props.theme.colors.warning};
    border-radius: 50%;
    color: white;

    svg {
        width: 28px;
        height: 28px;
    }
`;

const WarningContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const WarningTitle = styled.h3`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin: 0;
`;

const WarningSubtitle = styled.p`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    margin: 0;
`;

const MessageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
`;

const MessageText = styled.p`
    font-size: ${props => props.theme.fontSizes.md};
    color: ${props => props.theme.colors.text};
    line-height: 1.6;
    margin: 0;
`;

const ConsequencesList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const ConsequenceItem = styled.li`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.5;

    &::before {
        content: '•';
        color: ${props => props.theme.colors.warning};
        font-size: ${props => props.theme.fontSizes.lg};
        font-weight: ${props => props.theme.fontWeights.bold};
        flex-shrink: 0;
        margin-top: -2px;
    }
`;

const FooterActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const PrimaryActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.md};
    justify-content: flex-end;
`;

const ConfirmButton = styled(Button)`
    background: ${props => props.theme.colors.warning};
    border-color: ${props => props.theme.colors.warning};

    &:hover:not(:disabled) {
        background: ${props => props.theme.colors.warningDark || props.theme.colors.warning};
        border-color: ${props => props.theme.colors.warningDark || props.theme.colors.warning};
    }
`;

const HelpText = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-align: center;
    padding: ${props => props.theme.spacing.sm};
    background: ${props => props.theme.colors.surfaceHover};
    border-radius: ${props => props.theme.radii.sm};
`;

interface SkipSigningConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const SkipSigningConfirmDialog = ({
    isOpen,
    onConfirm,
    onCancel,
}: SkipSigningConfirmDialogProps) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title="Potwierdzenie pominięcia podpisów"
            size="md"
        >
            <DialogContent>
                <WarningHeader>
                    <WarningIcon>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </WarningIcon>
                    <WarningContent>
                        <WarningTitle>Czy na pewno chcesz pominąć podpisy?</WarningTitle>
                        <WarningSubtitle>Ta operacja może mieć konsekwencje prawne</WarningSubtitle>
                    </WarningContent>
                </WarningHeader>

                <MessageContainer>
                    <MessageText>
                        Pominięcie podpisów na protokołach może skutkować następującymi konsekwencjami:
                    </MessageText>

                    <ConsequencesList>
                        <ConsequenceItem>
                            Trudności w przypadku zgłoszenia reklamacji przez klienta
                        </ConsequenceItem>
                        <ConsequenceItem>
                            Brak prawnego potwierdzenia stanu pojazdu przed serwisem
                        </ConsequenceItem>
                        <ConsequenceItem>
                            Ryzyko sporów dotyczących zakresu wykonanych usług
                        </ConsequenceItem>
                        <ConsequenceItem>
                            Możliwe problemy z ubezpieczeniem w przypadku roszczeń
                        </ConsequenceItem>
                    </ConsequencesList>

                    <HelpText>
                        Zalecamy zawsze zbieranie podpisów na wymaganych dokumentach.
                        Możesz później uzupełnić brakujące podpisy w szczegółach wizyty.
                    </HelpText>
                </MessageContainer>

                <FooterActions>
                    <PrimaryActions>
                        <Button $variant="secondary" onClick={onCancel}>
                            Anuluj, chcę zebrać podpisy
                        </Button>
                        <ConfirmButton $variant="primary" onClick={onConfirm}>
                            Tak, jestem pewny - rozpocznij wizytę
                        </ConfirmButton>
                    </PrimaryActions>
                </FooterActions>
            </DialogContent>
        </Modal>
    );
};
