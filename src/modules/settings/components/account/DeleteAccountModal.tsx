import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { detachNativePush } from '@/modules/push/native/nativePush';
import { CancelBtn, DangerBtn, ErrorMsg, FieldInput, FieldLabel, FormField } from '../rbacShared.styles';
import { useCompanySettings } from '../../hooks/useCompany';
import { accountResetApi } from '../../api/accountResetApi';
import { LegalNote, WarnBox, WarnText, WarnTitle } from './dangerZone.styles';
import { problemDetail } from '@/core/problem';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Usunięcie konta firmy - wymóg sklepów z aplikacjami (App Store 5.1.1(v)) i prawo
 * z RODO. To samo potwierdzenie co przy wyczyszczeniu (nazwa firmy i hasło), ale bez
 * okna postępu: serwer od razu kończy sesje wszystkich osób, więc po odpowiedzi nie ma
 * już kogo informować o krokach - wracamy do logowania.
 */
export const DeleteAccountModal = ({ isOpen, onClose }: DeleteAccountModalProps) => {
    const { company } = useCompanySettings();
    const [confirmationName, setConfirmationName] = useState('');
    const [password, setPassword] = useState('');
    const [deleted, setDeleted] = useState(false);

    const deletion = useMutation({
        mutationFn: async () => {
            // Póki sesja żyje: telefon z aplikacją przestaje czekać na powiadomienia tego konta.
            await detachNativePush();
            await accountResetApi.deleteAccount({ currentPassword: password, confirmationName: confirmationName.trim() });
        },
        onSuccess: () => setDeleted(true),
    });

    const companyName = company?.name?.trim() ?? '';
    const nameMatches = companyName.length > 0 && confirmationName.trim() === companyName;
    const canSubmit = nameMatches && password.length > 0 && !deletion.isPending;
    const errorMessage = deletion.isError
        ? problemDetail(deletion.error)
            ?? 'Nie udało się usunąć konta. Spróbuj jeszcze raz.'
        : null;

    const handleClose = () => {
        setConfirmationName('');
        setPassword('');
        deletion.reset();
        onClose();
    };

    // Sesja już nie istnieje - twardy powrót do logowania czyści całą pamięć aplikacji.
    const finish = () => window.location.assign('/login');

    if (deleted) {
        return (
            <ModalShell isOpen={isOpen} onClose={finish} size="sm" dismissible={false}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Konto usunięte</ModalTitle>
                    </ModalTitleGroup>
                </ModalHeader>
                <ModalContent>
                    <WarnText>
                        Wszyscy zostali wylogowani. Dane usuwamy w tle, to potrwa kilka minut.
                        Dziękujemy, że byliście z nami.
                    </WarnText>
                </ModalContent>
                <ModalFooter>
                    <CancelBtn onClick={finish}>Zamknij</CancelBtn>
                </ModalFooter>
            </ModalShell>
        );
    }

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="md" dismissible={false}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Usuń konto</ModalTitle>
                    <ModalSubtitle>Tego nie da się cofnąć.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={handleClose} />
            </ModalHeader>

            <ModalContent>
                <WarnBox>
                    <WarnTitle>Co się stanie</WarnTitle>
                    <WarnText>
                        Usuniemy klientów, pojazdy, wizyty, zdjęcia, dokumenty, wiadomości, dane firmy
                        i konta całego zespołu. Nikt już się nie zaloguje, a abonament się zakończy.
                    </WarnText>
                    <WarnText>
                        Zostawiamy tylko to, co każe prawo: historię płatności za abonament i dziennik
                        zmian na koncie.
                    </WarnText>
                </WarnBox>
                <LegalNote>
                    Pobierz wcześniej faktury i dokumenty, które musisz przechowywać.
                </LegalNote>
                <FormField>
                    <FieldLabel htmlFor="delete-account-name">
                        Przepisz nazwę firmy: <strong>{companyName || '…'}</strong>
                    </FieldLabel>
                    <FieldInput
                        id="delete-account-name"
                        value={confirmationName}
                        onChange={e => setConfirmationName(e.target.value)}
                        placeholder="Nazwa firmy"
                        autoComplete="off"
                    />
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="delete-account-password">Twoje hasło</FieldLabel>
                    <FieldInput
                        id="delete-account-password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </FormField>
                {errorMessage && <ErrorMsg role="alert">{errorMessage}</ErrorMsg>}
            </ModalContent>

            <ModalFooter>
                <CancelBtn onClick={handleClose}>Anuluj</CancelBtn>
                <DangerBtn onClick={() => deletion.mutate()} disabled={!canSubmit}>
                    {deletion.isPending ? 'Usuwanie…' : 'Usuń konto na zawsze'}
                </DangerBtn>
            </ModalFooter>
        </ModalShell>
    );
};
