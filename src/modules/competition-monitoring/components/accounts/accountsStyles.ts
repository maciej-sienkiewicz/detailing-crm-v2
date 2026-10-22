import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import { PHONE } from '../../utils/phone';

/**
 * Klocki zakładki „Moje konta". Kafle liczb leżą PŁASKO (obwódka, bez cienia):
 * wyniesiona jest tylko karta Instagrama, bo to ona jest tematem zakładki
 * (CLAUDE.md §2, wyniesienie niesie temat).
 */

export const Columns = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 20px;
    align-items: start;

    @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }
`;

export const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
`;

/** Nagłówek sekcji konta: kafelek ikony, nazwa, linia stanu pod spodem. */
export const AccountHead = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
`;

export const IconTile = styled.span<{ $tone?: 'brand' | 'google' }>`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: ${p => p.$tone === 'google' ? ui.okTint : ui.brandTint};
    color: ${p => p.$tone === 'google' ? ui.okInk : ui.brandInk};

    svg { width: 20px; height: 20px; }
`;

export const HeadText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

export const HeadTitle = styled.h2`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: ${ui.ink};
    overflow-wrap: anywhere;

    /* Na telefonie nazwa ma cały wiersz obok ikony: uchwyt mieści się w jednej linii,
       a długa nazwa wizytówki („… – Powłoki ceramiczne, folie PPF…") kończy się
       wielokropkiem po dwóch, zamiast zajmować sześć. */
    ${PHONE} {
        font-size: 16px;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;

/** Atrybuty obok siebie z odstępem zamiast sklejania kropką (CLAUDE.md §4). */
export const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    min-width: 0;
`;

export const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0 22px 22px;
    min-width: 0;

    @media (max-width: 640px) { padding: 0 16px 16px; }
`;

export const CardHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 22px 18px;

    @media (max-width: 640px) { padding: 16px; }
`;

export const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

/**
 * Nagłówek konta na telefonie. „Odśwież" i ⋯ w jednym wierszu z nazwą zostawiały
 * jej 120 px i łamały uchwyt w środku słowa („@detailin / g_studio_ / mokotow").
 * Tu nazwa ma własny wiersz, stan i akcje drugi, atrybuty trzeci.
 */
export const PhoneHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 16px 14px;
    min-width: 0;
`;

export const PhoneHeadName = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

export const PhoneHeadBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
`;

/** Ocena wizytówki w miejscu plakietki stanu: fakt, nie stan, więc bez obwódki. */
export const PhoneHeadFact = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;
`;

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

export const KpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 760px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    ${PHONE} { gap: 8px; }
`;

/*
 * Kafel na telefonie ciaśniejszy: przy 360 px „Obserwujący netto" i „Kliknięcia
 * kontaktu" łamały się na dwie linie, a każda złamana etykieta przesuwała liczbę
 * w dół względem kafla obok.
 */
export const Kpi = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};
    min-width: 0;

    ${PHONE} { gap: 2px; padding: 10px 12px; }
`;

export const KpiLabel = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

export const KpiValue = styled.span`
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -0.01em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    line-height: 1.2;

    ${PHONE} { font-size: 20px; }
`;

export const KpiSub = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 12px;
    color: ${ui.textMuted};
`;

/** Zmiana do poprzednich 30 dni: odcień niesie kierunek, liczba stoi obok strzałki. */
export const Change = styled.span<{ $dir: 'up' | 'down' | 'flat' }>`
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$dir === 'up' ? ui.okInk : p.$dir === 'down' ? ui.dangerInk : ui.textMuted};
`;

/**
 * „do poprzednich 30 dni" pod każdym kaflem. Na telefonie powtarzało się cztery razy
 * w dwóch liniach na kafel - tam mówi to raz podpis nad kaflami (`PeriodCaption`),
 * a pod liczbą zostaje sama strzałka z procentem. Czytnik ekranu dalej słyszy całość.
 */
export const ChangeText = styled.span`
    ${PHONE} {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }
`;

/** Podpis okresu nad kaflami - tylko na telefonie, gdzie kafle nie powtarzają go same. */
export const PeriodCaption = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

export const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
    line-height: 1.5;
`;

/* Telefon: wiersze płasko, rozdzielone kreską - bez ramki w ramce panelu. */
export const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    ${PHONE} {
        gap: 0;

        > li + li { border-top: 1px solid ${ui.line}; }
    }
`;

export const RowText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;

    strong {
        font-size: 13.5px;
        font-weight: 650;
        color: ${ui.ink};
        overflow-wrap: anywhere;
    }

    /* „Grzegorz Pawlak | Pawlak Motors – import aut premium z Niemiec i Szwajcarii"
       zajmował trzy linie wiersza, który ma powiedzieć tylko, kto czeka. */
    ${PHONE} {
        strong {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    }
`;

export const Snippet = styled.span`
    font-size: 12.5px;
    color: ${ui.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/**
 * „Pokaż pozostałe" na telefonie: to, co nie czeka na reakcję (odpowiedziane opinie,
 * rozmowy bez czekającego klienta, dalsze posty), chowa się za nim, żeby lista
 * „odpisz do 19:20" nie leżała cztery ekrany niżej.
 */
export const ShowMore = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surfaceSoft};
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.brandInk};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    svg { width: 16px; height: 16px; flex-shrink: 0; transition: transform 150ms ease; }
    &[aria-expanded='true'] svg { transform: rotate(180deg); }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    @media (prefers-reduced-motion: reduce) { svg { transition: none; } }
`;

export const Loading = styled.div`
    padding: 24px 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
