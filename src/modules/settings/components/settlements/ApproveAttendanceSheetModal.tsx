// src/modules/settings/components/settlements/ApproveAttendanceSheetModal.tsx
//
// Zatwierdzenie rozliczenia. Podpis jest opcjonalny: zatwierdzający to zarazem „osoba
// potwierdzająca" ze stopki arkusza, więc może od razu złożyć podpis na tym urządzeniu -
// albo zatwierdzić bez podpisu i podpisać wydruk ręcznie.

import { useRef, useState } from 'react';
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
import type { AttendanceSheet } from '../../api/attendanceApi';
import { useApproveAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { SignaturePad, type SignaturePadHandle } from '../team/SignaturePad';
import { employeesLabel, periodLabel } from './settlementFormat';

interface Props {
    sheet: AttendanceSheet;
    onClose: () => void;
}

export function ApproveAttendanceSheetModal({ sheet, onClose }: Props) {
    const { showSuccess } = useToast();
    const approve = useApproveAttendanceSheet();
    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);

    const month = periodLabel(sheet.period);

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
                    </>
                )}
            </ModalContent>

            <ModalFooter>
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
            </ModalFooter>
        </ModalShell>
    );
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
