// src/modules/employees/components/leave/EmployeeSigning.tsx
//
// Podpis pracownika pod urlopem, który administrator już zapisał i zatwierdził. Urlop
// stoi w kalendarzu bez względu na podpis - stąd cztery równorzędne wyjścia:
//   - teraz, na tym urządzeniu (pracownik stoi obok),
//   - na tablecie studia,
//   - SMS-em z linkiem (numer z karty pracownika, do poprawienia),
//   - bez podpisu (można wrócić do tego w szczegółach wniosku).
//
// Ten sam krok w oknie „Dodaj urlop" i w szczegółach zatwierdzonego wniosku, któremu
// brakuje podpisu. Stan prośby (tablet, SMS) idzie z serwera WebSocketem, a gdy czeka -
// dodatkowo co kilka sekund, jak przy liście obecności.

import styled from 'styled-components';
import { MessageSquareText, PenLine, Tablet, X } from 'lucide-react';
import { Button, ChoiceCard, ChoiceList, Notice, ui } from '@/common/components/ui';
import { BareInput, FieldLabel, InputShell } from '@/common/components/Form';
import type { EmployeeSigning } from '../../hooks/useEmployeeSigning';
import { TabletPanel } from '../worktime/SigningMethods';
import { LeavePdf } from './LeavePdf';
import { SignatureBlock } from './LeaveFormSteps';

const DECLARATION = 'Znam treść wniosku i podpisuję go.';

type Signing = EmployeeSigning;

/*
 * Cztery sposoby w jednym rzędzie (dwa na telefonie): ułożone pod sobą spychały pole
 * podpisu pod krawędź okna i trzeba było przewijać, zanim pracownik w ogóle je zobaczył.
 */
const Methods = styled(ChoiceList)`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));

    @media (max-width: 720px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 4px;
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 260px;
`;

/** Treść kroku: wybór sposobu i to, czego ten sposób potrzebuje. */
export function EmployeeSigningBody({ s }: { s: Signing }) {
    if (s.signedAlready) {
        return <Notice tone="ok" title="Pracownik podpisał wniosek">Podpisany dokument jest w szczegółach wniosku.</Notice>;
    }
    if (s.awaiting) {
        const where = s.awaiting.channel === 'TABLET'
            ? (s.awaiting.status === 'DISPLAYED' ? 'Wniosek jest otwarty na tablecie.' : 'Wniosek czeka na tablecie studia.')
            : 'SMS z linkiem wysłany. Pracownik podpisze, gdy go otworzy.';
        return (
            <Notice
                tone="info"
                title="Czeka na podpis pracownika"
                action={<Button variant="ghost" size="sm" disabled={s.cancel.isPending} onClick={() => s.cancel.mutate()}><X aria-hidden="true" />Anuluj prośbę</Button>}
            >
                {where} Możesz zamknąć to okno - urlop jest już zapisany.
            </Notice>
        );
    }

    return (
        <Panel>
            <Methods role="radiogroup" aria-label="Podpis pracownika">
                <ChoiceCard type="radio" name="employee-sign" checked={s.method === 'NOW'} onChange={() => s.setMethod('NOW')}
                    icon={<PenLine />} title="Podpis teraz" detail="Tutaj, na ekranie" />
                <ChoiceCard type="radio" name="employee-sign" checked={s.method === 'TABLET'} onChange={() => s.setMethod('TABLET')}
                    icon={<Tablet />} title="Na tablecie" detail={s.blockers.TABLET ? 'Niedostępne' : 'Tablet studia'} disabled={!!s.blockers.TABLET} />
                <ChoiceCard type="radio" name="employee-sign" checked={s.method === 'SMS'} onChange={() => s.setMethod('SMS')}
                    icon={<MessageSquareText />} title="SMS z linkiem" detail={s.blockers.SMS ? 'Niedostępne' : 'Na telefon'} disabled={!!s.blockers.SMS} />
                <ChoiceCard type="radio" name="employee-sign" checked={s.method === 'NONE'} onChange={() => s.setMethod('NONE')}
                    icon={<X />} title="Bez podpisu" detail="Dodasz później" />
            </Methods>
            {/* Pełny powód niedostępności pod kafelkami - w kafelku ucinał się do „Wym…". */}
            {s.blockers.TABLET && <Muted>Tablet: {lower(s.blockers.TABLET)}.</Muted>}
            {s.blockers.SMS && <Muted>SMS: {lower(s.blockers.SMS)}.</Muted>}

            {s.method === 'NOW' && (
                <>
                    <Button variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onClick={() => s.setShowDocument(!s.showDocument)}>
                        {s.showDocument ? 'Ukryj wniosek' : 'Pokaż wniosek'}
                    </Button>
                    {s.showDocument && (
                        <LeavePdf
                            bytes={s.documentQuery.data?.bytes}
                            isLoading={s.documentQuery.isLoading}
                            isError={s.documentQuery.isError}
                            onRetry={() => void s.documentQuery.refetch()}
                            maxHeight="34vh"
                        />
                    )}
                    <SignatureBlock
                        declaration={DECLARATION}
                        declared={s.declared}
                        onDeclaredChange={s.setDeclared}
                        padRef={s.padRef}
                        onInkChange={s.setHasInk}
                    />
                </>
            )}
            {s.method === 'TABLET' && s.tablets.length > 1 && (
                <TabletPanel tablets={s.tablets} tabletId={s.effectiveTablet} onTabletChange={s.setTabletId} />
            )}
            {s.method === 'SMS' && (
                <Field>
                    <FieldLabel htmlFor="leave-sign-phone">Numer telefonu</FieldLabel>
                    <InputShell $compact>
                        <BareInput $compact id="leave-sign-phone" type="tel" inputMode="tel" autoComplete="off"
                            value={s.phoneValue} onChange={e => s.setPhone(e.target.value)} placeholder="np. 600 100 200" />
                    </InputShell>
                </Field>
            )}
            {s.method === 'NONE' && <Muted>Podpis zbierzesz później w szczegółach wniosku.</Muted>}
            {s.notice && <Notice tone="warn" role="alert">{s.notice}</Notice>}
        </Panel>
    );
}

