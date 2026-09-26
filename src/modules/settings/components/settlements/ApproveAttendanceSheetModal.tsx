// src/modules/settings/components/settlements/ApproveAttendanceSheetModal.tsx
//
// Zatwierdzenie rozliczenia. Bez podpisu nie ma zatwierdzenia: zatwierdzający to zarazem
// „osoba potwierdzająca" ze stopki arkusza. Trzy sposoby podpisu są widoczne od razu - na
// tym urządzeniu, na tablecie studia albo na własnym telefonie. Podpis z tabletu lub telefonu
// sam zatwierdza listę. Bez nowego podpisu zatwierdza się tylko arkusz podpisany już wcześniej.

import { useEffect, useId, useRef, useState } from 'react';
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
import { Button } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import type { AttendanceSheet, AttendanceSignatureRequest } from '../../api/attendanceApi';
import { ATTENDANCE_SHEETS_KEY, useApproveAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { isAwaitingSignature, useAttendanceRemoteSigning } from '../../hooks/useAttendanceRemoteSigning';
import { SignaturePad, type SignaturePadHandle } from '../team/SignaturePad';
import {
    AwaitingSignature,
    PhonePanel,
    SigningMethodPicker,
    SigningNotice,
    TabletPanel,
    type SigningMethod,
} from './SigningMethods';
import { employeesLabel, periodLabel } from './settlementFormat';

interface Props {
    sheet: AttendanceSheet;
    onClose: () => void;
}

/**
 * Wysokość pola podpisu: rośnie z ekranem, ale na telefonie w poziomie nie zabiera całego
 * okna, a na dużym monitorze nie robi się z niego tablica.
 */
const PAD_HEIGHT = 'clamp(150px, 28vh, 230px)';

export function ApproveAttendanceSheetModal({ sheet, onClose }: Props) {
    const { showSuccess } = useToast();
    const queryClient = useQueryClient();
    const approve = useApproveAttendanceSheet();
    const remote = useAttendanceRemoteSigning(sheet.id);
    const padRef = useRef<SignaturePadHandle>(null);
    const methodsLabelId = useId();
    const [hasInk, setHasInk] = useState(false);
    const [chosenMethod, setChosenMethod] = useState<SigningMethod>('DEVICE');
    const [chosenTabletId, setChosenTabletId] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    const month = periodLabel(sheet.period);
    const awaiting = remote.awaiting;
    const latest = remote.latest;

    // Sposób, który przestał być dostępny, nie zostaje wybrany po cichu.
    const method: SigningMethod = chosenMethod !== 'DEVICE' && remote.blockers[chosenMethod] ? 'DEVICE' : chosenMethod;
    const tablet = remote.tablets.length === 1
        ? remote.tablets[0]
        : remote.tablets.find(candidate => candidate.tabletId === chosenTabletId) ?? null;

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
            `${month}, podpis złożony ${ended.channel === 'TABLET' ? 'na tablecie' : 'na telefonie'}.`,
        );
        onClose();
    }, [ended, month, onClose, queryClient, showSuccess]);

    const notice = sendError
        ?? (ended && ended.status !== 'COMPLETED' && ended.id !== dismissedId ? endedNotice(ended) : null);

    const handleMethodChange = (next: SigningMethod) => {
        setChosenMethod(next);
        setSendError(null);
    };

    const handleSend = () => {
        if (method === 'DEVICE') return;
        setSendError(null);
        remote.send.mutate(
            { channel: method, tabletId: method === 'TABLET' ? tablet?.tabletId : undefined },
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
        const signatureImage = sheet.signed ? null : padRef.current?.toDataUrl() ?? null;
        // Przycisk jest bez podpisu wygaszony; to zabezpieczenie na wypadek, gdyby kanwa
        // zdążyła się wyczyścić między kliknięciem a odczytem.
        if (!sheet.signed && !signatureImage) return;
        approve.mutate(
            { sheetId: sheet.id, signatureImage },
            {
                onSuccess: () => {
                    showSuccess('Lista obecności zatwierdzona', signatureImage ? `${month}, z Twoim podpisem.` : `${month}.`);
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

    const primaryAction = sheet.signed
        ? { label: approve.isPending ? 'Zatwierdzanie...' : 'Zatwierdź', onClick: handleApprove, disabled: approve.isPending }
        : method === 'DEVICE'
            ? {
                label: approve.isPending ? 'Zatwierdzanie...' : 'Podpisz i zatwierdź',
                onClick: handleApprove,
                disabled: !hasInk || approve.isPending,
            }
            : {
                label: remote.send.isPending ? 'Wysyłanie...' : method === 'TABLET' ? 'Wyślij na tablet' : 'Wyślij SMS',
                onClick: handleSend,
                disabled: remote.send.isPending || (method === 'TABLET' && tablet === null),
            };

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zatwierdzić listę obecności?</ModalTitle>
                    <ModalSubtitle>{month}, {employeesLabel(sheet.employeeCount)}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Lead>
                    Zatwierdzona lista jest sprawdzona i gotowa dla księgowości - każdy
                    administrator zobaczy w Rozliczeniach, kto i kiedy ją zatwierdził.
                    {!sheet.signed && ' Zatwierdzenie wymaga Twojego podpisu.'}
                </Lead>

                {sheet.signed ? (
                    <Hint>
                        Arkusz jest już podpisany{sheet.signerName ? ` (${sheet.signerName})` : ''} - zatwierdzenie
                        nie wymaga nowego podpisu.
                    </Hint>
                ) : awaiting ? (
                    <AwaitingSignature
                        request={awaiting}
                        tablets={remote.tablets}
                        phone={remote.phone}
                        cancelling={remote.cancel.isPending}
                        onCancel={handleCancelRemote}
                    />
                ) : (
                    <Signing>
                        <SectionLabel id={methodsLabelId}>Gdzie złożysz podpis?</SectionLabel>
                        <SigningMethodPicker
                            value={method}
                            onChange={handleMethodChange}
                            tablets={remote.tablets}
                            phone={remote.phone}
                            blockers={remote.blockers}
                            labelledBy={methodsLabelId}
                        />
                        {notice && <SigningNotice>{notice}</SigningNotice>}

                        {/* Pole zostaje zamontowane także przy innym sposobie: zajrzenie do opcji
                            tabletu nie może skasować podpisu złożonego chwilę wcześniej. */}
                        <PadBlock hidden={method !== 'DEVICE'}>
                            <SignaturePad ref={padRef} onInkChange={setHasInk} height={PAD_HEIGHT} />
                            <PadFooter>
                                <PadHint>
                                    Podpis trafi pod tabelę na ostatniej stronie arkusza, razem z Twoim
                                    imieniem, nazwiskiem i datą.
                                </PadHint>
                                <LinkBtn type="button" onClick={() => padRef.current?.clear()} disabled={!hasInk}>
                                    Wyczyść
                                </LinkBtn>
                            </PadFooter>
                        </PadBlock>
                        {method === 'TABLET' && (
                            <TabletPanel
                                tablets={remote.tablets}
                                tabletId={tablet?.tabletId ?? null}
                                onTabletChange={setChosenTabletId}
                            />
                        )}
                        {method === 'SMS' && <PhonePanel phone={remote.phone} />}
                    </Signing>
                )}
            </ModalContent>

            <ModalFooter>
                {awaiting ? (
                    // Okno można zamknąć - prośba czeka dalej, a po ponownym otwarciu
                    // okno wraca do oczekiwania.
                    <Button variant="outline" onClick={onClose}>Zamknij</Button>
                ) : (
                    <>
                        <Button variant="outline" onClick={onClose}>Anuluj</Button>
                        {/* Jedyne wypełnienie w oknie - „Zatwierdź" w wierszu Rozliczeń jest odcieniem. */}
                        <Button
                            variant="primary"
                            onClick={primaryAction.onClick}
                            disabled={primaryAction.disabled}
                        >
                            {primaryAction.label}
                        </Button>
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
            return `Podpis ${where} został odrzucony. Wyślij prośbę jeszcze raz albo podpisz na tym urządzeniu.`;
        case 'EXPIRED':
            return 'Prośba o podpis wygasła. Wyślij ją jeszcze raz albo podpisz na tym urządzeniu.';
        case 'CANCELLED':
            return 'Prośba o podpis została anulowana.';
        default:
            return `Podpis ${where} nie przeszedł weryfikacji. Wyślij prośbę jeszcze raz albo podpisz na tym urządzeniu.`;
    }
}

const Lead = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
`;

const Signing = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

/* Pytanie zdaniem, 14px - było 11px wersalikami w szarości (CLAUDE.md §2). */
const SectionLabel = styled.p`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const PadBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    &[hidden] { display: none; }
`;

const PadFooter = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
`;

const PadHint = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;
`;

const LinkBtn = styled.button`
    flex-shrink: 0;
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
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: #64748b;
`;
