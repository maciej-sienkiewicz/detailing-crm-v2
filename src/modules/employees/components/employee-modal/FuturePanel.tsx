// src/modules/employees/components/employee-modal/FuturePanel.tsx
//
// Puste stany zakładek okna pracownika. Dokumenty i Zarobki mają swoje zakładki już
// teraz - z zatwierdzonej makiety: okno nie urośnie, gdy dojdą, przybędzie tylko treść.

import styled from 'styled-components';
import { Clock, FileText, Wallet } from 'lucide-react';
import { ui } from '@/common/components/ui';

type Kind = 'docs' | 'pay' | 'no-account-worktime';

const COPY: Record<Kind, { icon: typeof Clock; title: string; text: (first: string) => string; chips?: string[] }> = {
    docs: {
        icon: FileText,
        title: 'Dokumenty pojawią się tutaj wkrótce',
        text: () => 'Umowy, aneksy, badania lekarskie i szkolenia BHP, każde z datą ważności.',
        chips: ['Umowa o pracę', 'Aneks', 'Badania okresowe', 'Szkolenie BHP'],
    },
    pay: {
        icon: Wallet,
        title: 'Zarobki pojawią się tutaj wkrótce',
        text: () => 'Stawka z umowy, premie i wypłaty miesiąc po miesiącu.',
        chips: ['Stawka', 'Premie', 'Wypłaty'],
    },
    'no-account-worktime': {
        icon: Clock,
        title: 'Brak kart czasu pracy',
        text: first => `Bez konta nie ma kart czasu pracy. Po utworzeniu konta w „Ustawieniach" ${first} wypełni je sam.`,
    },
};

export function FuturePanel({ kind, firstName }: { kind: Kind; firstName: string }) {
    const { icon: Icon, title, text, chips } = COPY[kind];
    return (
        <Wrap>
            <Tile><Icon aria-hidden="true" /></Tile>
            <h3>{title}</h3>
            <p>{text(firstName)}</p>
            {chips && <Chips>{chips.map(c => <li key={c}>{c}</li>)}</Chips>}
        </Wrap>
    );
}

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px 16px;
    text-align: center;

    h3 { margin: 0; font-size: 16px; font-weight: 700; color: ${ui.ink}; }
    p { margin: 0; max-width: 46ch; font-size: 14px; line-height: 1.55; color: ${ui.textMuted}; }
`;

const Tile = styled.span`
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: ${ui.surfaceAlt};
    color: ${ui.textSecondary};

    svg { width: 24px; height: 24px; }
`;

const Chips = styled.ul`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;

    li {
        padding: 4px 12px;
        border: 1px dashed ${ui.lineStrong};
        border-radius: 999px;
        font-size: 13px;
        color: ${ui.textSecondary};
    }
`;
