import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
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
import { useToast } from '@/common/components/Toast';
import {
    CancelBtn,
    DangerBtn,
    ErrorMsg,
    FieldInput,
    FieldLabel,
    FormField,
    HintText,
} from '../rbacShared.styles';
import { useCompanySettings } from '../../hooks/useCompany';
import {
    useAccountResetStatus,
    useLatestAccountReset,
    useStartAccountReset,
} from '../../hooks/useAccountReset';

const WarnBox = styled.div`
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const WarnTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #dc2626;
`;

const WarnText = styled.p`
    margin: 0;
    font-size: 13px;
    color: #0f172a;
    line-height: 1.6;
`;

const KeepBox = styled.div`
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const KeepTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
`;

const KeepList = styled.ul`
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
`;

const LegalNote = styled.p`
    margin: 0;
    font-size: 12px;
    color: #b91c1c;
    line-height: 1.5;
    font-weight: 500;
`;

const CheckboxRow = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: #0f172a;
    cursor: pointer;
    line-height: 1.5;

    input {
        margin-top: 2px;
        accent-color: #dc2626;
    }
`;

const ProgressWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 12px 0;
`;

const ProgressTrack = styled.div`
    height: 8px;
    background: #f1f5f9;
    border-radius: 999px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    background: #dc2626;
    border-radius: 999px;
    transition: width 400ms ease;
`;

const ProgressLabel = styled.p`
    margin: 0;
    font-size: 13px;
    color: #475569;
`;

const CONFIRMATION_NAME_LABEL = 'Przepisz nazwę firmy, aby potwierdzić';

interface ClearAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Nieodwracalne wyczyszczenie konta. Zamknięcie okna jest tu decyzją, więc
 * `dismissible={false}`: Escape i klik w tło nie wychodzą po cichu; krzyżyk
 * działa i jest jedyną drogą wyjścia z formularza. W trakcie czyszczenia okna
 * nie da się zamknąć wcale: job i tak dokończy się po stronie serwera, ale
 * użytkownik ma zobaczyć wynik, a nie klikać po aplikacji, którą właśnie czyści.
 */
export const ClearAccountModal = ({ isOpen, onClose }: ClearAccountModalProps) => {
    const { showSuccess } = useToast();
    const { company } = useCompanySettings();

    const [confirmationName, setConfirmationName] = useState('');
    const [password, setPassword] = useState('');
    const [wipeCompanyData, setWipeCompanyData] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [startedJobId, setStartedJobId] = useState<string | null>(null);

    const startReset = useStartAccountReset();
    // Po odświeżeniu strony w trakcie czyszczenia wracamy do widoku postępu,
    // zamiast pokazać formularz pozwalający zlecić reset po raz drugi.
    const { data: latestJob } = useLatestAccountReset(isOpen && startedJobId === null);
    const resumedJobId =
        latestJob && (latestJob.status === 'PENDING' || latestJob.status === 'RUNNING')
            ? latestJob.jobId
            : null;
    const jobId = startedJobId ?? resumedJobId;

    const { data: job } = useAccountResetStatus(jobId);

    useEffect(() => {
        if (job?.status === 'COMPLETED') {
            showSuccess('Konto wyczyszczone', 'Aplikacja uruchomi się ponownie z czystym kontem.');
            // Twardy reload zamiast czyszczenia cache po kawałku: po resecie nieaktualne
            // jest wszystko, a tak właśnie resetuje aplikację interceptor 401.
            const timer = setTimeout(() => window.location.assign('/'), 1500);
            return () => clearTimeout(timer);
        }
    }, [job?.status, showSuccess]);

    const companyName = company?.name?.trim() ?? '';
    const nameMatches = companyName.length > 0 && confirmationName.trim() === companyName;
    const canSubmit = nameMatches && password.length > 0 && !startReset.isPending;

    const resetForm = () => {
        setConfirmationName('');
        setPassword('');
        setWipeCompanyData(false);
        setFormError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = () => {
        if (!canSubmit) return;
        setFormError(null);
        startReset.mutate(
            { currentPassword: password, confirmationName: confirmationName.trim(), wipeCompanyData },
            {
                onSuccess: started => setStartedJobId(started.jobId),
                onError: (error: unknown) => {
                    const err = error as { response?: { data?: { message?: string } } };
                    setFormError(
                        err?.response?.data?.message ??
                            'Nie udało się rozpocząć czyszczenia konta. Spróbuj ponownie.'
                    );
                },
            }
        );
    };

    const inProgress = jobId !== null && job?.status !== 'FAILED';
    const failed = job?.status === 'FAILED';
    const progressPct = useMemo(() => {
        if (!job || job.totalSteps === 0) return 5;
        return Math.max(5, Math.round((job.currentStep / job.totalSteps) * 100));
    }, [job]);

    return (
        <ModalShell isOpen={isOpen} onClose={handleClose} size="md" dismissible={false}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wyczyść konto</ModalTitle>
                    <ModalSubtitle>
                        {inProgress
                            ? 'Trwa czyszczenie konta. Nie zamykaj tego okna.'
                            : 'Operacja jest nieodwracalna i obejmuje wszystkie dane studia.'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                {!inProgress && <CloseBtn onClick={handleClose} />}
            </ModalHeader>

            <ModalContent>
                {inProgress ? (
                    <ProgressWrap>
                        <ProgressTrack>
                            <ProgressFill $pct={progressPct} />
                        </ProgressTrack>
                        <ProgressLabel>
                            {job
                                ? `Krok ${Math.min(job.currentStep + 1, job.totalSteps || 1)} z ${job.totalSteps || '…'}${
                                      job.currentStepName ? `: ${job.currentStepName}` : ''
                                  }`
                                : 'Rozpoczynanie czyszczenia…'}
                        </ProgressLabel>
                        <HintText>
                            Czyszczenie dokończy się po stronie serwera nawet w razie utraty połączenia.
                            Po zakończeniu aplikacja uruchomi się ponownie.
                        </HintText>
                    </ProgressWrap>
                ) : failed ? (
                    <ProgressWrap>
                        <ErrorMsg>
                            Czyszczenie konta nie powiodło się{job?.error ? `: ${job.error}` : '.'}
                        </ErrorMsg>
                        <HintText>
                            Skontaktuj się z pomocą techniczną i podaj identyfikator operacji: {jobId}.
                            Żadne dane nie zostały częściowo &quot;przywrócone&quot;. Operację można
                            bezpiecznie wznowić po usunięciu przyczyny błędu.
                        </HintText>
                    </ProgressWrap>
                ) : (
                    <>
                        <WarnBox>
                            <WarnTitle>Zostaną bezpowrotnie usunięte:</WarnTitle>
                            <WarnText>
                                Wszystkie dane operacyjne studia (klienci, pojazdy, wizyty, pliki,
                                dokumenty finansowe, komunikacja, pracownicy i ustawienia) zostaną
                                trwale usunięte. Nie ma możliwości ich odzyskania.
                            </WarnText>
                        </WarnBox>
                        <KeepBox>
                            <KeepTitle>Zostaną zachowane:</KeepTitle>
                            <KeepList>
                                <li>Twoje konto właściciela i hasło,</li>
                                <li>plan subskrypcji, historia płatności i saldo SMS,</li>
                                <li>dziennik aktywności (z wpisem o tym czyszczeniu).</li>
                            </KeepList>
                        </KeepBox>
                        <LegalNote>
                            Usunięcie obejmuje dokumenty księgowe studia. Upewnij się, że masz ich kopie
                            wymagane przepisami. Odpowiedzialność za archiwizację pozostaje po stronie firmy.
                        </LegalNote>
                        <CheckboxRow>
                            <input
                                type="checkbox"
                                checked={wipeCompanyData}
                                onChange={e => setWipeCompanyData(e.target.checked)}
                            />
                            <span>
                                Usuń również dane firmy (nazwa, NIP, adres, konto bankowe). Konto będzie
                                dosłownie jak nowe.
                            </span>
                        </CheckboxRow>
                        <FormField>
                            <FieldLabel htmlFor="clear-account-name">
                                {CONFIRMATION_NAME_LABEL}: <strong>{companyName || '…'}</strong>
                            </FieldLabel>
                            <FieldInput
                                id="clear-account-name"
                                value={confirmationName}
                                onChange={e => setConfirmationName(e.target.value)}
                                placeholder={companyName}
                                autoComplete="off"
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel htmlFor="clear-account-password">Twoje hasło</FieldLabel>
                            <FieldInput
                                id="clear-account-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </FormField>
                        {formError && <ErrorMsg role="alert">{formError}</ErrorMsg>}
                    </>
                )}
            </ModalContent>

            {!inProgress && (
                <ModalFooter>
                    <CancelBtn onClick={handleClose}>{failed ? 'Zamknij' : 'Anuluj'}</CancelBtn>
                    {!failed && (
                        <DangerBtn onClick={handleSubmit} disabled={!canSubmit}>
                            {startReset.isPending ? 'Rozpoczynanie…' : 'Wyczyść konto bezpowrotnie'}
                        </DangerBtn>
                    )}
                </ModalFooter>
            )}
        </ModalShell>
    );
};
