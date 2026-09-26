// src/modules/settings/components/devicesLayout.ts
//
// Wspólny układ trzech widoków „Tablety, telefon, kontakty".
//
// Każdy z nich miał własną kopię Block / BlockTitle / BlockHint i własny próg
// telefonu (900 px w tabletach, 639 px w kontaktach, 600 px w powiadomieniach),
// więc przy 700 px jeden widok był już kafelkami, a drugi jeszcze tabelą.
// Teraz jeden próg - ten sam 767 px co w reszcie ustawień - i jedne klocki.

import styled from 'styled-components';
import { Card, ui } from '@/common/components/ui';

/** Jedyny próg telefonu w tej sekcji. */
export const PHONE = '(max-width: 767px)';

/** Widok: zdanie o tym, do czego służy, a pod nim lista. */
export const View = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

export const Intro = styled.p`
    margin: 0;
    max-width: 68ch;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

/** Lista urządzeń - jedyna wyniesiona powierzchnia widoku (CLAUDE.md §2). */
export const ListCard = styled(Card)`
    display: flex;
    flex-direction: column;
`;

export const ListHead = styled.div`
    padding: 16px 20px 12px;

    @media ${PHONE} { padding: 14px 16px 10px; }
`;

export const DeviceRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid ${ui.lineFaint};
    min-width: 0;

    @media ${PHONE} {
        flex-wrap: wrap;
        padding: 12px 16px;
        gap: 8px 12px;
    }
`;

export const DeviceMain = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;

    > svg { width: 18px; height: 18px; flex-shrink: 0; color: ${ui.brandInk}; }
`;

export const DeviceText = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
        font-size: 14px;
        font-weight: 600;
        color: ${ui.ink};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

/** Stan i akcja wiersza; na telefonie schodzą pod nazwę, akcja na pełną szerokość palca. */
export const DeviceSide = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    @media ${PHONE} {
        width: 100%;
        justify-content: space-between;
    }
`;

export const EmptyState = styled.div`
    padding: 28px 20px 32px;
    border-top: 1px solid ${ui.lineFaint};
    text-align: center;

    strong { display: block; font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    p { margin: 6px auto 0; max-width: 46ch; font-size: 13px; line-height: 1.5; color: ${ui.textMuted}; }
`;

export const SkeletonLine = styled.div<{ $w: string }>`
    width: ${p => p.$w};
    height: 14px;
    border-radius: 6px;
    background: ${ui.surfaceAlt};
`;

export const ListNotice = styled.div`
    padding: 0 20px 16px;

    @media ${PHONE} { padding: 0 16px 14px; }
`;

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Odmiana po polsku: 1 → one, 2-4 (poza 12-14) → few, reszta → many. */
function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? few : many;
}

/** 1 tablet, 2 tablety, 5 tabletów, 22 tablety - licznik pisał kiedyś „2 tablety/ów". */
export const tabletsWord = (n: number) => plural(n, 'tablet', 'tablety', 'tabletów');

/** 1 telefon, 3 telefony, 5 telefonów. */
export const phonesWord = (n: number) => plural(n, 'telefon', 'telefony', 'telefonów');
