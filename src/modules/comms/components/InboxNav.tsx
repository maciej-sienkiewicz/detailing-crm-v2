// src/modules/comms/components/InboxNav.tsx
// Nagłówek skrzynki „Zapytania": nazwa, trzy zakładki i jedno koło zębate.
//
// „Leady" i „Poczta" były dwoma modułami w menu, a w praktyce jedną pracą: klient
// pisze maila, mail staje się sprawą, sprawa wraca mailem. Przełączanie się między
// nimi kosztowało kontekst - w Leadach nie było widać, co klient napisał, w Poczcie
// nie było widać, na czym stoi sprawa. Teraz to jedno miejsce z trzema widokami:
//
//  - Sprawy  - kolejka spraw po tym, czyj jest ruch (dawne Leady), z rozmową obok;
//  - Poczta  - cała skrzynka, także maile, które sprawą nie są (faktury, dostawcy);
//  - Wysłane - wszystko, co wyszło od nas.
//
// Rzeczy rzadkie (stopka, skrzynki, podsumowanie, zamknięte sprawy) mieszkają pod
// kołem zębatym. Nie zniknęły - przestały konkurować o miejsce z codzienną pracą.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Archive, BarChart3, Inbox, PenLine, Settings } from 'lucide-react';
import { ActionMenu, IconButton, MenuDivider, MenuItem, Segmented, ui, useActionMenu } from '@/common/components/ui';
import { useNewLeadsCount } from '../hooks/useLeads';
import { useUnreadMailCount } from '../hooks/useComms';
import { SignatureSettingsModal } from './SignatureSettingsModal';
import type { InboxTab } from '../utils/inboxTabs';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 14px 10px;

    .top {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    h1 {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 19px;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: ${ui.ink};
    }

    @media (max-width: calc(${p => p.theme.breakpoints.md} - 1px)) {
        padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 8px;
    }
`;

interface InboxNavProps {
    active: InboxTab;
    /**
     * „Zamknięte sprawy" w kolejce spraw przełącza tryb na miejscu - widok wie,
     * jak to zrobić. Z poczty prowadzi adres `?archive=1`.
     */
    onOpenArchive?: () => void;
}

export function InboxNav({ active, onOpenArchive }: InboxNavProps) {
    const navigate = useNavigate();
    const [, setSearchParams] = useSearchParams();
    const casesWaiting = useNewLeadsCount();
    const unreadMail = useUnreadMailCount();
    const menu = useActionMenu();
    const [signatureOpen, setSignatureOpen] = useState(false);

    // Zmiana zakładki zaczyna od czystej listy: otwarty wątek albo sprawa należą do
    // widoku, z którego się wychodzi.
    const selectTab = (tab: InboxTab) => {
        if (tab === active) return;
        setSearchParams(tab === 'sprawy' ? {} : { view: tab }, { replace: true });
    };

    const openArchive = () => {
        menu.close();
        if (onOpenArchive) onOpenArchive();
        else setSearchParams({ archive: '1' }, { replace: true });
    };

    return (
        <Wrap>
            <div className="top">
                <h1>Zapytania</h1>
                <IconButton
                    label="Ustawienia skrzynki"
                    variant="ghost"
                    aria-haspopup="menu"
                    aria-expanded={menu.isOpen()}
                    active={menu.isOpen()}
                    onClick={(event) => menu.toggle(event, null)}
                >
                    <Settings />
                </IconButton>
            </div>
            <Segmented<InboxTab>
                block
                label="Widok skrzynki"
                value={active}
                onChange={selectTab}
                options={[
                    { value: 'sprawy', label: 'Sprawy', count: casesWaiting > 0 ? casesWaiting : null },
                    { value: 'poczta', label: 'Poczta', count: unreadMail > 0 ? unreadMail : null },
                    { value: 'wyslane', label: 'Wysłane' },
                ]}
            />

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Ustawienia skrzynki">
                <MenuItem icon={<PenLine />} onClick={() => { menu.close(); setSignatureOpen(true); }}>
                    Stopka maila
                </MenuItem>
                <MenuItem icon={<Inbox />} onClick={() => { menu.close(); navigate('/communication/mailboxes'); }}>
                    Skrzynki pocztowe
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<BarChart3 />} onClick={() => { menu.close(); navigate('/leads/analytics'); }}>
                    Podsumowanie miesiąca
                </MenuItem>
                <MenuItem icon={<Archive />} onClick={openArchive}>
                    Zamknięte sprawy
                </MenuItem>
            </ActionMenu>

            {signatureOpen && <SignatureSettingsModal isOpen onClose={() => setSignatureOpen(false)} />}
        </Wrap>
    );
}
