// src/common/components/ui/Surface.tsx
//
// Dwie powierzchnie i reguła, która je rozdziela (CLAUDE.md §2, „wyniesienie"):
//
//   Card  - W JEDNEJ KOLUMNIE DOKŁADNIE JEDNA. Temat okna: biel, promień 20px,
//           dwa cienie, pasek marki u góry. W wizycie to „Usługi", w zleceniach
//           zbiorczych karta kontrahenta.
//   Panel - wszystko inne. Płasko, obwódka, bez cienia.
//
// Wizyta miała wcześniej dziesięć jednakowo wyniesionych kart - czyli żadnej.

import styled from 'styled-components';
import { ui } from './tokens';

export const Card = styled.section`
    min-width: 0;
    background: ${ui.surface};
    border-radius: ${ui.radiusCard};
    border-top: 4px solid ${ui.brand};
    box-shadow: ${ui.shadowCard};
    overflow: hidden;

    @media (max-width: 767px) { border-radius: 18px; }
`;

export const Panel = styled.section`
    min-width: 0;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusPanel};
`;

/** Nagłówek panelu: tytuł z lewej, akcje z prawej. */
export const PanelHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
    padding: 14px 18px;
    min-width: 0;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

export const PanelActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const PanelBody = styled.div`
    padding: 0 18px 16px;
    min-width: 0;

    @media (max-width: 640px) { padding: 0 16px 14px; }
`;
