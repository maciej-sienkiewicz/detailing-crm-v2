// src/modules/settings/components/settlements/ApproveAttendanceSheetModal.tsx
//
// Zatwierdzenie rozliczenia. Podpis jest opcjonalny: zatwierdzający to zarazem „osoba
// potwierdzająca" ze stopki arkusza, więc może od razu złożyć podpis na tym urządzeniu,
// na tablecie studia albo na własnym telefonie - albo zatwierdzić bez podpisu i podpisać
// wydruk ręcznie. Podpis z tabletu lub telefonu sam zatwierdza listę.

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import type { AttendanceSheet, AttendanceSignatureRequest, RemoteSigningChannel } from '../../api/attendanceApi';
import { ATTENDANCE_SHEETS_KEY, useApproveAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { isAwaitingSignature, useAttendanceRemoteSigning } from '../../hooks/useAttendanceRemoteSigning';
import { SignaturePad, type SignaturePadHandle } from '../team/SignaturePad';
import { RemoteSigningSection } from './RemoteSigningSection';
import { employeesLabel, periodLabel } from './settlementFormat';

interface Props {
    sheet: AttendanceSheet;
    onClose: () => void;
}

export function ApproveAttendanceSheetModal({ sheet, onClose }: Props) {
    const { showSuccess } = useToast();
    const queryClient = useQueryClient();
    const approve = useApproveAttendanceSheet();
    const remote = useAttendanceRemoteSigning(sheet.id);
    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const month = periodLabel(sheet.period);
    const awaiting = remote.awaiting;
    const latest = remote.latest;

    // Prośba, na którą to okno czeka - tylko jej koniec coś tu zmienia (stara, dawno
    // zakończona prośba nie może zamknąć okna ani wyświetlić komunikatu). Czekająca prośba
    // staje się „nasza" od razu, także po ponownym otwarciu okna.
    const [awaitedId, setAwaitedId] = useState<string | null>(null);
    const [dismissedId, setDismissedId] = useState<string | null>(null);
    if (awaiting && awaiting.id !== awaitedId) setAwaitedId(awaiting.id);
    const ended = latest && !isAwaitingSignature(latest) && latest.id === awaitedId ? latest : null;

    const completedRef = useRef<string | null>(null);
    useEffect(() => {
        if (ended?.status !== 'COMPLETED' || completedRef.current === ended.id) return;
        completedRef.current = ended.id;
        void queryClient.invalidateQueries({ queryKey: ATTENDANCE_SHEETS_KEY });
        showSuccess(
            'Lista obecności podpisana i zatwierdzona',
            `${month} · ${ended.channel === 'TABLET' ? 'podpis na tablecie' : 'podpis na telefonie'}`,
        );
        onClose();
    }, [ended, month, onClose, queryClient, showSuccess]);

    const notice = sendError
        ?? (ended && ended.status !== 'COMPLETED' && ended.id !== dismissedId ? endedNotice(ended) : null);

    const handleSend = (channel: RemoteSigningChannel, tabletId?: string) => {
        setSendError(null);
        remote.send.mutate(
            { channel, tabletId },
            {
                onSuccess: request => setAwaitedId(request.id),
                onError: error => setSendError(messageOf(error) ?? 'Nie udało się wysłać prośby o podpis.'),
            },
        );
    };

    const handleCancelRemote = () => {
        // Własne anulowanie to nie wynik, o którym trzeba informować.
        setDismissedId(awaiting?.id ?? null);
        remote.cancel.mutate();
    };

    const handleApprove = () => {
        const signatureImage = hasInk ? padRef.current?.toDataUrl() ?? null : null;
        approve.mutate(
            { sheetId: sheet.id, signatureImage },
            {
                onSuccess: () => {
                    showSuccess('Lista obecności zatwierdzona', signatureImage ? `${month} · z podpisem` : month);
                    onClose();
                },
                // Komunikat (np. „już zatwierdzona") pokazuje globalny dymek; okno zamykamy
                // tylko wtedy, gdy nie ma już czego zatwierdzać.
                onError: (error: unknown) => {
                    const status = (error as { response?: { status?: number } })?.response?.status;
                    if (status === 404 || status === 409) onClose();
                },
            },
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zatwierdzić listę obecności?</ModalTitle>
                    <ModalSubtitle>{month} · {employeesLabel(sheet.employeeCount)}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Lead>
                    Zatwierdzona lista jest sprawdzona i gotowa dla księgowości - każdy
                    administrator zobaczy w Rozliczeniach, kto i kiedy ją zatwierdził.
                </Lead>

                {sheet.signed ? (
                    <Hint>Arkusz jest już podpisany{sheet.signerName ? ` (${sheet.signerName})` : ''}.</Hint>
                ) : awaiting ? (
                    <RemoteSigningSection
                        tablets={remote.tablets}
                        phone={remote.phone}
                        loading={remote.optionsLoading}
                        awaiting={awaiting}
                        sending={false}
                        cancelling={remote.cancel.isPending}
                        notice={null}
                        onSend={handleSend}
                        onCancel={handleCancelRemote}
                    />
                ) : (
                    <>
                        <SignatureLabel>Podpis (opcjonalnie)</SignatureLabel>
                        <SignaturePad ref={padRef} onInkChange={setHasInk} />
                        <PadActions>
                            <LinkBtn type="button" onClick={() => padRef.current?.clear()} disabled={!hasInk}>
                                Wyczyść
                            </LinkBtn>
                        </PadActions>
                        <Hint>
                            Podpis trafi pod tabelę na ostatniej stronie arkusza, razem z Twoim
                            imieniem, nazwiskiem i datą.
                        </Hint>
                        <RemoteSigningSection
                            tablets={remote.tablets}
                            phone={remote.phone}
                            loading={remote.optionsLoading}
                            awaiting={null}
                            sending={remote.send.isPending}
                            cancelling={false}
                            notice={notice}
                            onSend={handleSend}
                            onCancel={handleCancelRemote}
                        />
                    </>
                )}
            </ModalContent>

            <ModalFooter>
                {awaiting ? (
                    // Okno można zamknąć - prośba czeka dalej, a po ponownym otwarciu
                    // okno wraca do oczekiwania.
                    <SharedButton type="button" $variant="secondary" $size="sm" onClick={onClose}>
                        Zamknij
                    </SharedButton>
                ) : (
                    <>
                        <SharedButton type="button" $variant="secondary" $size="sm" onClick={onClose}>
                            Anuluj
                        </SharedButton>
                        <SharedButton
                            type="button"
                            $variant="primary"
                            $size="sm"
                            onClick={handleApprove}
                            disabled={approve.isPending}
                        >
                            {approve.isPending ? 'Zatwierdzam…' : hasInk ? 'Podpisz i zatwierdź' : 'Zatwierdź'}
                        </SharedButton>
                    </>
                )}
            </ModalFooter>
        </ModalShell>
    );
}

/** Komunikat z odpowiedzi serwera (np. „Na Twoim koncie nie ma numeru telefonu"). */
const messageOf = (error: unknown): string | null =>
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? null;

/** Co się stało z prośbą, na którą okno czekało, jeśli nie skończyła się podpisem. */
function endedNotice(request: AttendanceSignatureRequest): string {
    const where = request.channel === 'TABLET' ? 'na tablecie' : 'na telefonie';
    switch (request.status) {
        case 'DECLINED':
            return `Podpis ${where} został odrzucony. Możesz wysłać prośbę jeszcze raz albo podpisać tutaj.`;
        case 'EXPIRED':
            return 'Prośba o podpis wygasła. Wyślij ją jeszcze raz albo podpisz tutaj.';
        case 'CANCELLED':
            return 'Prośba o podpis została anulowana.';
        default:
            return `Podpis ${where} nie przeszedł weryfikacji. Wyślij prośbę jeszcze raz albo podpisz tutaj.`;
    }
}

const Lead = styled.p`
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
`;

const SignatureLabel = styled.p`
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #64748b;
`;

const PadActions = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
`;

const LinkBtn = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;

    &:hover:not(:disabled) { color: #0f172a; }
    &:disabled { opacity: 0.4; cursor: default; }
`;

const Hint = styled.p`
    margin: 10px 0 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: #64748b;
`;
