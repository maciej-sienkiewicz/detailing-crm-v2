import { useState } from 'react';
import styled from 'styled-components';
import { Check, X } from 'lucide-react';
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
import { FormField, FieldLabel, InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { Pill, PillRow } from './HandoverKit';

/**
 * Zgodność stanu wizualnego — pytanie zadawane pracownikowi tuż przed wysłaniem
 * protokołu wydania do podpisu.
 *
 * Kolejność ma znaczenie: odpowiedź trafia na dokument ZANIM klient go zobaczy na
 * tablecie czy telefonie. Inaczej podpisywałby pusty formularz, a zaznaczenie
 * dopisywałoby się do już podpisanego dokumentu — czyli do niczego.
 *
 * Wybór to te same pigułki, którymi arkusz wydania obsługuje każdy inny wybór
 * (choćby formę zapłaty) — jedno pytanie nie zasługuje na własny język wizualny.
 */

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Note = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textMuted};
`;

interface VisualConditionModalProps {
    /** Nazwa dokumentu, żeby było widać, co zaraz pojedzie do podpisu. */
    documentName: string;
    isSaving: boolean;
    onCancel: () => void;
    onConfirm: (conditionMatch: boolean, remarks: string | null) => void;
}

export const VisualConditionModal = ({
    documentName,
    isSaving,
    onCancel,
    onConfirm,
}: VisualConditionModalProps) => {
    const [match, setMatch] = useState<boolean | null>(null);
    const [remarks, setRemarks] = useState('');

    // Przy niezgodności uwagi są treścią oświadczenia — sam znacznik „Nie" nie mówi,
    // czego dotyczy. Przy zgodności pole zostaje opcjonalne.
    const remarksRequired = match === false;
    const canConfirm = match !== null && (!remarksRequired || remarks.trim().length > 0);

    return (
        <ModalShell isOpen onClose={onCancel} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zgodność stanu wizualnego</ModalTitle>
                    <ModalSubtitle>{documentName}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onCancel} />
            </ModalHeader>

            <ModalContent>
                <Body>
                    <PillRow>
                        <Pill
                            type="button"
                            $selected={match === true}
                            aria-pressed={match === true}
                            onClick={() => setMatch(true)}
                        >
                            <Check />
                            Tak, stan zgodny z protokołem przyjęcia
                        </Pill>
                        <Pill
                            type="button"
                            $selected={match === false}
                            aria-pressed={match === false}
                            onClick={() => setMatch(false)}
                        >
                            <X />
                            Nie
                        </Pill>
                    </PillRow>

                    <FormField>
                        <FieldLabel htmlFor="visual-condition-remarks">
                            {remarksRequired ? 'Uwagi (wymagane)' : 'Uwagi (opcjonalnie)'}
                        </FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="visual-condition-remarks"
                                rows={3}
                                value={remarks}
                                placeholder={
                                    remarksRequired
                                        ? 'Opisz, co odbiega od stanu z przyjęcia'
                                        : 'Dodatkowe uwagi do protokołu wydania'
                                }
                                onChange={event => setRemarks(event.target.value)}
                            />
                        </InputShellTextArea>
                    </FormField>

                    <Note>
                        Odpowiedź trafi na protokół wydania, zanim klient zobaczy go na tablecie
                        albo w telefonie.
                    </Note>
                </Body>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" $size="sm" onClick={onCancel} disabled={isSaving}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    type="button"
                    $variant="primary"
                    $size="sm"
                    disabled={!canConfirm || isSaving}
                    onClick={() => onConfirm(match as boolean, remarks.trim() || null)}
                >
                    {isSaving ? 'Zapisywanie…' : 'Zapisz i wyślij do podpisu'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
