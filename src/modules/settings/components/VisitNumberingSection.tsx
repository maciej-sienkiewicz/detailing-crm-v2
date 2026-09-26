// src/modules/settings/components/VisitNumberingSection.tsx
//
// Ustawienia → Oznaczenia → Numeracja wizyt.
//
// UX model: the user picks a numbering STYLE from visual cards showing concrete
// example numbers (yearly / monthly / continuous / random), not a template
// syntax. The template language ({YYYY} {MM} {DD} {SEQ} {RAND}) only surfaces
// when they explicitly choose "Własny format". A hero preview at the top always
// shows the resulting number plus a plain-language caption of how it behaves
// (when the counter resets, or that digits are random). Validation mirrors the
// backend's NumberingTemplate; the backend re-validates on save regardless.
//
// Czego już nie ma: w trakcie wczytywania i po błędzie sekcja zwracała `null`
// (pusta strona bez słowa), a „Zapisz zmiany" przy błędnym formacie nic nie robił -
// pasek nie mówił dlaczego. Teraz pasek nazywa problem, a „Zapisz" i „Pokaż pole"
// otwierają własny format i ustawiają kursor w polu.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, ui } from '@/common/components/ui';
import { useVisitNumberingConfig, useUpdateVisitNumberingConfig } from '../hooks/useCompany';
import { UnsavedChangesBanner } from './shared/SettingsLayout';
import { backendMessage, shownByInterceptor } from './studioErrors';

// ─── Template logic (mirrors backend NumberingTemplate) ──────────────────────

const KNOWN_TOKENS = new Set(['YYYY', 'YY', 'MM', 'DD', 'SEQ', 'RAND']);
const TOKEN_RE = /\{([A-Za-z]*)\}/g;

const validateFormat = (format: string): string | null => {
    if (!format.trim()) return 'Format nie może być pusty';
    if (format.length > 100) return 'Format jest za długi (maks. 100 znaków)';
    const seqCount = (format.match(/\{SEQ\}/g) ?? []).length;
    const randCount = (format.match(/\{RAND\}/g) ?? []).length;
    if (seqCount + randCount !== 1) return 'Użyj dokładnie jednego znacznika {SEQ} albo {RAND}';
    for (const match of format.matchAll(TOKEN_RE)) {
        if (!KNOWN_TOKENS.has(match[1])) return `Nieznany znacznik: {${match[1]}}`;
    }
    return null;
};

const usesRandom = (format: string): boolean => format.includes('{RAND}');

// Deterministic "random-looking" digits so previews don't jitter on re-renders.
const SAMPLE_RANDOM = '739284615037';

const sampleNumber = (format: string, sequenceLength: number, randomLength: number): string | null => {
    if (validateFormat(format)) return null;
    const now = new Date();
    const filler = usesRandom(format)
        ? { token: '{RAND}', value: SAMPLE_RANDOM.slice(0, Math.min(Math.max(randomLength, 1), 12)) }
        : { token: '{SEQ}', value: '1'.padStart(Math.min(Math.max(sequenceLength, 1), 10), '0') };
    return format
        .replace('{YYYY}', String(now.getFullYear()))
        .replace('{YY}', String(now.getFullYear() % 100).padStart(2, '0'))
        .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DD}', String(now.getDate()).padStart(2, '0'))
        .replace(filler.token, filler.value);
};

// Plain-language explanation of how the chosen format behaves.
const behaviorOf = (format: string): string => {
    if (usesRandom(format)) return 'Cyfry są losowane przy każdej wizycie: numer nie zdradza liczby wizyt.';
    if (format.includes('{DD}')) return 'Licznik rośnie o 1 i resetuje się każdego dnia.';
    if (format.includes('{MM}')) return 'Licznik rośnie o 1 i resetuje się co miesiąc.';
    if (format.includes('{YYYY}') || format.includes('{YY}')) return 'Licznik rośnie o 1 i resetuje się co rok.';
    return 'Licznik rośnie o 1 bez resetowania.';
};

// ─── Styles the user picks from ──────────────────────────────────────────────

const STYLES = [
    { id: 'yearly', name: 'Roczna', format: 'VIS-{YYYY}-{SEQ}', desc: 'reset licznika co rok' },
    { id: 'monthly', name: 'Miesięczna', format: 'VIS/{YYYY}/{MM}/{SEQ}', desc: 'reset licznika co miesiąc' },
    { id: 'continuous', name: 'Ciągła', format: 'W/{SEQ}/{YY}', desc: 'licznik bez resetu' },
    { id: 'random', name: 'Losowa', format: 'VIS-{YYYY}-{RAND}', desc: 'nie zdradza liczby wizyt' },
] as const;

const CUSTOM_TOKENS: { token: string; label: string }[] = [
    { token: '{YYYY}', label: 'rok' },
    { token: '{YY}', label: 'rok 2-cyfrowy' },
    { token: '{MM}', label: 'miesiąc' },
    { token: '{DD}', label: 'dzień' },
    { token: '{SEQ}', label: 'licznik' },
    { token: '{RAND}', label: 'cyfry losowe' },
];

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
`;

// Jedyna wyniesiona powierzchnia sekcji (CLAUDE.md §2).
const Panel = styled(Card)`
    padding: 22px 24px 24px;

    @media (max-width: 640px) { padding: 18px 16px 20px; }
`;

const Lead = styled.p`
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
    margin: 0 0 18px;
`;

const Loading = styled.p`
    margin: 0;
    padding: 28px 0;
    font-size: 14px;
    color: ${ui.textMuted};
    text-align: center;
`;

// Hero preview: the single source of truth for "what will my numbers look like".
const Hero = styled.div<{ $invalid?: boolean }>`
    border: 1px solid ${p => (p.$invalid ? '#fecaca' : '#e2e8f0')};
    background: ${p => (p.$invalid ? '#fef2f2' : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)')};
    border-radius: 12px;
    padding: 18px 20px;
    margin-bottom: 20px;
`;

const HeroLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
    margin-bottom: 6px;
`;

const HeroNumber = styled.div`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 0.02em;
    word-break: break-all;
`;

const HeroCaption = styled.div`
    margin-top: 6px;
    font-size: 12.5px;
    color: #64748b;
`;

const HeroError = styled.div`
    margin-top: 6px;
    font-size: 12.5px;
    color: #dc2626;
    font-weight: 500;
`;

const GroupLabel = styled.h3`
    margin: 0 0 10px;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

// Style cards: radio-group semantics, concrete examples instead of syntax.
const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
`;

const StyleCard = styled.button<{ $selected: boolean }>`
    position: relative;
    text-align: left;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid ${p => (p.$selected ? '#0ea5e9' : '#e2e8f0')};
    background: ${p => (p.$selected ? '#f0f9ff' : 'white')};
    cursor: pointer;
    transition: border-color 150ms, background 150ms, box-shadow 150ms;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &:hover {
        border-color: ${p => (p.$selected ? '#0ea5e9' : '#bae6fd')};
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
    }
`;

const CardName = styled.div<{ $selected: boolean }>`
    font-size: 12.5px;
    font-weight: 700;
    color: ${p => (p.$selected ? '#0369a1' : '#334155')};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

// Radio: obwódka i kropka w odcieniu marki, bez wypełnionego koła - zaznaczenie
// to stan, a nie krok następny (CLAUDE.md §2).
const CardCheck = styled.span<{ $selected: boolean }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 1.5px solid ${p => (p.$selected ? ui.brandStrong : '#cbd5e1')};
    background: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &::after {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${p => (p.$selected ? ui.brandStrong : 'transparent')};
    }
`;

const CardExample = styled.div`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    word-break: break-all;
`;

const CardDesc = styled.div`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

// Contextual settings row (digit stepper + custom format editor).
const SettingsRow = styled.div`
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    align-items: flex-start;
`;

const Field = styled.div<{ $grow?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    ${p => (p.$grow ? 'flex: 1; min-width: 260px;' : '')}
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const FieldHint = styled.div`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

// Stepper for digit counts: no free-text quirks, one obvious way to change it.
const Stepper = styled.div`
    display: inline-flex;
    align-items: stretch;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    overflow: hidden;
    background: white;
    height: 44px;
    width: fit-content;
`;

const StepBtn = styled.button`
    width: 44px;
    border: none;
    background: #f8fafc;
    color: #334155;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 120ms;

    &:hover:not(:disabled) { background: #e0f2fe; color: #0369a1; }
    &:disabled { color: #cbd5e1; cursor: default; }
`;

const StepValue = styled.div`
    width: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
`;

const Input = styled.input<{ $error?: boolean }>`
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1.5px solid ${p => (p.$error ? '#ef4444' : '#e2e8f0')};
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 14px;
    color: #0f172a;
    background: white;
    outline: none;
    box-sizing: border-box;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${p => (p.$error ? '#ef4444' : '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p => (p.$error ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)')};
    }
`;

const TokenRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const TokenChip = styled.button`
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 12.5px;
    color: #64748b;
    cursor: pointer;
    transition: all 120ms;

    code {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-weight: 700;
        color: #334155;
    }

    &:hover {
        border-color: #0ea5e9;
        background: #f0f9ff;
        color: #0369a1;

        code { color: #0369a1; }
    }
`;

// ─── Digit stepper component ─────────────────────────────────────────────────

const DigitStepper = ({
    label,
    hint,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    hint: string;
    value: number;
    min: number;
    max: number;
    onChange: (n: number) => void;
}) => (
    <Field>
        <Label>{label}</Label>
        <Stepper role="group" aria-label={label}>
            <StepBtn type="button" aria-label="Mniej" disabled={value <= min} onClick={() => onChange(value - 1)}>
                −
            </StepBtn>
            <StepValue>{value}</StepValue>
            <StepBtn type="button" aria-label="Więcej" disabled={value >= max} onClick={() => onChange(value + 1)}>
                +
            </StepBtn>
        </Stepper>
        <FieldHint>{hint}</FieldHint>
    </Field>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const VisitNumberingSection = () => {
    const { config, isLoading, isError, refetch } = useVisitNumberingConfig();
    const updateMutation = useUpdateVisitNumberingConfig();
    const { showSuccess, showError } = useToast();
    const formatInputRef = useRef<HTMLInputElement>(null);
    // Prośba o pokazanie pola własnego formatu. Pole pojawia się dopiero po
    // przełączeniu na „Własny format", więc fokus ustawiamy po renderze.
    const [focusRequest, setFocusRequest] = useState(0);

    const [format, setFormat] = useState('');
    const [sequenceLength, setSequenceLength] = useState(5);
    const [randomLength, setRandomLength] = useState(6);
    const [customSelected, setCustomSelected] = useState(false);
    const [saved, setSaved] = useState<{ format: string; sequenceLength: number; randomLength: number } | null>(null);

    // Seeding local editable state from the loaded query result, once, guarded on
    // `saved` (state, not a ref) so this stays the React-sanctioned "adjust state
    // during render" pattern rather than an effect-driven cascade.
    if (config && saved === null) {
        setFormat(config.format);
        setSequenceLength(config.sequenceLength);
        setRandomLength(config.randomLength);
        setCustomSelected(!STYLES.some(s => s.format === config.format));
        setSaved({ format: config.format, sequenceLength: config.sequenceLength, randomLength: config.randomLength });
    }

    const matchedStyle = STYLES.find(s => s.format === format);
    const isCustom = customSelected || !matchedStyle;
    const isRandom = usesRandom(format);
    const error = validateFormat(format);
    const preview = sampleNumber(format, sequenceLength, randomLength);

    const changedCount = saved
        ? Number(format !== saved.format) + Number(sequenceLength !== saved.sequenceLength) + Number(randomLength !== saved.randomLength)
        : 0;
    const dirty = changedCount > 0;

    const pickStyle = (styleFormat: string) => {
        setFormat(styleFormat);
        setCustomSelected(false);
    };

    const pickCustom = () => setCustomSelected(true);

    const appendToken = (token: string) => setFormat(f => f + token);

    useEffect(() => {
        if (!focusRequest) return;
        const el = formatInputRef.current;
        if (!el) return;
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
    }, [focusRequest]);

    const showFormatField = () => {
        setCustomSelected(true);
        setFocusRequest(n => n + 1);
    };

    const handleSave = async () => {
        if (error) {
            // Wcześniej samo `return` - zapis z błędnym formatem był cichym no-opem.
            showFormatField();
            return;
        }
        try {
            const result = await updateMutation.mutateAsync({ format: format.trim(), sequenceLength, randomLength });
            setFormat(result.format);
            setSequenceLength(result.sequenceLength);
            setRandomLength(result.randomLength);
            setCustomSelected(!STYLES.some(s => s.format === result.format));
            setSaved({ format: result.format, sequenceLength: result.sequenceLength, randomLength: result.randomLength });
            showSuccess('Numeracja zapisana', 'Nowe wizyty dostaną numery w tym formacie.');
        } catch (err) {
            if (!shownByInterceptor(err)) {
                showError('Nie udało się zapisać numeracji', backendMessage(err) ?? 'Spróbuj ponownie za chwilę.');
            }
        }
    };

    const handleDiscard = () => {
        if (saved) {
            setFormat(saved.format);
            setSequenceLength(saved.sequenceLength);
            setRandomLength(saved.randomLength);
            setCustomSelected(!STYLES.some(s => s.format === saved.format));
        }
    };

    if (isError && !config) {
        return (
            <Panel>
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać numeracji wizyt"
                    action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                >
                    Sprawdź połączenie z internetem. Obecny format numerów działa bez zmian.
                </Notice>
            </Panel>
        );
    }

    if (isLoading || !saved) {
        return <Panel><Loading role="status">Wczytywanie numeracji wizyt...</Loading></Panel>;
    }

    return (
        <Wrapper>
            <Panel aria-label="Numeracja wizyt">
                <Lead>Wybierz, jak mają wyglądać numery nowych wizyt. Istniejące numery pozostają bez zmian.</Lead>

                <Hero $invalid={!!error}>
                    <HeroLabel>Tak będzie wyglądał numer wizyty</HeroLabel>
                    <HeroNumber>{preview ?? '-'}</HeroNumber>
                    {error ? <HeroError id="visit-numbering-error">{error}</HeroError> : <HeroCaption>{behaviorOf(format)}</HeroCaption>}
                </Hero>

                <GroupLabel>Styl numeracji</GroupLabel>
                <CardGrid role="radiogroup" aria-label="Styl numeracji">
                    {STYLES.map(s => {
                        const selected = !isCustom && s.format === format;
                        return (
                            <StyleCard
                                key={s.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                $selected={selected}
                                onClick={() => pickStyle(s.format)}
                            >
                                <CardName $selected={selected}>
                                    {s.name}
                                    <CardCheck $selected={selected} aria-hidden="true" />
                                </CardName>
                                <CardExample>{sampleNumber(s.format, sequenceLength, randomLength)}</CardExample>
                                <CardDesc>{s.desc}</CardDesc>
                            </StyleCard>
                        );
                    })}
                    <StyleCard
                        type="button"
                        role="radio"
                        aria-checked={isCustom}
                        $selected={isCustom}
                        onClick={pickCustom}
                    >
                        <CardName $selected={isCustom}>
                            Własny format
                            <CardCheck $selected={isCustom} aria-hidden="true" />
                        </CardName>
                        <CardExample>{isCustom && preview ? preview : '...'}</CardExample>
                        <CardDesc>zbuduj z dostępnych znaczników</CardDesc>
                    </StyleCard>
                </CardGrid>

                <SettingsRow>
                    {isCustom && (
                        <Field $grow>
                            <Label htmlFor="visit-numbering-format">Własny format</Label>
                            <Input
                                id="visit-numbering-format"
                                ref={formatInputRef}
                                aria-invalid={!!error || undefined}
                                aria-describedby={error ? 'visit-numbering-error' : undefined}
                                $error={!!error}
                                value={format}
                                onChange={e => setFormat(e.target.value)}
                                placeholder="VIS-{YYYY}-{SEQ}"
                            />
                            <TokenRow>
                                {CUSTOM_TOKENS.map(t => (
                                    <TokenChip key={t.token} type="button" onClick={() => appendToken(t.token)}>
                                        <code>{t.token}</code>
                                        {t.label}
                                    </TokenChip>
                                ))}
                            </TokenRow>
                            <FieldHint>Kliknij znacznik, aby dodać go do formatu. Wymagany jest {'{SEQ}'} albo {'{RAND}'}.</FieldHint>
                        </Field>
                    )}

                    {isRandom ? (
                        <DigitStepper
                            label="Liczba losowych cyfr"
                            hint={randomLength <= 3 ? 'Mało cyfr = częstsze powtórki losowań' : 'Więcej cyfr = mniejsze ryzyko powtórek'}
                            value={randomLength}
                            min={1}
                            max={12}
                            onChange={setRandomLength}
                        />
                    ) : (
                        <DigitStepper
                            label="Liczba cyfr licznika"
                            hint={`Numer 1 zapisze się jako ${'1'.padStart(Math.min(Math.max(sequenceLength, 1), 10), '0')}`}
                            value={sequenceLength}
                            min={1}
                            max={10}
                            onChange={setSequenceLength}
                        />
                    )}
                </SettingsRow>
            </Panel>

            <UnsavedChangesBanner
                visible={dirty}
                onSave={handleSave}
                onDiscard={handleDiscard}
                isSaving={updateMutation.isPending}
                changedCount={changedCount}
                problem={error ? 'Format numeru wymaga poprawy' : undefined}
                onShowProblem={error ? showFormatField : undefined}
            />
        </Wrapper>
    );
};
