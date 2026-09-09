import React from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Mobilny app-bar - kompaktowa karta, którą na telefonie stawiamy w miejscu
 * gradientowego hero (PageHeader). Wzorzec z natywnych aplikacji SaaS (Linear,
 * Stripe, Airtable, HubSpot): ikona-plakietka + nazwa modułu + licznik jako
 * caption + akcje po prawej. Materiał (białe tło, border, subtelny cień) daje
 * mu ciężar chrome'u, zamiast osamotnionego rzędu na tle strony.
 *
 * Jedno źródło prawdy dla wszystkich list (Wizyty, Klienci, Pojazdy, Galeria,
 * Zlecenia zbiorcze, Aktywność) - dzięki temu nagłówek mobilny wygląda i
 * zachowuje się identycznie na każdym widoku.
 */
const Bar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.05);
`;

const Left = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
`;

/** Kolorowa plakietka ikony - wzrokowa kotwica modułu i akcent marki bez
    ciężaru hero. Ikonę podaje widok (ta sama, którą moduł ma w sidebar). */
const Icon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.14) 0%, rgba(14, 165, 233, 0.06) 100%);
    color: ${st.accentBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(14, 165, 233, 0.16);

    svg { width: 20px; height: 20px; stroke-width: 2; }
`;

const Text = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Title = styled.div`
    font-size: 15px;
    font-weight: 600;
    color: ${st.text};
    letter-spacing: -0.2px;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Count = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

/** Pogrubiona liczba wewnątrz licznika ("342 rekordów"). */
export const MobilePageHeaderCountValue = styled.span`
    color: ${st.text};
    font-weight: 700;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

/** Primary CTA - pigułka w kolorze marki. Wewnątrz można dać znak "+" jako
    <span aria-hidden="true">+</span> plus etykietę. */
export const MobilePageHeaderButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 15px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.32);
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
    transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;

    &:active {
        background: #0284c7;
        box-shadow: 0 1px 4px rgba(14, 165, 233, 0.32);
        transform: translateY(0.5px);
    }

    span[aria-hidden='true'] {
        font-size: 17px;
        font-weight: 700;
        line-height: 1;
    }
`;

/** Akcja drugorzędna, ikona w kółku (np. filtry, ustawienia) - gdy widok
    potrzebuje więcej niż jednego przycisku obok tytułu. */
export const MobilePageHeaderIconButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: ${st.bgCardAlt};
    color: ${st.textSecondary};
    border: 1px solid ${st.border};
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background 150ms ease, color 150ms ease;

    &:active { background: ${st.border}; color: ${st.text}; }

    svg { width: 18px; height: 18px; stroke-width: 2; }
`;

export interface MobilePageHeaderProps {
    /** Ikona modułu (lucide) - ta sama co w sidebar. */
    icon: React.ReactNode;
    title: string;
    /** Licznik / podpis pod tytułem (np. <><MobilePageHeaderCountValue>342</MobilePageHeaderCountValue> rekordów</>). */
    subtitle?: React.ReactNode;
    /** Akcje po prawej - MobilePageHeaderButton / MobilePageHeaderIconButton. */
    actions?: React.ReactNode;
}

export const MobilePageHeader: React.FC<MobilePageHeaderProps> = ({ icon, title, subtitle, actions }) => (
    <Bar>
        <Left>
            <Icon aria-hidden="true">{icon}</Icon>
            <Text>
                <Title>{title}</Title>
                {subtitle != null && <Count>{subtitle}</Count>}
            </Text>
        </Left>
        {actions && <Actions>{actions}</Actions>}
    </Bar>
);
