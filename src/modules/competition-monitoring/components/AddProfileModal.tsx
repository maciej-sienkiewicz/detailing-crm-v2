import { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAddProfile } from '../hooks/useAddProfile';

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: ${fadeIn} 180ms ease;
`;

const Dialog = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radiusLg};
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 440px;
    padding: 28px;
    animation: ${slideUp} 220ms ease;
`;

const DialogTitle = styled.h2`
    margin: 0 0 6px;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const DialogSubtitle = styled.p`
    margin: 0 0 24px;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.5;
`;

const Label = styled.label`
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

    &::placeholder {
        color: ${st.textMuted};
    }

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

const Actions = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 24px;
    justify-content: flex-end;
`;

const CancelBtn = styled.button`
    padding: 9px 18px;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
        border-color: ${st.borderHover};
    }
`;

const SubmitBtn = styled.button`
    padding: 9px 20px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 1px 4px rgba(59, 130, 246, 0.25);

    &:hover:not(:disabled) {
        background: #2563EB;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

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
        if (e.key === 'Escape') handleClose();
    };

    if (!isOpen) return null;

    return (
        <Overlay onClick={handleClose}>
            <Dialog onClick={e => e.stopPropagation()}>
                <DialogTitle>Dodaj profil do obserwowania</DialogTitle>
                <DialogSubtitle>
                    Profil trafi do kolejki oczekujących na akceptację managera. Po zatwierdzeniu dane będą synchronizowane raz w tygodniu.
                </DialogSubtitle>

                <Label htmlFor="instagram-username">Nazwa profilu Instagram</Label>
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

                <Actions>
                    <CancelBtn onClick={handleClose} disabled={isAdding}>Anuluj</CancelBtn>
                    <SubmitBtn onClick={handleSubmit} disabled={isAdding}>
                        {isAdding ? 'Dodawanie…' : 'Dodaj profil'}
                    </SubmitBtn>
                </Actions>
            </Dialog>
        </Overlay>
    );
};
