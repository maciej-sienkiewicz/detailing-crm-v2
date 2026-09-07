import React, { useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useLinkFacebookPage, useSearchAdPages, useUnlinkFacebookPage } from '../hooks/useAds';

/**
 * Wskazanie strony na Facebooku dla obserwowanego profilu.
 *
 * Robi to człowiek, a nie kod, bo Meta nie udostępnia mostu profil IG → strona FB,
 * a wyszukiwanie po nazwie trafia na zbieżności - „Auto Spa" jest w każdym mieście
 * i pomyłka podpięłaby właścicielowi cudze kampanie jako kampanie konkurenta.
 */


const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const Input = styled.input`
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-family: inherit;
    font-size: ${st.fontMd};
    font-variant-numeric: tabular-nums;
    color: ${st.text};

    &:focus {
        outline: none;
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

const SearchRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: stretch;
    margin-bottom: 14px;
`;

const Candidates = styled.ul`
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
`;

/** Kandydat: nazwa, liczba reklam i data - tyle, żeby odróżnić firmę od zbieżnej nazwy. */
const Candidate = styled.button<{ $chosen: boolean }>`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    padding: 8px 11px;
    border: 1px solid ${p => (p.$chosen ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${p => (p.$chosen ? st.accentBlueDim : st.bgCard)};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color ${st.transition};

    &:hover { border-color: ${st.borderHover}; }

    strong {
        font-size: ${st.fontSm};
        font-weight: 700;
        color: ${st.text};
        overflow-wrap: anywhere;
    }
    span {
        flex-shrink: 0;
        font-size: ${st.fontXs};
        color: ${st.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
`;

const Hint = styled.p`
    margin: 10px 0 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    line-height: 1.5;

    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        background: ${st.bgCardAlt};
        padding: 1px 5px;
        border-radius: 4px;
    }
`;

const ErrorText = styled.p`
    margin: 10px 0 0;
    font-size: ${st.fontSm};
    color: ${st.accentRed};
`;

const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

interface Props {
    profileId: string;
    username: string;
    /** Obecnie wskazana strona - okno służy wtedy do zmiany albo odpięcia. */
    currentPageId?: string | null;
    onClose: () => void;
}

export const LinkFacebookPageModal: React.FC<Props> = ({ profileId, username, currentPageId, onClose }) => {
    const [pageId, setPageId] = useState(currentPageId ?? '');
    const [query, setQuery] = useState('');
    const link = useLinkFacebookPage();
    const unlink = useUnlinkFacebookPage();
    const search = useSearchAdPages();

    const digitsOnly = pageId.trim().replace(/\D/g, '');
    const busy = link.isPending || unlink.isPending;
    const candidates = search.data ?? [];
    const canSearch = query.trim().length >= 3 && !search.isPending;
    const canSubmit = digitsOnly.length >= 5 && digitsOnly !== currentPageId && !busy;

    const submit = () => {
        if (!canSubmit) return;
        link.mutate({ profileId, pageId: digitsOnly }, { onSuccess: onClose });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{currentPageId ? 'Zmień stronę na Facebooku' : 'Wskaż stronę na Facebooku'}</ModalTitle>
                    <ModalSubtitle>@{username}</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
                {/* Szukanie po nazwie stoi PRZED polem na numer, bo Biblioteka reklam
                    pokazuje w panelu reklamodawcy albo numer strony, albo jej nazwę
                    użytkownika - przy tej drugiej postaci numeru nie ma skąd przepisać. */}
                <Field as="div">
                    Nazwa studia
                    <SearchRow>
                        <Input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={event => event.key === 'Enter' && canSearch && search.mutate(query.trim())}
                            placeholder="np. Car Art Detailing"
                            autoFocus
                        />
                        <SharedButton
                            type="button"
                            $variant="secondary"
                            disabled={!canSearch}
                            onClick={() => search.mutate(query.trim())}
                        >
                            {search.isPending ? 'Szukam…' : 'Szukaj'}
                        </SharedButton>
                    </SearchRow>
                </Field>

                {search.isSuccess && candidates.length === 0 && (
                    <Hint>
                        Żadna strona o tej nazwie nie reklamowała się w ostatnim roku. Wpisz identyfikator
                        ręcznie albo sprawdź inną pisownię.
                    </Hint>
                )}

                {candidates.length > 0 && (
                    <Candidates>
                        {candidates.map(candidate => (
                            <li key={candidate.pageId}>
                                <Candidate
                                    type="button"
                                    $chosen={candidate.pageId === digitsOnly}
                                    onClick={() => setPageId(candidate.pageId)}
                                >
                                    <strong>{candidate.pageName}</strong>
                                    <span>
                                        {candidate.ads} rekl.
                                        {candidate.lastStart ? ` · od ${formatDay(candidate.lastStart)}` : ''}
                                    </span>
                                </Candidate>
                            </li>
                        ))}
                    </Candidates>
                )}

                <Field>
                    Identyfikator strony
                    <Input
                        value={pageId}
                        onChange={event => setPageId(event.target.value)}
                        onKeyDown={event => event.key === 'Enter' && submit()}
                        placeholder="np. 100064123456789"
                        inputMode="numeric"
                    />
                </Field>
                <Hint>
                    Masz już numer? Wpisz go wprost. Znajdziesz go w adresie Biblioteki reklam po{' '}
                    <code>view_all_page_id=</code> albo w sekcji „Przejrzystość strony" na Facebooku.
                </Hint>

                {link.isError && (
                    <ErrorText>
                        Nie udało się powiązać strony. Sprawdź, czy identyfikator to sama liczba z adresu.
                    </ErrorText>
                )}
                {unlink.isError && <ErrorText>Nie udało się odpiąć strony. Spróbuj ponownie.</ErrorText>}
                {currentPageId && (
                    <Hint>
                        Zmiana strony kasuje reklamy pobrane dla poprzedniej - to reklamy innej firmy.
                    </Hint>
                )}
            </ModalContent>

            <ModalFooter>
                {/* Odpięcie stoi z lewej, odsunięte od akcji głównej: kasuje pobrane
                    reklamy, więc nie ma prawa sąsiadować z „Zapisz" na odległość omyłki. */}
                {currentPageId && (
                    <SharedButton
                        type="button"
                        $variant="danger"
                        style={{ marginRight: 'auto' }}
                        disabled={busy}
                        onClick={() => unlink.mutate(profileId, { onSuccess: onClose })}
                    >
                        {unlink.isPending ? 'Odpinam…' : 'Odepnij stronę'}
                    </SharedButton>
                )}
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    Anuluj
                </SharedButton>
                <SharedButton type="button" disabled={!canSubmit} onClick={submit}>
                    {link.isPending ? 'Sprawdzam reklamy…' : currentPageId ? 'Zapisz' : 'Powiąż'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
