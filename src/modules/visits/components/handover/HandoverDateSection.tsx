// src/modules/visits/components/handover/HandoverDateSection.tsx
//
// „Wydajesz pojazd po planowanej dacie zakończenia wizyty" - pytanie, które pojawia się
// tylko wtedy, gdy dziś jest już po dniu planowanego zakończenia. Zwykle znaczy to, że
// auto wyjechało wcześniej, a „Wydaj pojazd" ktoś kliknął po fakcie.
//
// Wybór niesie ODCIEŃ (karta z obwódką marki), nie wypełnienie: krokiem następnym
// w tym oknie jest przycisk wydania w stopce (CLAUDE.md §2).

import styled from 'styled-components';
import { ChoiceCard, ChoiceList, Notice } from '@/common/components/ui';
import { ui } from '@/common/components/ui/tokens';
import { DecisionField, SectionProblems } from './HandoverKit';
import { dayLabel, type HandoverDateChoice, type HandoverDateState } from './handoverDate';
import type { HandoverProblem } from '../../types/handover';

/* Kalendarz pod listą, nie w karcie „Z inną datą”: karta jest etykietą swojego pola wyboru
   i nadaje każdemu polu w środku wymiary 16×16 - pole daty było w niej pustym owalem. */
const DateRow = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 40px;
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.ink};
`;

const DateInput = styled.input`
    width: 160px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid ${ui.lineStrong};
    border-radius: 8px;
    font: inherit;
    font-size: 13.5px;
    color: ${ui.ink};
    background: ${ui.surface};

    &:focus { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

interface HandoverDateSectionProps {
    value: HandoverDateState;
    onChange: (value: HandoverDateState) => void;
    /** Dzień planowanego zakończenia (YYYY-MM-DD). */
    planned: string;
    today: string;
    /** Najwcześniejszy dzień do wyboru: rozpoczęcie wizyty. */
    earliest: string | null;
    problems: HandoverProblem[];
}

export const HandoverDateSection = ({ value, onChange, planned, today, earliest, problems }: HandoverDateSectionProps) => {
    const choose = (choice: HandoverDateChoice) => onChange({ ...value, choice });

    return (
        <DecisionField id="handover-date">
            <Notice tone="warn" title="Wydajesz pojazd po planowanej dacie zakończenia wizyty.">
                Z jaką datą chcesz zakończyć wizytę? Ta data trafi do statystyk i jako data sprzedaży
                na dokumenty. Fakturę KSeF wystawiasz z dzisiejszą datą.
            </Notice>
            <ChoiceList role="radiogroup" aria-label="Data zakończenia wizyty">
                <ChoiceCard
                    type="radio"
                    name="handover-date"
                    checked={value.choice === 'PLANNED'}
                    onChange={() => choose('PLANNED')}
                    title="Zgodnie z planowaną datą"
                    detail={dayLabel(planned)}
                />
                <ChoiceCard
                    type="radio"
                    name="handover-date"
                    checked={value.choice === 'TODAY'}
                    onChange={() => choose('TODAY')}
                    title="Z datą dzisiejszą"
                    detail={dayLabel(today)}
                />
                <ChoiceCard
                    type="radio"
                    name="handover-date"
                    checked={value.choice === 'OTHER'}
                    onChange={() => choose('OTHER')}
                    title="Z inną datą"
                    detail={value.choice === 'OTHER' && value.other ? dayLabel(value.other) : 'Dzień, w którym auto wyjechało'}
                />
                {value.choice === 'OTHER' && (
                    <DateRow>
                        Dzień wydania
                        <DateInput
                            type="date"
                            value={value.other}
                            min={earliest ?? undefined}
                            max={today}
                            onChange={e => onChange({ choice: 'OTHER', other: e.target.value })}
                        />
                    </DateRow>
                )}
            </ChoiceList>
            <SectionProblems problems={problems} />
        </DecisionField>
    );
};
