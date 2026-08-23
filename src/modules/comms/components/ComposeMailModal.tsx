// src/modules/comms/components/ComposeMailModal.tsx
// Nowa wiadomość od zera — jedyna droga do napisania maila do kogoś, kto jeszcze
// nie napisał do nas. Reszta skrzynki jest odpowiedzią na cudzy ruch, więc ten
// jeden przycisk stoi tam, gdzie zaczyna się każda praca z listą: przy wyszukiwarce.
//
// Treść pisze ten sam ReplyComposer co w wątku (stopka, korekta, wysyłka) —
// w trybie bez wątku dokłada pola „Do" i „Temat".
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useMailAccounts } from '../hooks/useComms';
import { ReplyComposer } from './ReplyComposer';
import { EmptyHint } from './shared';

// Kompozytor przynosi własną górną krawędź i padding — w oknie byłaby to druga
// linia pod nagłówkiem, więc ją zdejmujemy.
const ComposerSlot = styled.div`
    > div {
        border-top: none;
        padding: 14px 20px 18px;
    }
`;

interface ComposeMailModalProps {
    onClose: () => void;
    /** Adres wpisany z góry — np. „napisz do tego klienta". */
    initialTo?: string;
}

export function ComposeMailModal({ onClose, initialTo }: ComposeMailModalProps) {
    const { data: accounts } = useMailAccounts();
    const activeAccount = accounts?.find((account) => account.status !== 'DISABLED');

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Nowa wiadomość</ModalTitle>
                    {activeAccount && <ModalSubtitle>Wyślemy z {activeAccount.emailAddress}</ModalSubtitle>}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            {activeAccount ? (
                <ComposerSlot>
                    <ReplyComposer
                        accountId={activeAccount.id}
                        initialTo={initialTo}
                        requireSubject
                        onSent={onClose}
                    />
                </ComposerSlot>
            ) : (
                <EmptyHint>Podłącz skrzynkę, żeby wysyłać wiadomości.</EmptyHint>
            )}
        </ModalShell>
    );
}
