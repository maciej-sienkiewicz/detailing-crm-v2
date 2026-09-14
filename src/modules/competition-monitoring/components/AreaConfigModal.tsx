import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Check, EyeOff, RotateCcw, X } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { AreaMatchMode, CatalogPhrase } from '../types';
import {
    useAreaSettings,
    useSaveAreaSettings,
    usePhraseCatalog,
    useBlockedAdvertisers,
    useUnblockAdvertiser,
} from '../hooks/useAreaDiscovery';

/**
 * Ustawienia rejonu — jedno okno, jeden zestaw ustawień.
 *
 * Wcześniej był tu CRUD nazwanych śledzeń. Zniknął razem z powodem, dla którego
 * istniał: odkąd frazy pochodzą ze wspólnego katalogu, wszystkie śledzenia jednego
 * studia miały identyczne frazy i różniły się wyłącznie listą miejscowości — czyli
 * były tym samym pytaniem zadanym kilka razy, z nazwą do wymyślenia za każdym razem.
 *
 * Zostały trzy rzeczy, na które studio faktycznie odpowiada: gdzie patrzeć, jak
 * szeroko rozumieć „w rejonie" i czego z katalogu nie chce.
 */

const MODE_LABELS: Record<AreaMatchMode, string> = {
    CITIES_ONLY: 'Tylko wpisane miejscowości',
    INCLUDE_BROADER: 'Także województwo i cała Polska',
};

/** „1 fraza / 2 frazy / 5 fraz" — polska odmiana, bo „43 fraz" kłuje w oczy. */
export const phraseWord = (n: number): string => {
    if (n === 1) return 'fraza';
    const last = n % 10;
    const lastTwo = n % 100;
    if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'frazy';
    return 'fraz';
};

const Section = styled.div`
    & + & {
        margin-top: 22px;
        padding-top: 22px;
        border-top: 1px solid ${st.border};
    }
`;

const SectionLabel = styled.h3`
    margin: 0 0 12px;
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${st.textMuted};
`;

const Field = styled.div`
    & + & { margin-top: 16px; }
`;

const FieldLabel = styled.label`
    display: block;
    margin-bottom: 6px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const FieldHint = styled.span`
    font-weight: 400;
    color: ${st.textMuted};
`;

const TagBox = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};

    &:focus-within { border-color: ${st.accentBlue}; }
`;

const Tag = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: ${st.radiusFull};
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    font-size: ${st.fontXs};
    font-weight: 600;

    button {
        display: inline-flex;
        border: none;
        background: none;
        padding: 0;
        color: inherit;
        cursor: pointer;
        opacity: 0.7;
        &:hover { opacity: 1; }
    }
    svg { width: 12px; height: 12px; }
`;

const TextInput = styled.input`
    flex: 1;
    min-width: 120px;
    border: none;
    outline: none;
    background: none;
    font-family: inherit;
    font-size: ${st.fontSm};
    color: ${st.text};

    &::placeholder { color: ${st.textMuted}; }
`;

/** Lista miejscowości: Enter albo przecinek dodaje kolejną. */
const TagField = ({
    label,
    placeholder,
    values,
    onChange,
}: {
    label: React.ReactNode;
    placeholder: string;
    values: string[];
    onChange: (values: string[]) => void;
}) => {
    const [draft, setDraft] = useState('');

    const commit = (raw: string) => {
        const value = raw.trim().replace(/,$/, '').trim();
        if (value && !values.includes(value)) onChange([...values, value]);
        setDraft('');
    };

    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <TagBox>
                {values.map(value => (
                    <Tag key={value}>
                        {value}
                        <button type="button" aria-label={`Usuń ${value}`} onClick={() => onChange(values.filter(v => v !== value))}>
                            <X />
                        </button>
                    </Tag>
                ))}
                <TextInput
                    value={draft}
                    placeholder={values.length ? '' : placeholder}
                    onChange={e => (e.target.value.endsWith(',') ? commit(e.target.value) : setDraft(e.target.value))}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
                        if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
                    }}
                    onBlur={() => commit(draft)}
                />
            </TagBox>
        </Field>
    );
};

const ModeToggle = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const ModeBtn = styled.button<{ $active: boolean }>`
    flex: 1 1 200px;
    padding: 8px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { border-color: ${st.borderHover}; }
`;

// ── Wybór fraz z katalogu ─────────────────────────────────────────────────────

const PhraseGroupBox = styled.div`
    & + & { margin-top: 14px; }
`;

const PhraseGroupHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
`;

const PhraseGroupName = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: ${st.textMuted};
`;

const GroupToggle = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${st.fontXs};
    color: ${st.accentBlue};
    cursor: pointer;
    white-space: nowrap;
    &:hover { text-decoration: underline; }
`;

const PhraseGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const PhraseChip = styled.button<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$on ? st.accentBlue : st.border)};
    background: ${p => (p.$on ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$on ? st.accentBlue : st.textMuted)};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$on ? 600 : 500)};
    cursor: pointer;
    transition: all ${st.transition};
    max-width: 100%;
    text-align: left;

    &:hover { border-color: ${p => (p.$on ? st.accentBlue : st.borderHover)}; }
    svg { flex-shrink: 0; }
`;

const PhraseCount = styled.div`
    margin-top: 10px;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

/**
 * Katalog fraz z odznaczaniem.
 *
 * Trzymamy WYKLUCZENIA, nie zaznaczenia: fraza dołożona przez administratora
 * włącza się wtedy wszystkim sama, zamiast czekać, aż każdy ją sobie zaznaczy.
 */
const PhrasePicker = ({
    catalog,
    excluded,
    onChange,
}: {
    catalog: CatalogPhrase[];
    excluded: string[];
    onChange: (excluded: string[]) => void;
}) => {
    const groups = catalog.reduce<{ key: string; label: string; items: CatalogPhrase[] }[]>((acc, phrase) => {
        const found = acc.find(g => g.key === phrase.group);
        if (found) found.items.push(phrase);
        else acc.push({ key: phrase.group, label: phrase.groupLabel, items: [phrase] });
        return acc;
    }, []);

    const excludedSet = new Set(excluded);
    const toggle = (id: string) =>
        onChange(excludedSet.has(id) ? excluded.filter(e => e !== id) : [...excluded, id]);

    const setGroup = (items: CatalogPhrase[], on: boolean) => {
        const ids = new Set(items.map(i => i.id));
        // Wykluczenia spoza grupy zostają nietknięte — przycisk grupy rusza tylko swoją.
        const rest = excluded.filter(e => !ids.has(e));
        onChange(on ? rest : [...rest, ...items.map(i => i.id)]);
    };

    const tracked = catalog.length - excludedSet.size;

    return (
        <Field>
            <FieldLabel>
                Śledzone frazy <FieldHint>(listę ustala administrator — odznacz to, co Cię nie dotyczy)</FieldHint>
            </FieldLabel>

            {groups.map(group => {
                const allOn = group.items.every(i => !excludedSet.has(i.id));
                return (
                    <PhraseGroupBox key={group.key}>
                        <PhraseGroupHead>
                            <PhraseGroupName>{group.label}</PhraseGroupName>
                            <GroupToggle type="button" onClick={() => setGroup(group.items, !allOn)}>
                                {allOn ? 'odznacz grupę' : 'zaznacz grupę'}
                            </GroupToggle>
                        </PhraseGroupHead>
                        <PhraseGrid>
                            {group.items.map(phrase => {
                                const on = !excludedSet.has(phrase.id);
                                return (
                                    <PhraseChip
                                        key={phrase.id}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        $on={on}
                                        onClick={() => toggle(phrase.id)}
                                    >
                                        {on ? <Check size={13} /> : <X size={13} />} {phrase.text}
                                    </PhraseChip>
                                );
                            })}
                        </PhraseGrid>
                    </PhraseGroupBox>
                );
            })}

            <PhraseCount>
                Śledzone: <strong>{tracked}</strong> z {catalog.length} {phraseWord(catalog.length)}
                {tracked === 0 && ' — zaznacz przynajmniej jedną, inaczej nie ma czego szukać.'}
            </PhraseCount>
        </Field>
    );
};

// ── Ukryci reklamodawcy ───────────────────────────────────────────────────────

const BlockedRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const BlockedName = styled.div`
    flex: 1;
    min-width: 0;
    strong {
        display: block;
        font-size: ${st.fontSm};
        font-weight: 600;
        color: ${st.text};
        overflow-wrap: anywhere;
    }
    span {
        font-size: ${st.fontXs};
        color: ${st.textMuted};
    }
`;

const RowAction = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) { border-color: ${st.borderHover}; color: ${st.text}; }
    &:disabled { opacity: 0.4; cursor: default; }
    svg { width: 15px; height: 15px; }
`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const AreaConfigModal = ({ isOpen, onClose }: Props) => {
    const settingsQuery = useAreaSettings(isOpen);
    const catalogQuery = usePhraseCatalog(isOpen);
    const blocksQuery = useBlockedAdvertisers(isOpen);
    const saveMut = useSaveAreaSettings();
    const unblockMut = useUnblockAdvertiser();

    const catalog = catalogQuery.data ?? [];
    const blocked = blocksQuery.data ?? [];

    const [form, setForm] = useState({
        locations: [] as string[],
        excluded: [] as string[],
        mode: 'INCLUDE_BROADER' as AreaMatchMode,
    });

    // Formularz zasilamy zapisanym stanem raz — przy otwarciu okna. Późniejsze
    // odświeżenia zapytania nie mogą nadpisać tego, co człowiek właśnie klika.
    const settings = settingsQuery.data;
    useEffect(() => {
        if (!isOpen || !settings) return;
        setForm({
            locations: settings.locations,
            excluded: settings.excludedPhraseIds,
            mode: settings.matchMode,
        });
    }, [isOpen, settings]);

    const canSave =
        form.locations.length > 0 && (catalog.length === 0 || form.excluded.length < catalog.length);

    const handleSave = () => {
        if (!canSave) return;
        saveMut.mutate(
            { locations: form.locations, excludedPhraseIds: form.excluded, matchMode: form.mode },
            { onSuccess: () => onClose() }
        );
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="640px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Reklamodawcy w okolicy</ModalTitle>
                    <ModalSubtitle>
                        Wskaż rejon i odznacz frazy, które Cię nie dotyczą. Dane odświeżają się
                        automatycznie przez całą dobę.
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Section>
                    <TagField
                        label={<>Rejon — miejscowości <FieldHint>(Enter lub przecinek dodaje kolejną)</FieldHint></>}
                        placeholder="np. Poznań, Skórzewo, Suchy Las"
                        values={form.locations}
                        onChange={locations => setForm(f => ({ ...f, locations }))}
                    />

                    <Field>
                        <FieldLabel>Jak szeroko rozumieć „w rejonie"</FieldLabel>
                        <ModeToggle role="radiogroup">
                            {(Object.keys(MODE_LABELS) as AreaMatchMode[]).map(key => (
                                <ModeBtn
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.mode === key}
                                    $active={form.mode === key}
                                    onClick={() => setForm(f => ({ ...f, mode: key }))}
                                >
                                    {MODE_LABELS[key]}
                                </ModeBtn>
                            ))}
                        </ModeToggle>
                    </Field>
                </Section>

                {catalog.length > 0 && (
                    <Section>
                        <PhrasePicker
                            catalog={catalog}
                            excluded={form.excluded}
                            onChange={excluded => setForm(f => ({ ...f, excluded }))}
                        />
                    </Section>
                )}

                {blocked.length > 0 && (
                    <Section>
                        <SectionLabel>Ukryci reklamodawcy</SectionLabel>
                        {/*
                          * Wyłącznie ukrycia TEGO studia. Wykluczeń globalnych (boty, hurtownie,
                          * profile zza granicy) nie ma tu w ogóle — zakłada je administrator
                          * aplikacji i obowiązują wszystkich, więc nie ma czego cofać.
                          */}
                        {blocked.map(row => (
                            <BlockedRow key={row.pageId}>
                                <EyeOff size={15} color={st.textMuted} />
                                <BlockedName>
                                    <strong>{row.pageName || 'Nazwa nieznana'}</strong>
                                    <span>{row.pageId}</span>
                                </BlockedName>
                                <RowAction
                                    type="button"
                                    aria-label={`Przywróć ${row.pageName ?? row.pageId}`}
                                    title="Przywróć w tabeli"
                                    disabled={unblockMut.isPending}
                                    onClick={() => unblockMut.mutate(row.pageId)}
                                >
                                    <RotateCcw />
                                </RowAction>
                            </BlockedRow>
                        ))}
                    </Section>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    $size="sm"
                    onClick={handleSave}
                    disabled={!canSave || saveMut.isPending}
                >
                    <Check size={15} /> Zapisz
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
