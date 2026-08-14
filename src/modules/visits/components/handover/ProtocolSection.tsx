import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { Box, Muted, Section, SectionLabel } from './HandoverKit';

const Check = styled.label<{ $checked: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => (p.$checked ? 'rgba(16,185,129,0.35)' : st.border)};
    background: ${p => (p.$checked ? st.accentGreenDim : st.bgCard)};
    cursor: pointer;
    transition: all 140ms ease;

    &:hover { border-color: ${p => (p.$checked ? 'rgba(16,185,129,0.5)' : st.accentBlue)}; }

    input {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        cursor: pointer;
        accent-color: ${st.accentGreen};
    }

    span {
        font-size: ${st.fontSm};
        color: ${st.text};
        line-height: 1.45;
    }
`;

interface ProtocolSectionProps {
    signed: boolean;
    onChange: (signed: boolean) => void;
    isDoorToDoor: boolean;
}

/**
 * Potwierdzenie podpisu protokołu wydania.
 *
 * Świadomie niezaznaczone domyślnie i nieblokujące. Wcześniej wizyta zawsze
 * szła do backendu z `signatureObtained: true`, mimo że ekran podpisu był
 * atrapą — w bazie zostawał ślad podpisu, którego nikt nie złożył. Teraz
 * wysyłamy stan faktyczny.
 *
 * Podpis na tablecie (moduł istnieje po stronie backendu) podłączymy, gdy
 * powstanie formularz protokołu wydania — do tego czasu jest to deklaracja
 * pracownika o podpisie papierowym.
 */
export const ProtocolSection = ({ signed, onChange, isDoorToDoor }: ProtocolSectionProps) => (
    <Section>
        <SectionLabel>Protokół wydania</SectionLabel>
        <Box>
            <Check $checked={signed}>
                <input
                    type="checkbox"
                    checked={signed}
                    onChange={event => onChange(event.target.checked)}
                />
                <span>
                    {isDoorToDoor
                        ? 'Klient podpisał protokół wydania i potwierdzenie dostarczenia pojazdu'
                        : 'Klient podpisał protokół wydania pojazdu'}
                </span>
            </Check>
            <Muted>
                Nieobowiązkowe — brak podpisu nie blokuje wydania. Podpis na tablecie zostanie
                podłączony razem z formularzem protokołu.
            </Muted>
        </Box>
    </Section>
);
