import styled from 'styled-components';
import { MessageSquareHeart } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Toggle } from '@/common/components/Toggle';
import { Box, Muted, Section, SectionLabel } from './HandoverKit';
import {
    THANK_YOU_CLOSES_HOUR,
    THANK_YOU_OPENS_HOUR,
    fromDateTimeLocal,
    isWithinThankYouWindow,
    nextThankYouSlot,
    toDateTimeLocal,
} from './thankYouSms';

const HeadRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
`;

const HeadTexts = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const SendLabel = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    cursor: pointer;

    svg { width: 15px; height: 15px; color: ${st.accentBlue}; }
`;

const WhenRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const WhenLabel = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const WhenInput = styled.input`
    padding: 8px 11px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: #fff;
    font-size: ${st.fontSm};
    color: ${st.text};
    font-family: inherit;
    max-width: 240px;

    &:focus-visible {
        outline: none;
        border-color: ${st.accentBlue};
        box-shadow: 0 0 0 3px ${st.accentBlueDim};
    }
`;

const Shifted = styled(Muted)`
    color: #b45309;
`;

const formatWhen = (date: Date): string =>
    date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

interface ThankYouSmsSectionProps {
    enabled: boolean;
    onEnabledChange: (value: boolean) => void;
    /** Wartość pola: „YYYY-MM-DDTHH:mm" w czasie lokalnym. */
    sendAt: string;
    onSendAtChange: (value: string) => void;
}

/**
 * Kiedy podziękować klientowi za wizytę.
 *
 * Sekcja istnieje, bo moment zamknięcia wizyty w systemie nie ma nic wspólnego z porą,
 * o której klientowi wypada napisać. Studio zamyka wizyty po godzinach, a klienci
 * dostawali przez to „dziękujemy za wizytę" o 20:50. Godzinę wybiera więc człowiek przy
 * ladzie, w oknie {@link THANK_YOU_OPENS_HOUR}-{@link THANK_YOU_CLOSES_HOUR}.
 *
 * Wpisu spoza okna nie nadpisujemy pod palcami - mówimy wprost, o której wyjdzie.
 * Cichy skok wartości w polu wygląda jak błąd formularza, a zablokowanie zapisu
 * zatrzymywałoby wydanie pojazdu z powodu SMS-a.
 */
export const ThankYouSmsSection = ({
    enabled,
    onEnabledChange,
    sendAt,
    onSendAtChange,
}: ThankYouSmsSectionProps) => {
    const parsed = fromDateTimeLocal(sendAt);
    const shifted = parsed && !isWithinThankYouWindow(parsed) ? nextThankYouSlot(parsed) : null;

    return (
        <Section>
            <SectionLabel>Podziękowanie</SectionLabel>
            <Box>
                <HeadRow>
                    <HeadTexts>
                        <SendLabel htmlFor="handover-thank-you-sms">
                            <MessageSquareHeart aria-hidden="true" />
                            Wyślij SMS-a z podziękowaniem
                        </SendLabel>
                        <Muted>
                            Wysyłamy w godzinach {THANK_YOU_OPENS_HOUR}:00-{THANK_YOU_CLOSES_HOUR}:00,
                            żeby nie zaczepiać klienta wieczorem.
                        </Muted>
                    </HeadTexts>
                    <Toggle
                        checked={enabled}
                        onChange={onEnabledChange}
                        size="sm"
                        inputId="handover-thank-you-sms"
                        ariaLabel="Wyślij SMS-a z podziękowaniem"
                    />
                </HeadRow>

                {enabled && (
                    <WhenRow>
                        <WhenLabel htmlFor="handover-thank-you-at">Data i godzina wysyłki</WhenLabel>
                        <WhenInput
                            id="handover-thank-you-at"
                            type="datetime-local"
                            value={sendAt}
                            min={toDateTimeLocal(new Date())}
                            step={300}
                            onChange={event => onSendAtChange(event.target.value)}
                        />
                        {shifted && (
                            <Shifted>
                                Poza godzinami wysyłki - podziękowanie pójdzie {formatWhen(shifted)}.
                            </Shifted>
                        )}
                    </WhenRow>
                )}
            </Box>
        </Section>
    );
};
