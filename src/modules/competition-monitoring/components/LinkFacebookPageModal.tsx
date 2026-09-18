import React, { useState } from 'react';
import styled from 'styled-components';
import { Check, Link2, Search, X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
} from '@/common/components/ModalKit';
import { FieldLabel, InputShell, BareInput, FormAlertBanner } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useToast } from '@/common/components/Toast';
import { useLinkFacebookPage, useSearchAdPages, useUnlinkFacebookPage } from '../hooks/useAds';

/**
 * Wskazanie strony na Facebooku dla obserwowanego profilu.
 *
 * Robi to człowiek, a nie kod, bo Meta nie udostępnia mostu profil IG → strona FB,
 * a wyszukiwanie po nazwie trafia na zbieżności - „Auto Spa" jest w każdym mieście
 * i pomyłka podpięłaby właścicielowi cudze kampanie jako kampanie konkurenta.
 *
 * Układ okna: jedno pole szukania u góry, pod nim POLE WYNIKÓW o stałej wysokości,
 * na końcu wybrany numer. Stała wysokość jest celowa - wcześniej okno było w 3/4
 * puste, a po wyszukaniu podskakiwało o 200 px, więc lista wysuwała się spod kursora.
 * Puste pole wyników nie zostaje puste: tłumaczy, co wpisać i gdzie szukać numeru,
 * czyli dokładnie to, po co ktoś tu zagląda pierwszy raz.
 */

const CurrentLink = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 18px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};

    svg { flex-shrink: 0; color: ${st.textMuted}; }
`;

const CurrentCopy = styled.div`
    min-width: 0;

    span {
        display: block;
        font-size: ${st.fontXs};
        color: ${st.textMuted};
    }
    strong {
        display: block;
        font-size: ${st.fontSm};
        font-weight: 600;
        color: ${st.text};
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
    }
`;

const SearchRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: stretch;

    > *:first-child { flex: 1; min-width: 0; }
    button { flex-shrink: 0; }
`;

/**
 * Pole wyników: jedna wysokość niezależnie od tego, czy jest pusto, czy jest sześć
 * firm. Okno przestaje przez to skakać, a wolna przestrzeń dostaje treść zamiast
 * bieli.
 */
const Results = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 208px;
    max-height: 288px;
    margin-top: 12px;
    overflow-y: auto;
`;

const Candidates = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

/** Kandydat: nazwa, konto IG, liczba reklam i data - tyle, żeby odróżnić firmę od zbieżnej nazwy. */
const Candidate = styled.button<{ $chosen: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    padding: 9px 11px;
    border: 1px solid ${p => (p.$chosen ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${p => (p.$chosen ? st.accentBlueDim : st.bgCard)};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color ${st.transition}, background ${st.transition};

    &:hover { border-color: ${st.borderHover}; }
`;

const Who = styled.div`
    min-width: 0;

    strong {
        display: block;
        font-size: ${st.fontSm};
        font-weight: 700;
        color: ${st.text};
        overflow-wrap: anywhere;
    }
    em {
        display: block;
        margin-top: 1px;
        font-size: ${st.fontXs};
        font-style: normal;
        color: ${st.textMuted};
        overflow-wrap: anywhere;
    }
`;

const Meta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    span {
        font-size: ${st.fontXs};
        color: ${st.textMuted};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
`;

const Chosen = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: ${st.radiusFull};
    background: ${st.accentBlue};
    color: #fff;
`;

/** Puste pole wyników: instrukcja zamiast bieli. */
const Placeholder = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    flex: 1;
    padding: 0 4px;
    font-size: ${st.fontSm};
    line-height: 1.55;
    color: ${st.textMuted};

    b {
        display: block;
        font-size: ${st.fontSm};
        font-weight: 600;
        color: ${st.textSecondary};
    }
    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        background: ${st.bgCardAlt};
        padding: 1px 5px;
        border-radius: 4px;
    }
`;

const Hint = styled.p`
    margin: 8px 0 0;
    font-size: ${st.fontXs};
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

const Section = styled.div`
    & + & { margin-top: 22px; }
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
    const { showSuccess, showError } = useToast();

    const digitsOnly = pageId.trim().replace(/\D/g, '');
    const busy = link.isPending || unlink.isPending;
    const candidates = search.data ?? [];
    const canSearch = query.trim().length >= 3 && !search.isPending;

    /**
     * Jeden wynik wypełnia pole sam: przy wklejonym adresie strony nie ma z czego
     * wybierać, a kazanie klikać jedyną pozycję to klik bez decyzji.
     */
    const runSearch = () => {
        if (!canSearch) return;
        search.mutate(query.trim(), {
            onSuccess: found => {
                if (found.length === 1) setPageId(found[0].pageId);
            },
        });
    };
    const canSubmit = digitsOnly.length >= 5 && digitsOnly !== currentPageId && !busy;

    /**
     * Po zapisaniu mówimy, CZYJĄ stronę powiązaliśmy - nazwą, którą zwróciła Meta.
     * Sam numer nic nie mówi, a wpisany z pomyłką wciąga do kalendarza reklamy
     * obcej firmy pod nazwą konkurenta i nie ma jak tego zauważyć.
     */
    const submit = () => {
        if (!canSubmit) return;
        link.mutate(
            { profileId, pageId: digitsOnly },
            {
                onSuccess: ({ adsFound, pageName }) => {
                    if (pageName) {
                        showSuccess(`Powiązano z: ${pageName}`, `Pobrano reklam: ${adsFound}`);
                    } else {
                        showError(
                            'Powiązano, ale bez reklam',
                            'Ta strona nie reklamowała się w ostatnim roku albo numer należy do innej firmy.'
                        );
                    }
                    onClose();
                },
            }
        );
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
                {currentPageId && (
                    <CurrentLink>
                        <Link2 size={16} />
                        <CurrentCopy>
                            <span>Obecnie powiązana strona</span>
                            <strong>{currentPageId}</strong>
                        </CurrentCopy>
                    </CurrentLink>
                )}

                <Section>
                    <ModalSectionTitle>Znajdź stronę</ModalSectionTitle>
                    {/* Jedno pole na wszystko, co człowiek ma pod ręką: wklejony adres strony
                        (z numerem albo z aliasem), sam numer albo nazwę firmy. Facebook pokazuje
                        tę samą stronę raz jako profile.php?id=…, raz jako /CarArtDetailing -
                        rozpoznanie postaci jest robotą aplikacji, nie użytkownika. */}
                    <FieldLabel htmlFor="fb-page-query">Adres strony, nazwa albo numer</FieldLabel>
                    <SearchRow>
                        <InputShell>
                            <BareInput
                                id="fb-page-query"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                onKeyDown={event => event.key === 'Enter' && canSearch && runSearch()}
                                placeholder="np. facebook.com/CarArtDetailing"
                                autoFocus
                            />
                        </InputShell>
                        <SharedButton type="button" $variant="secondary" disabled={!canSearch} onClick={runSearch}>
                            <Search size={15} />
                            {search.isPending ? 'Szukam…' : 'Szukaj'}
                        </SharedButton>
                    </SearchRow>

                    <Results>
                        {candidates.length > 0 ? (
                            <Candidates>
                                {candidates.map(candidate => (
                                    <li key={candidate.pageId}>
                                        <Candidate
                                            type="button"
                                            $chosen={candidate.pageId === digitsOnly}
                                            onClick={() => setPageId(candidate.pageId)}
                                        >
                                            <Who>
                                                <strong>{candidate.pageName || 'Nazwa nieznana'}</strong>
                                                {candidate.instagram && <em>@{candidate.instagram}</em>}
                                            </Who>
                                            <Meta>
                                                <span>
                                                    {candidate.ads > 0
                                                        ? `${candidate.ads} rekl.${candidate.lastStart ? ` · od ${formatDay(candidate.lastStart)}` : ''}`
                                                        : 'bez reklam'}
                                                </span>
                                                {candidate.pageId === digitsOnly && (
                                                    <Chosen><Check size={12} strokeWidth={3} /></Chosen>
                                                )}
                                            </Meta>
                                        </Candidate>
                                    </li>
                                ))}
                            </Candidates>
                        ) : (
                            <Placeholder>
                                {search.isSuccess ? (
                                    <>
                                        <b>Nic nie znaleziono</b>
                                        Po nazwie znajdziemy tylko firmy, które reklamowały się w ostatnim roku.
                                        Wklej adres strony na Facebooku albo wpisz numer niżej.
                                    </>
                                ) : (
                                    <>
                                        <b>Czego szukamy</b>
                                        Strony na Facebooku, z której ta firma wykupuje reklamy. Wklej adres jej
                                        profilu, wpisz nazwę albo numer strony - wyniki pokażą, ile reklam ma
                                        każda z firm, żeby nie pomylić jej ze zbieżną nazwą.
                                        <span>
                                            Numer znajdziesz też w adresie Biblioteki reklam Meta,
                                            po <code>view_all_page_id=</code>.
                                        </span>
                                    </>
                                )}
                            </Placeholder>
                        )}
                    </Results>
                </Section>

                <Section>
                    <ModalSectionTitle>Wybrana strona</ModalSectionTitle>
                    <FieldLabel htmlFor="fb-page-id">Identyfikator strony</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="fb-page-id"
                            value={pageId}
                            onChange={event => setPageId(event.target.value)}
                            onKeyDown={event => event.key === 'Enter' && submit()}
                            placeholder="np. 100064123456789"
                            inputMode="numeric"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        />
                    </InputShell>
                    <Hint>Wypełnia się samo po wybraniu firmy z listy wyżej.</Hint>
                </Section>

                {currentPageId && (
                    <FormAlertBanner style={{ marginTop: 18 }}>
                        Zmiana strony kasuje reklamy pobrane dla poprzedniej - to reklamy innej firmy.
                    </FormAlertBanner>
                )}
                {link.isError && (
                    <FormAlertBanner style={{ marginTop: 10 }}>
                        Nie udało się powiązać strony. Sprawdź, czy identyfikator to sama liczba z adresu.
                    </FormAlertBanner>
                )}
                {unlink.isError && (
                    <FormAlertBanner style={{ marginTop: 10 }}>
                        Nie udało się odpiąć strony. Spróbuj ponownie.
                    </FormAlertBanner>
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
