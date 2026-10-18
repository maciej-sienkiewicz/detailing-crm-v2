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
import { useAddProfile, useAddSelfProfile } from '../hooks/useAddProfile';
import { useInstagramProfiles } from '../hooks/useInstagramProfiles';
import { PHONE } from '../utils/phone';

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

/* Przyciski `sm` mają ~30 px - na telefonie rosną do 44 px i dzielą rząd po równo.
   Podwójne `&&`: wspólna stopka okna rozciąga `> button` regułą o wyższej wadze. */
const FooterButton = styled(SharedButton)`
    ${PHONE} {
        && {
            flex: 1 1 0;
            height: 44px;
            font-size: 14px;
            white-space: nowrap;
        }
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export type AddProfileMode = 'competitor' | 'self';

interface AddProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** `self` - własny profil studia: dodaje (jeśli trzeba) i od razu oznacza jako Twój. */
    mode?: AddProfileMode;
}

export const AddProfileModal = ({ isOpen, onClose, mode = 'competitor' }: AddProfileModalProps) => {
    const [username, setUsername] = useState('');
    const [validationError, setValidationError] = useState('');
    const { profiles } = useInstagramProfiles();
    const competitor = useAddProfile();
    const self = useAddSelfProfile(profiles);
    const isSelfMode = mode === 'self';
    const isAdding = isSelfMode ? self.isAddingSelf : competitor.isAdding;
    const isError = isSelfMode ? self.isSelfError : competitor.isError;
    const { reset: resetCompetitor } = competitor;
    const { resetSelf } = self;

    const handleClose = useCallback(() => {
        setUsername('');
        setValidationError('');
        resetCompetitor();
        resetSelf();
        onClose();
    }, [onClose, resetCompetitor, resetSelf]);

    const handleSubmit = () => {
        const trimmed = username.trim().replace(/^@/, '');

        if (!trimmed) {
            setValidationError('Podaj nazwę użytkownika.');
            return;
        }
        if (!/^[a-zA-Z0-9._]{1,30}$/.test(trimmed)) {
            setValidationError('Nazwa użytkownika może zawierać tylko litery, cyfry, kropki i podkreślniki (maks. 30 znaków).');
            return;
        }

        setValidationError('');
        if (isSelfMode) self.addSelf({ username: trimmed }, { onSuccess: handleClose });
        else competitor.addProfile({ username: trimmed }, { onSuccess: handleClose });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} maxWidth="440px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{isSelfMode ? 'Dodaj swój profil' : 'Dodaj konkurenta'}</ModalTitle>
                    <ModalSubtitle>
                        {isSelfMode
                            ? 'Konto Twojego studia. Porównamy je z konkurentami i policzymy plan publikacji.'
                            : 'Kierownik i właściciel dodają od razu, pozostali czekają na zatwierdzenie.'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <div>
                    <FieldLabel htmlFor="instagram-username">
                        {isSelfMode ? 'Nazwa Twojego profilu na Instagramie' : 'Nazwa profilu na Instagramie'}
                    </FieldLabel>
                    <InputWrapper>
                        <AtSign>@</AtSign>
                        <Input
                            id="instagram-username"
                            type="text"
                            placeholder={isSelfMode ? 'np. carslab_pl' : 'nazwa_profilu'}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            // Focus zostaje też na telefonie: wpisanie nazwy to jedyny krok tego okna.
                            // Nazwa profilu to nie zdanie - bez wielkiej litery i bez autokorekty,
                            // która z „detailing_pl" robiła „Detailing pl".
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="go"
                            disabled={isAdding}
                        />
                    </InputWrapper>

                    {validationError && <ErrorMsg>{validationError}</ErrorMsg>}
                    {isError && !validationError && (
                        <ErrorMsg>
                            {isSelfMode
                                ? 'Nie udało się zapisać Twojego profilu. Sprawdź nazwę i spróbuj ponownie.'
                                : 'Nie udało się dodać profilu. Sprawdź nazwę i spróbuj ponownie.'}
                        </ErrorMsg>
                    )}
                </div>
            </ModalContent>

            <ModalFooter>
                <FooterButton $variant="secondary" $size="sm" onClick={handleClose} disabled={isAdding}>
                    Anuluj
                </FooterButton>
                <FooterButton $variant="primary" $size="sm" onClick={handleSubmit} disabled={isAdding}>
                    {isAdding ? 'Zapisuję…' : isSelfMode ? 'To mój profil' : 'Dodaj konkurenta'}
                </FooterButton>
            </ModalFooter>
        </ModalShell>
    );
};
