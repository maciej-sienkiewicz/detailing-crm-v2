// src/modules/appointments/components/RecurrenceEditScopeModal.tsx
//
// Okno „Zapisz w serii". Otwiera się WYŁĄCZNIE z osobnego przycisku obok zwykłego
// zapisu - zwykły „Zapisz tę rezerwację" zmienia tylko ją i nie pyta o nic.
//
// Wymaganie biznesu: nadpisanie innych rezerwacji serii musi być intencjonalne i jasno
// zaznaczone. Dlatego:
// - żadna opcja nie jest zaznaczona z góry (dawniej domyślne było „tylko ta", a jedyny
//   wypełniony przycisk „Zapisz zmiany" zatwierdzał to, co akurat było wybrane);
// - zatwierdzenie jest nieaktywne, dopóki operator nie wybierze zakresu, i mówi wprost,
//   ile rezerwacji nadpisze;
// - po wyborze okno wypisuje, CO zostanie nadpisane i co zostanie bez zmian - liczby
//   z serwera (series-impact), z tej samej reguły co zapis;
// - zatwierdzenie nie jest wypełnione: nadpisanie serii nie jest „krokiem następnym",
//   tylko świadomą decyzją, którą trzeba przeczytać (bursztyn = „przeczytaj").
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { RecurrenceInfo, SeriesEditImpact, SeriesEditScope } from '../types';
import {
    type IdentitySwap,
    reservationsCount,
    seriesConfirmLabel,
    seriesOverwriteSentence,
    seriesSkippedSentence,
} from '../utils/seriesEditSummary';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Subtitle = styled.p`
    font-size: 13px;
    color: #475569;
    margin: 0 0 14px;
    line-height: 1.5;
`;

const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const OptionRow = styled.label<{ $disabled?: boolean; $checked?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid ${p => p.$checked ? '#fcd34d' : '#e2e8f0'};
    background: ${p => p.$checked ? '#fffbeb' : 'transparent'};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: background 140ms ease, border-color 140ms ease;
`;

const RadioInput = styled.input.attrs({ type: 'radio' })`
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: #d97706;
    cursor: inherit;
    flex-shrink: 0;
`;

const OptionTitle = styled.span`
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
`;

const OptionDesc = styled.span`
    display: block;
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.4;
`;

const Consequences = styled.div`
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid #fcd34d;
    background: #fffbeb;
    color: #92400e;
    font-size: 13px;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 6px;

    p { margin: 0; }
    strong { color: #78350f; }
`;

const InfoNote = styled.p`
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #bae6fd;
    background: #f0f9ff;
    color: #075985;
    font-size: 12px;
    line-height: 1.5;
`;

// Akcja świadoma, nie krok następny - odcień bursztynu jako tło i obwódka, bez wypełnienia.
const ConfirmSeriesButton = styled(SharedButton).attrs({ $variant: 'secondary' as const })`
    color: #92400e;
    background: #fffbeb;
    border: 1.5px solid #f59e0b;

    &:hover:not(:disabled) {
        color: #78350f;
        background: #fef3c7;
        border-color: #d97706;
    }
`;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecurrenceEditScopeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scope: SeriesEditScope) => void;
    recurrenceInfo: RecurrenceInfo;
    /** Z GET /appointments/{id}/series-impact; undefined w trakcie ładowania. */
    impact: SeriesEditImpact | undefined;
    impactError?: boolean;
    /** Pola zmienione w tej rezerwacji (podpowiedź, nie zakres nadpisania). */
    changedFields: string[];
    identitySwap: IdentitySwap;
    /** Poprawiono dane tego samego klienta - są wspólne niezależnie od wyboru. */
    customerRecordEdited: boolean;
    isSubmitting: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurrenceEditScopeModal = ({
    isOpen,
    onClose,
    onConfirm,
    recurrenceInfo,
    impact,
    impactError = false,
    changedFields,
    identitySwap,
    customerRecordEdited,
    isSubmitting,
}: RecurrenceEditScopeModalProps) => {
    // Celowo bez wartości domyślnej: zakres serii operator wybiera sam, za każdym razem.
    const [scope, setScope] = useState<SeriesEditScope | null>(null);

    useEffect(() => {
        if (isOpen) setScope(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const idx = recurrenceInfo.recurrenceIndex + 1;
    const total = impact?.totalInSeries ?? recurrenceInfo.totalInSeries;
    const selected = scope && impact ? (scope === 'ALL' ? impact.all : impact.thisAndFuture) : null;
    const skipped = selected ? seriesSkippedSentence(selected) : null;

    const optionDesc = (scopeImpact: SeriesEditImpact['all'] | undefined) => {
        if (impactError) return 'Nie udało się policzyć rezerwacji serii.';
        if (!scopeImpact) return 'Liczymy rezerwacje serii…';
        return scopeImpact.otherCount === 0
            ? 'Brak innych rezerwacji do zmiany.'
            : `Obejmie także ${reservationsCount(scopeImpact.otherCount)} poza tą.`;
    };

    const options: { value: SeriesEditScope; title: string; impact: SeriesEditImpact['all'] | undefined }[] = [
        { value: 'THIS_AND_FUTURE', title: 'Ta i następne rezerwacje serii', impact: impact?.thisAndFuture },
        { value: 'ALL', title: 'Wszystkie rezerwacje serii', impact: impact?.all },
    ];

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="520px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zapisać także w innych rezerwacjach serii?</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Subtitle>
                    To rezerwacja {idx} z {total} w serii. Zwykły zapis zmienia tylko ją.
                    Tutaj możesz świadomie nadpisać nią także inne rezerwacje tej serii.
                </Subtitle>

                <OptionList role="radiogroup" aria-label="Zakres zmiany w serii">
                    {options.map(option => {
                        const disabled = !option.impact || option.impact.otherCount === 0;
                        return (
                            <OptionRow key={option.value} $disabled={disabled} $checked={scope === option.value}>
                                <RadioInput
                                    name="seriesScope"
                                    value={option.value}
                                    checked={scope === option.value}
                                    onChange={() => setScope(option.value)}
                                    disabled={disabled}
                                />
                                <span>
                                    <OptionTitle>{option.title}</OptionTitle>
                                    <OptionDesc>{optionDesc(option.impact)}</OptionDesc>
                                </span>
                            </OptionRow>
                        );
                    })}
                </OptionList>

                {scope && selected && (
                    <Consequences role="status" data-testid="series-consequences">
                        <p><strong>{seriesOverwriteSentence(scope, selected.otherCount, identitySwap)}</strong></p>
                        {changedFields.length > 0 && (
                            <p>Zmieniono w tej rezerwacji: {changedFields.join(', ')}.</p>
                        )}
                        <p>Terminy rezerwacji się nie zmieniają.</p>
                        {skipped && <p>{skipped}</p>}
                    </Consequences>
                )}

                {customerRecordEdited && (
                    <InfoNote>
                        Poprawione dane klienta zapisują się w jego kartotece, więc widać je
                        we wszystkich jego rezerwacjach, niezależnie od tego wyboru.
                    </InfoNote>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                    Anuluj
                </SharedButton>
                <ConfirmSeriesButton
                    type="button"
                    onClick={() => scope && onConfirm(scope)}
                    disabled={!scope || !selected || selected.otherCount === 0 || isSubmitting}
                >
                    {isSubmitting
                        ? 'Zapisywanie…'
                        : selected ? seriesConfirmLabel(selected.otherCount) : 'Wybierz zakres'}
                </ConfirmSeriesButton>
            </ModalFooter>
        </ModalShell>
    );
};
