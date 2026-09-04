// src/modules/comms/components/ComposePane.tsx
// Nowa wiadomość od zera - jedyna droga do napisania maila do kogoś, kto jeszcze
// nie napisał do nas.
//
// Pisze się tam, gdzie się czyta: w prawej kolumnie, w miejscu podglądu rozmowy.
// Okno modalne zasłoniłoby listę wątków, a przy pisaniu do klienta zwykle trzeba
// mieć ją pod ręką - choćby po to, żeby sprawdzić adres w innej rozmowie.
//
// Treść pisze ten sam ReplyComposer co w wątku (stopka, korekta, wysyłka) -
// w trybie bez wątku dokłada pola „Do" i „Temat".
import styled from 'styled-components';
import { ArrowLeft, PenSquare, X } from 'lucide-react';
import { useMailAccounts } from '../hooks/useComms';
import { ReplyComposer } from './ReplyComposer';
import { EmptyHint, IconButton } from './shared';

const Pane = styled.div<{ $hiddenOnMobile: boolean }>`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: ${({ $hiddenOnMobile }) => ($hiddenOnMobile ? 'none' : 'flex')};
    flex-direction: column;

    @media (min-width: ${p => p.theme.breakpoints.lg}) { display: flex; }
`;

const Header = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    display: flex;
    align-items: center;
    gap: 8px;

    .titles { flex: 1; min-width: 0; }
    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        display: flex;
        align-items: center;
        gap: 7px;
    }
    .sub {
        font-size: 12px;
        color: ${p => p.theme.colors.textSecondary};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    svg { width: 15px; height: 15px; }
`;

/**
 * Kompozytor stoi u góry, nie u dołu: nie odpowiadamy tu na nic, co byłoby nad nim.
 * Reszta kolumny zostaje pusta - i to jest informacja sama w sobie: wątku jeszcze
 * nie ma, powstanie dopiero po wysłaniu.
 */
const Body = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    > div {
        border-top: none;
    }
`;

const Hint = styled.div`
    padding: 18px 16px;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

interface ComposePaneProps {
    /** Chowany na telefonie, gdy widoczna jest lista wątków. */
    hiddenOnMobile: boolean;
    isDesktop: boolean;
    /** Adres wpisany z góry - np. „napisz do tego klienta". */
    initialTo?: string;
    onClose: () => void;
    /** Wiadomość poszła - rodzic pokazuje nowy wątek (w folderze Wysłane). */
    onSent: (threadId: string) => void;
}

export function ComposePane({ hiddenOnMobile, isDesktop, initialTo, onClose, onSent }: ComposePaneProps) {
    const { data: accounts } = useMailAccounts();
    const activeAccount = accounts?.find((account) => account.status !== 'DISABLED');

    return (
        <Pane $hiddenOnMobile={hiddenOnMobile}>
            <Header>
                {!isDesktop && (
                    <IconButton onClick={onClose} aria-label="Wróć do listy" style={{ padding: 7 }}>
                        <ArrowLeft />
                    </IconButton>
                )}
                <div className="titles">
                    <h3><PenSquare /> Nowa wiadomość</h3>
                    {activeAccount && <div className="sub">Wyślemy z {activeAccount.emailAddress}</div>}
                </div>
                {isDesktop && (
                    <IconButton onClick={onClose} aria-label="Zamknij" title="Zamknij" style={{ padding: 7 }}>
                        <X />
                    </IconButton>
                )}
            </Header>

            {activeAccount ? (
                <Body>
                    <ReplyComposer
                        accountId={activeAccount.id}
                        initialTo={initialTo}
                        requireSubject
                        onSent={onSent}
                    />
                    <Hint>Wysłana wiadomość utworzy nowy wątek w folderze Wysłane - wróci do Odebranych, gdy klient odpisze.</Hint>
                </Body>
            ) : (
                <EmptyHint>Podłącz skrzynkę, żeby wysyłać wiadomości.</EmptyHint>
            )}
        </Pane>
    );
}
