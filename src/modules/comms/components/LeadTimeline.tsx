// src/modules/comms/components/LeadTimeline.tsx
//
// Przebieg sprawy w oknie leada: statusy, korespondencja i odnotowane telefony
// na jednej nitce czasu.
//
// Wcześniej stała tu sama wędrówka po statusach, więc lead po wymianie trzech maili
// opisany był dwiema linijkami — „Nowy", „W kontakcie" — i milczał o tym, co w nim
// najważniejsze: o co klient pytał, kiedy odpisaliśmy i co odpowiedział. Fakty
// istniały, tylko w wątku poczty, czyli wszędzie, byle nie tam, gdzie się ich szuka.
//
// Układ jest wprost z makiety i różni się od poprzedniego w trzech miejscach:
// nitka jest JEDNA (rysowana w rynience wiersza, nie osobno pod tekstem), znacznik
// czasu stoi W LINII nazwy zdarzenia, a treść wiadomości jest zwykłym akapitem -
// bez przycisku, bez cytatu, bez ramki.

import { useCallback, useMemo } from 'react';
import styled, { type DefaultTheme } from 'styled-components';
import { Paperclip } from 'lucide-react';
import { commsApi } from '../api/commsApi';
import {
    LEAD_STATUS_COLORS,
    LEAD_STATUS_LABELS,
    type LeadTimelineAttachment,
    type LeadTimelineEntry,
} from '../types';
import { formatAge } from '../utils/leadUrgency';

/**
 * Kolor kropki. Statusy zachowują kolor swojego etapu — ten sam, którym etap
 * oznaczony jest w wybieraku, więc oś czasu czyta się bez legendy. Zdarzenia
 * kontaktu dostają kolory kierunku: klient i my.
 */
const colorOf = (entry: LeadTimelineEntry, theme: DefaultTheme): string => {
    switch (entry.kind) {
        // Załączniki bez wiadomości też przyszły od klienta — kropka ma o tym mówić
        // tym samym kolorem, którym mówi o jego mailu.
        case 'INBOUND_MESSAGE':
        case 'ATTACHMENTS': return theme.colors.warning;
        case 'OUTBOUND_MESSAGE':
        case 'CALLBACK': return theme.colors.success;
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_COLORS[entry.toStatus].fg : theme.colors.textMuted;
    }
};

const Timeline = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 20px;
    list-style: none;
    margin: 0;
    padding: 0;
`;

const Entry = styled.li`
    display: flex;
    gap: 12px;
`;

/**
 * Rynienka wiersza: kropka i odcinek nitki pod nią.
 *
 * Nitka należy do WIERSZA, a nie do całej listy. Wcześniej rysowała ją jedna linia
 * absolutna na kontenerze, a treść wiadomości miała własną kreskę cytatu tuż obok -
 * dwie pionowe linie kilka pikseli od siebie, z których żadna nie znaczyła tego, co
 * wyglądała, że znaczy. Odcinek w rynience rośnie razem z wierszem i kończy się
 * naturalnie na ostatnim zdarzeniu.
 */
const Gutter = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
`;

const Dot = styled.span<{ $entry: LeadTimelineEntry }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => colorOf(p.$entry, p.theme)};
    margin-top: 5px;
`;

const Line = styled.span`
    flex: 1 1 auto;
    width: 1px;
    background: ${p => p.theme.colors.border};
    margin-top: 5px;

    /* Ostatnie zdarzenie nitki nie ciągnie - nie ma do czego. */
    ${Entry}:last-child & {
        display: none;
    }
`;

const EntryBody = styled.div`
    min-width: 0;
`;

/**
 * Nazwa zdarzenia i znacznik czasu w JEDNEJ linii, na wspólnej linii bazowej.
 *
 * Data pod nazwą zabierała wierszowi drugą linijkę i przy czterech zdarzeniach
 * robiła z osi czasu listę akapitów. Obok nazwy czyta się ją jednym ruchem oka,
 * a przy wąskim panelu zawija się sama.
 */
const HeadRow = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 9px;
`;

const Name = styled.strong`
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

const When = styled.span`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

/**
 * Treść zdarzenia: zwykły akapit, bez cytatu i bez chowania za przyciskiem.
 *
 * [max-width] jest miarą czytelności, nie ozdobą - wiersz dłuższy niż mniej więcej
 * 90 znaków gubi się przy powrocie do początku następnego.
 */
const Text = styled.div`
    margin-top: 5px;
    max-width: 620px;
    font-size: 14px;
    line-height: 1.55;
    color: ${p => p.theme.colors.textSecondary};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

/**
 * Rząd plików pod treścią zdarzenia.
 *
 * Ten sam kształt plakietki co w skrzynce ([ConversationView], [MessageReaderOverlay]) —
 * plik wygląda tak samo niezależnie od tego, w którym miejscu CRM-u się na niego patrzy.
 */
const AttachmentRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
`;

const AttachmentChip = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    max-width: 100%;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

const ChipName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ChipSize = styled.span`
    flex-shrink: 0;
    color: ${p => p.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Empty = styled.div`
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

/**
 * Nagłówek zdarzenia. Pierwsza wiadomość klienta dostaje własną nazwę, bo to ona
 * jest początkiem sprawy — „Klient odpisał" na samej górze osi brzmiałoby jak
 * odpowiedź na coś, czego nie było.
 */
const headlineOf = (entry: LeadTimelineEntry, isFirstInbound: boolean): string => {
    switch (entry.kind) {
        case 'INBOUND_MESSAGE':
            return isFirstInbound ? 'Pierwszy kontakt klienta' : 'Klient odpisał';
        case 'OUTBOUND_MESSAGE':
            return 'Odpisaliśmy';
        case 'ATTACHMENTS':
            return 'Klient przysłał pliki';
        case 'CALLBACK':
            // Nie „Oddzwoniliśmy": zapis nie niesie kanału, a kontaktem bywa SMS albo
            // spotkanie. Nazwa ma opisywać to, co wiemy, i brzmieć tak samo jak
            // przycisk, którym się ją tworzy.
            return 'Kontakt poza pocztą';
        case 'STATUS':
        default:
            return entry.toStatus ? LEAD_STATUS_LABELS[entry.toStatus] : 'Zmiana statusu';
    }
};

/**
 * Wiek zdarzenia tą samą miarą, którą kolejka mierzy oczekiwanie („6 dni") - żeby
 * „Czeka 6 dni" na karcie i wiersz osi czasu mówiły o tym samym tymi samymi słowami.
 *
 * „temu" doklejamy warunkowo: `formatAge` zwraca dla świeżych zdarzeń gotowy zwrot
 * „przed chwilą", a „przed chwilą temu" nie jest zdaniem.
 */
const showsActor = (kind: LeadTimelineEntry['kind']): boolean =>
    kind === 'CALLBACK' || kind === 'STATUS';

/**
 * Rozmiar pliku w kilobajtach — jak w skrzynce. Plik mniejszy niż kilobajt i tak
 * ma dostać liczbę, bo „0 KB" wygląda jak plik pusty; taki pokazujemy jako „1 KB".
 */
const sizeOf = (bytes: number): string => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const agoOf = (iso: string): string => {
    const age = formatAge(Math.max(0, Date.now() - new Date(iso).getTime()));
    return age === 'przed chwilą' ? age : `${age} temu`;
};

/**
 * Znacznik czasu bez roku: „31 sierpnia, 08:14".
 *
 * Rok dopisujemy tylko wtedy, gdy zdarzenie nie jest z bieżącego - w osi czasu
 * leada, która rzadko sięga dalej niż kilka tygodni, „2026" w każdym wierszu jest
 * czterema znakami szumu.
 */
const stampOf = (iso: string): string => {
    const date = new Date(iso);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleString('pl-PL', {
        day: 'numeric',
        month: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
        hour: '2-digit',
        minute: '2-digit',
    });
};

interface LeadTimelineProps {
    entries: LeadTimelineEntry[];
}

export function LeadTimeline({ entries }: LeadTimelineProps) {
    /*
     * Pobranie przez blob, a nie przez `<a href>`: załącznik chroniony jest sesją,
     * więc żądanie musi przejść tą samą drogą co reszta API. Ta sama procedura co
     * w skrzynce ([MailView]).
     */
    const download = useCallback(
        async (attachment: LeadTimelineAttachment) => {
            try {
                const blob = await commsApi.downloadAttachment(attachment.id);
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = attachment.fileName;
                anchor.click();
                URL.revokeObjectURL(url);
            } catch {
                // Komunikat pokazuje już przechwytywacz `apiClient` — tu zostaje
                // tylko zdjęcie odrzuconej obietnicy, żeby nie wisiała w konsoli.
            }
        },
        []
    );

    /*
     * Backend oddaje oś rosnąco (`compareBy({ it.at })`), a czyta się ją od końca:
     * pytanie brzmi „co się wydarzyło ostatnio", nie „od czego się zaczęło".
     *
     * Nazwa „Pierwszy kontakt klienta" liczy się nadal z porządku CHRONOLOGICZNEGO:
     * po odwróceniu pierwsza wiadomość klienta w tablicy jest jego ostatnią
     * wiadomością i etykieta trafiłaby w zły wiersz.
     */
    const firstInboundId = entries.find((entry) => entry.kind === 'INBOUND_MESSAGE')?.id;
    const newestFirst = useMemo(() => [...entries].reverse(), [entries]);

    if (entries.length === 0) {
        return <Empty>Nic się jeszcze nie wydarzyło.</Empty>;
    }

    return (
        <Timeline>
            {newestFirst.map((entry) => {
                const text = entry.body ?? entry.note;
                return (
                    <Entry key={entry.id}>
                        <Gutter>
                            <Dot $entry={entry} />
                            <Line />
                        </Gutter>
                        <EntryBody>
                            <HeadRow>
                                <Name>
                                    {headlineOf(entry, entry.id === firstInboundId)}
                                    {entry.lostReasonLabel && <> ({entry.lostReasonLabel})</>}
                                </Name>
                                {/*
                                    Autor tylko przy zdarzeniach, które ktoś ZROBIŁ:
                                    odnotowanym kontakcie i zmianie statusu. Przy
                                    wiadomości nazwisko powtarza nadawcę, którego niesie
                                    już nazwa zdarzenia („Klient odpisał"), a przy tym
                                    wydłuża wiersz na tyle, że znacznik czasu zawija się
                                    pod nazwę - czyli wraca dokładnie ten układ, od
                                    którego ta zmiana odchodzi.
                                */}
                                <When>
                                    {agoOf(entry.at)} · {stampOf(entry.at)}
                                    {entry.actorName && showsActor(entry.kind) && (
                                        <>, {entry.actorName}</>
                                    )}
                                </When>
                            </HeadRow>
                            {text && <Text>{text}</Text>}
                            {entry.attachments.length > 0 && (
                                <AttachmentRow>
                                    {entry.attachments.map((attachment) => (
                                        <AttachmentChip
                                            key={attachment.id}
                                            type="button"
                                            title={attachment.fileName}
                                            onClick={() => void download(attachment)}
                                        >
                                            <Paperclip size={12} />
                                            <ChipName>{attachment.fileName}</ChipName>
                                            <ChipSize>{sizeOf(attachment.sizeBytes)}</ChipSize>
                                        </AttachmentChip>
                                    ))}
                                </AttachmentRow>
                            )}
                        </EntryBody>
                    </Entry>
                );
            })}
        </Timeline>
    );
}
