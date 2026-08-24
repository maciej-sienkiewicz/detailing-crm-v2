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

/**
 * Zgodność stanu wizualnego — pytanie zadawane pracownikowi tuż przed wysłaniem
 * protokołu wydania do podpisu.
 *
 * Kolejność ma znaczenie: odpowiedź trafia na dokument ZANIM klient go zobaczy na
 * tablecie czy telefonie. Inaczej podpisywałby pusty formularz, a zaznaczenie
 * dopisywałoby się do już podpisanego dokumentu — czyli do niczego.
 */

const Choices = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;

const Choice = styled.button<{ $selected: boolean; $tone: 'yes' | 'no' }>`
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 12px;
    font: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    text-align: left;
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;

    border: 1.5px solid ${p => {
        if (!p.$selected) return p.theme.colors.border;
        return p.$tone === 'yes' ? '#10b981' : '#f59e0b';
    }};
    background: ${p => {
        if (!p.$selected) return p.theme.colors.surface;
        return p.$tone === 'yes' ? '#ecfdf5' : '#fffbeb';
    }};
    color: ${p => (p.$selected ? p.theme.colors.text : p.theme.colors.textSecondary)};

    &:hover { border-color: ${p => (p.$tone === 'yes' ? '#10b981' : '#f59e0b')}; }

    svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

const IconBadge = styled.span<{ $tone: 'yes' | 'no' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
    background: ${p => (p.$tone === 'yes' ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.16)')};
    color: ${p => (p.$tone === 'yes' ? '#047857' : '#b45309')};
`;

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
                    <Choices>
                        <Choice
                            type="button"
                            $tone="yes"
                            $selected={match === true}
                            aria-pressed={match === true}
                            onClick={() => setMatch(true)}
                        >
                            <IconBadge $tone="yes"><Check /></IconBadge>
                            Tak, stan zgodny z protokołem przyjęcia
                        </Choice>
                        <Choice
                            type="button"
                            $tone="no"
                            $selected={match === false}
                            aria-pressed={match === false}
                            onClick={() => setMatch(false)}
                        >
                            <IconBadge $tone="no"><X /></IconBadge>
                            Nie
                        </Choice>
                    </Choices>

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
