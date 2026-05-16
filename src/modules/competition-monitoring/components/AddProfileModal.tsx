import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { useAddProfile } from '../hooks/useAddProfile';

// ─── Styles ───────────────────────────────────────────────────────────────────

const FieldLabel = styled.label`
    display: block;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    margin-bottom: 6px;
`;

const InputWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const AtSign = styled.span`
    position: absolute;
    left: 12px;
    font-size: ${st.fontMd};
    font-weight: 500;
    color: ${st.textMuted};
    pointer-events: none;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px 10px 28px;
    background: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontMd};
    color: ${st.text};
    outline: none;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    box-sizing: border-box;

    &::placeholder { color: ${st.textMuted}; }

    &:focus {
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

const ErrorMsg = styled.p`
    margin: 8px 0 0;
    font-size: ${st.fontSm};
    color: ${st.accentRed};
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface AddProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddProfileModal = ({ isOpen, onClose }: AddProfileModalProps) => {
    const [username, setUsername] = useState('');
    const [validationError, setValidationError] = useState('');
    const { addProfile, isAdding, isError, reset } = useAddProfile();

    const handleClose = useCallback(() => {
        setUsername('');
        setValidationError('');
        reset();
        onClose();
    }, [onClose, reset]);

    const handleSubmit = () => {
        const trimmed = username.trim().replace(/^@/, '');

        if (!trimmed) {
            setValidationError('Podaj nazwę użytkownika.');
            return;
        }
        if (!/^[a-zA-Z0-9._]{1,30}$/.test(trimmed)) {
            setValidationError('Nazwa użytkownika może zawierać tylko litery, cyfry, kropki i podkreślniki (max 30 znaków).');
            return;
        }

        setValidationError('');
        addProfile(trimmed, { onSuccess: handleClose });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="440px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj profil do obserwowania</ModalTitle>
                    <ModalSubtitle>
                        Profil trafi do kolejki oczekujących na akceptację managera.
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <div>
                    <FieldLabel htmlFor="instagram-username">Nazwa profilu Instagram</FieldLabel>
                    <InputWrapper>
                        <AtSign>@</AtSign>
                        <Input
                            id="instagram-username"
                            type="text"
                            placeholder="nazwa_profilu"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            disabled={isAdding}
                        />
                    </InputWrapper>

                    {validationError && <ErrorMsg>{validationError}</ErrorMsg>}
                    {isError && !validationError && (
                        <ErrorMsg>Nie udało się dodać profilu. Sprawdź nazwę i spróbuj ponownie.</ErrorMsg>
                    )}
                </div>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={handleClose} disabled={isAdding}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" $size="sm" onClick={handleSubmit} disabled={isAdding}>
                    {isAdding ? 'Dodawanie…' : 'Dodaj profil'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
