// src/modules/settings/components/services/ServicesTableRow.tsx
//
// Jeden wiersz cennika: nazwa (z linijką wyjaśnienia) → kwota główna → druga kwota
// z VAT → ⋮.
//
// Kwota główna to strona wybrana w „Ceny: Brutto | Netto" (domyślnie brutto, bo
// tyle płaci klient). Wcześniej główną kwotą było zawsze netto, a brutto stało obok
// jako szary dopisek „· 23%" - cena wpisana jako 1900,00 zł brutto czytała się jako
// 1544,72 zł.
//
// Akcje siedzą w menu ⋮ (jedno menu na całą listę, trzyma je sekcja). Wcześniej
// ołówek i kosz stały przy każdym wierszu, a kosz nie słuchał `actionsDisabled`
// i dało się archiwizować usługę w trakcie edycji innej.
import type { MouseEvent } from 'react';
import styled from 'styled-components';
import { MoreVertical } from 'lucide-react';
import { IconButton, StatusPill, ui } from '@/common/components/ui';
import type { Service } from '@/modules/services/types';
import type { PriceSide } from '@/common/utils/priceInputs';
import {
    SERVICES_TABLE_GRID,
    careSentence,
    packageItemsSentence,
    rowPriceTexts,
} from './servicesTable.helpers';

export interface ServicesTableRowProps {
    service: Service;
    /** Która kwota jest główna - wybór „Ceny: Brutto | Netto". */
    priceSide: PriceSide;
    /** Tytuły instrukcji pielęgnacji przypiętych do usługi. */
    careTitles?: string[];
    /** Blokuje menu akcji (edycję, archiwizację, instrukcje), gdy trwa inna edycja. */
    actionsDisabled: boolean;
    menuOpen: boolean;
    onOpenMenu: (e: MouseEvent<HTMLElement>, service: Service) => void;
}

export function ServicesTableRow({
    service, priceSide, careTitles = [], actionsDisabled, menuOpen, onOpenMenu,
}: ServicesTableRowProps) {
    const prices = rowPriceTexts(service, priceSide);
    const note = service.requireManualPrice
        ? 'Cenę ustalasz przy każdym zleceniu'
        : service.isPackage
            ? packageItemsSentence(service)
            : careSentence(careTitles);

    return (
        <Row $muted={!service.isActive} data-testid="services-row">
            <NameCell>
                <NameLine>
                    <Name>{service.name}</Name>
                    {!service.isActive && <StatusPill $tone="neutral">Archiwalna</StatusPill>}
                </NameLine>
                {note && <Note>{note}</Note>}
                {/* Na telefonie nie ma kolumny „Netto i VAT" - druga kwota schodzi pod nazwę. */}
                <PhoneSecondary>{prices.secondary}</PhoneSecondary>
            </NameCell>

            <MainCell>
                {prices.main === null ? (
                    <StatusPill $tone="warn">
                        <Wide>Wycena ręczna</Wide>
                        <Narrow>Ręczna</Narrow>
                    </StatusPill>
                ) : (
                    <>
                        <MainAmount data-testid="services-row-main">{prices.main}</MainAmount>
                        <MainCaption>{prices.mainCaption}</MainCaption>
                    </>
                )}
            </MainCell>

            <SecondaryCell data-testid="services-row-secondary">{prices.secondary}</SecondaryCell>

            <ActionsCell>
                {service.isActive && (
                    <IconButton
                        label={`Więcej akcji: ${service.name}`}
                        variant="outline"
                        size="sm"
                        shape="square"
                        disabled={actionsDisabled}
                        aria-haspopup="menu"
                        active={menuOpen}
                        onClick={e => onOpenMenu(e, service)}
                    >
                        <MoreVertical />
                    </IconButton>
                )}
            </ActionsCell>
        </Row>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PHONE = '@media (max-width: 767px)';

const Row = styled.div<{ $muted: boolean }>`
    display: grid;
    grid-template-columns: ${SERVICES_TABLE_GRID};
    gap: 16px;
    align-items: center;
    padding: 14px 24px;
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => (p.$muted ? 0.72 : 1)};

    ${PHONE} {
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 10px;
        padding: 12px 16px;
    }
`;

const NameCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    min-width: 0;
`;

const NameLine = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    min-width: 0;
`;

const Name = styled.span`
    font-size: 14.5px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Note = styled.span`
    font-size: 13px;
    line-height: 1.4;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const PhoneSecondary = styled.span`
    display: none;
    font-size: 13px;
    color: ${ui.textMuted};

    ${PHONE} { display: block; }
`;

const MainCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    min-width: 0;
    text-align: right;
`;

const MainAmount = styled.span`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const MainCaption = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};

    /* Na telefonie drugą stronę nazywa zdanie pod nazwą („500,00 zł netto, VAT 23%"),
       więc podpis pod kwotą byłby trzecim powtórzeniem tego samego. */
    ${PHONE} { display: none; }
`;

const SecondaryCell = styled.div`
    font-size: 13px;
    color: ${ui.textMuted};
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    ${PHONE} { display: none; }
`;

const ActionsCell = styled.div`
    display: flex;
    justify-content: flex-end;
    min-width: 30px;
`;

/* Na telefonie krótsza etykieta: „Wycena ręczna" spychała ⋮ do drugiej linii. */
const Wide = styled.em`
    font-style: normal;
    ${PHONE} { display: none; }
`;

const Narrow = styled.em`
    display: none;
    font-style: normal;
    ${PHONE} { display: inline; }
`;
