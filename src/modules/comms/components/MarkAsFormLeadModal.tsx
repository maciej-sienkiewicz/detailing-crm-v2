// src/modules/comms/components/MarkAsFormLeadModal.tsx
// „Oznacz mail jako lead z formularza".
//
// Formularz na stronie studia wysyła powiadomienia zawsze z tego samego adresu
// (wordpress@, no-reply@) — klient jest dopiero w TREŚCI maila. To okno tłumaczy,
// co stanie się po oznaczeniu, bo skutek wykracza poza jedno kliknięcie: każdy
// KOLEJNY mail z tego adresu też zostanie automatycznie zamieniony na leada.
// Akcja z niewidocznym ogonem bez wyjaśnienia to pułapka, nie funkcja.
//
// To samo okno obsługuje nadawcę już oznaczonego: pokazuje, że automat działa,
// ile leadów już utworzył, i daje przycisk wyłączenia. Jedna funkcja — jedno
// miejsce w interfejsie, niezależnie od stanu.
import styled from 'styled-components';
import { FileInput, Power } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import {
    useDeactivateFormSource,
    useFormMailSources,
    useMarkMessageAsFormLead,
} from '../hooks/useComms';
import { IconButton, PrimaryButton } from './shared';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textSecondary};

    strong { color: ${p => p.theme.colors.text}; }
`;

const Sender = styled.div`
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surfaceAlt};
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};
    word-break: break-all;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
`;

const ActiveNote = styled.div`
    padding: 10px 12px;
    border-radius: ${p => p.theme.radii.md};
    border: 1px solid #bae6fd;
    background: #f0f9ff;
    color: #0369a1;
    font-size: 12.5px;
    line-height: 1.5;
`;

interface MarkAsFormLeadModalProps {
    senderEmail: string;
    /** Ostatnia wiadomość przychodząca wątku — ona idzie do odczytu. */
    messageId: string | null;
    onClose: () => void;
}

export function MarkAsFormLeadModal({ senderEmail, messageId, onClose }: MarkAsFormLeadModalProps) {
    const { data: sources } = useFormMailSources();
    const mark = useMarkMessageAsFormLead();
    const deactivate = useDeactivateFormSource();
    const { showSuccess, showError } = useToast();

    const normalized = senderEmail.trim().toLowerCase();
    const source = sources?.find((entry) => entry.senderEmail === normalized);
    const isActive = source?.active === true;

    const submit = () => {
        if (!messageId) return;
        mark.mutate(messageId, {
            onSuccess: (result) => {
                switch (result.status) {
                    case 'CREATED':
                        showSuccess(
                            'Lead utworzony',
                            'Znajdziesz go w zakładce Leady. Kolejne maile z tego adresu będą zamieniane automatycznie.'
                        );
                        onClose();
                        break;
                    case 'ALREADY_PROCESSED':
                        showSuccess(
                            'Ta wiadomość była już przetworzona',
                            'Nadawca pozostaje oznaczony — kolejne maile obsłuży automat.'
                        );
                        onClose();
                        break;
                    default:
                        // Nadawca został oznaczony, ale z TEJ wiadomości lead nie powstał —
                        // to dwie osobne prawdy i obie muszą paść.
                        showError(
                            'Nadawca oznaczony, ale lead nie powstał',
                            result.reason ?? 'Nie udało się odczytać danych klienta z treści.'
                        );
                        onClose();
                }
            },
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się oznaczyć wiadomości', message ?? 'Spróbuj ponownie');
            },
        });
    };

    const disableAutomat = () => {
        if (!source) return;
        deactivate.mutate(source.id, {
            onSuccess: () => {
                showSuccess(
                    'Automat wyłączony',
                    'Maile z tego adresu nie będą już zamieniane na leady. Oznaczenie dowolnego maila włączy go z powrotem.'
                );
                onClose();
            },
            onError: () => showError('Nie udało się wyłączyć automatu', 'Spróbuj ponownie'),
        });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Lead z formularza</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Body>
                    <Sender>
                        <FileInput />
                        {senderEmail}
                    </Sender>

                    {isActive ? (
                        <>
                            <ActiveNote>
                                Ten nadawca jest oznaczony jako formularz — automat działa
                                {source && source.leadCount > 0
                                    ? ` i utworzył już ${source.leadCount} ${leadsLabel(source.leadCount)}.`
                                    : '.'}
                            </ActiveNote>
                            <p>
                                Możesz mimo to utworzyć leada z tej konkretnej wiadomości — na przykład
                                starszej niż oznaczenie, której automat nie obejmuje.
                            </p>
                        </>
                    ) : (
                        <p>
                            Dane klienta zostaną odczytane z <strong>treści</strong> tej wiadomości
                            i powstanie z nich lead. Od tej chwili <strong>każdy kolejny mail z tego
                            adresu</strong> będzie zamieniany na leada automatycznie — dokładnie tak
                            traktuje się powiadomienia formularza ze strony.
                        </p>
                    )}

                    {!messageId && (
                        <p>W tym wątku nie ma wiadomości przychodzącej, którą dałoby się odczytać.</p>
                    )}
                </Body>
            </ModalContent>
            <ModalFooter>
                {isActive && source && (
                    <IconButton
                        type="button"
                        onClick={disableAutomat}
                        disabled={deactivate.isPending}
                        style={{ marginRight: 'auto' }}
                    >
                        <Power />
                        {deactivate.isPending ? 'Wyłączanie…' : 'Wyłącz automat'}
                    </IconButton>
                )}
                <PrimaryButton onClick={submit} disabled={mark.isPending || !messageId}>
                    {mark.isPending
                        ? 'Czytam treść wiadomości…'
                        : isActive
                          ? 'Utwórz leada z tej wiadomości'
                          : 'Oznacz i utwórz leada'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}

/** Odmiana „lead/leady/leadów" — komunikat ma brzmieć po polsku. */
function leadsLabel(count: number): string {
    if (count === 1) return 'leada';
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    const plural = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14);
    return plural ? 'leady' : 'leadów';
}
