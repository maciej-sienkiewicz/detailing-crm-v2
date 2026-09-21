import styled from 'styled-components';
import { MessageSquareHeart } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Toggle } from '@/common/components/Toggle';
import { Box, Muted, Section, SectionLabel } from './HandoverKit';
import { THANK_YOU_CLOSES_HOUR, THANK_YOU_OPENS_HOUR } from './thankYouSms';

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

interface ThankYouSmsSectionProps {
    enabled: boolean;
    onEnabledChange: (value: boolean) => void;
}

/**
 * Czy podziękować klientowi za wizytę.
 *
 * Człowiek przy ladzie decyduje TYLKO o tym, czy SMS ma pójść. Termin wybiera serwer:
 * krótko po wydaniu pojazdu, a jeśli wypada to poza oknem
 * {@link THANK_YOU_OPENS_HOUR}-{@link THANK_YOU_CLOSES_HOUR}, dociąga do najbliższej
 * godziny w oknie. Okno istnieje dlatego, że moment zamknięcia wizyty w systemie nie ma
 * nic wspólnego z porą, o której klientowi wypada napisać - studio zamyka wizyty po
 * godzinach, a klienci dostawali przez to „dziękujemy za wizytę" o 20:50.
 *
 * Pola z datą i godziną tu nie ma celowo. Przeglądarka nie zna ani zegara serwera, ani
 * strefy studia, więc wpisana ręcznie chwila i tak była tłumaczona na regułę, którą
 * backend zna sam. Zostawała z tego jedna rzecz: kolejne pole do wypełnienia przy
 * wydaniu pojazdu i szansa, że ktoś ustawi podziękowanie na przyszły wtorek.
 */
export const ThankYouSmsSection = ({ enabled, onEnabledChange }: ThankYouSmsSectionProps) => (
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
                        Pójdzie zaraz po wydaniu pojazdu, w godzinach {THANK_YOU_OPENS_HOUR}:00-{THANK_YOU_CLOSES_HOUR}:00,
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
        </Box>
    </Section>
);
