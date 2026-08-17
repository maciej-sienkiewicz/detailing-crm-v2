// src/modules/settings/components/VisitNumberingSection.tsx
//
// Ustawienia → Dane firmy → Numeracja wizyt.
//
// Format is a small template language: {YYYY} {YY} {MM} {DD} and exactly one of
// {SEQ} (rosnący licznik) or {RAND} (losowe cyfry). The reset period for {SEQ}
// isn't a separate setting — it falls out of which date tokens are used (a
// template with {MM} resets every month because its rendered prefix changes with
// the month; {YYYY} only resets yearly; no date token never resets). {RAND} draws
// fresh random digits every time instead of counting, so studios that don't want
// a visit number to reveal how many visits they've done can use it. The preview
// mirrors the backend's NumberingTemplate so typos show up before saving, but the
// backend re-validates on save regardless.

import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { useVisitNumberingConfig, useUpdateVisitNumberingConfig } from '../hooks/useCompany';
import { UnsavedChangesBanner } from './shared/SettingsLayout';

const KNOWN_TOKENS = new Set(['YYYY', 'YY', 'MM', 'DD', 'SEQ', 'RAND']);
const TOKEN_RE = /\{([A-Za-z]*)\}/g;

const validateFormat = (format: string): string | null => {
    if (!format.trim()) return 'Format numeru nie może być pusty';
    if (format.length > 100) return 'Format numeru jest za długi (maks. 100 znaków)';
    const seqCount = (format.match(/\{SEQ\}/g) ?? []).length;
    const randCount = (format.match(/\{RAND\}/g) ?? []).length;
    if (seqCount + randCount !== 1) {
        return 'Format musi zawierać dokładnie jeden znacznik {SEQ} albo {RAND} (nie oba naraz)';
    }
    for (const match of format.matchAll(TOKEN_RE)) {
        if (!KNOWN_TOKENS.has(match[1])) return `Nieznany znacznik: {${match[1]}}`;
    }
    return null;
};

const usesRandom = (format: string): boolean => format.includes('{RAND}');

const randomDigits = (length: number): string => {
    const len = Math.min(Math.max(length, 1), 12);
    let out = '';
    for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10).toString();
    return out;
};

const renderPreview = (format: string, sequenceLength: number, randomLength: number): string | null => {
    if (validateFormat(format)) return null;
    const now = new Date();
    const filler = usesRandom(format)
        ? { token: '{RAND}', value: randomDigits(randomLength) }
        : { token: '{SEQ}', value: '1'.padStart(Math.min(Math.max(sequenceLength, 1), 10), '0') };
    return format
        .replace('{YYYY}', String(now.getFullYear()))
        .replace('{YY}', String(now.getFullYear() % 100).padStart(2, '0'))
        .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DD}', String(now.getDate()).padStart(2, '0'))
        .replace(filler.token, filler.value);
};

const PRESETS = [
    { format: 'VIS-{YYYY}-{SEQ}', hint: 'domyślny, reset co rok' },
    { format: 'VIS/{YYYY}/{MM}/{SEQ}', hint: 'reset co miesiąc' },
    { format: 'W/{SEQ}/{YY}', hint: 'bez resetu, krótki' },
    { format: 'VIS-{YYYY}-{RAND}', hint: 'losowy — nie zdradza liczby wizyt' },
];

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Panel = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px 28px;
`;

const Title = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin: 0 0 6px;
`;

const Description = styled.p`
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    margin: 0 0 22px;
    line-height: 1.55;
    max-width: 680px;
`;

const Row = styled.div`
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
`;

const Field = styled.div<{ $grow?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    ${p => (p.$grow ? 'flex: 1; min-width: 260px;' : 'width: 140px;')}
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: #334155;
`;

const Input = styled.input<{ $mono?: boolean; $error?: boolean }>`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    border: 1.5px solid ${p => (p.$error ? '#ef4444' : '#e2e8f0')};
    font-family: ${p => (p.$mono ? "'JetBrains Mono', ui-monospace, monospace" : 'inherit')};
    font-size: 13px;
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

const ErrorMsg = styled.div`
    font-size: 12px;
    color: #ef4444;
`;

const PreviewBox = styled.div`
    margin-top: 18px;
    padding: 14px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const PreviewLabel = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const PreviewValue = styled.span`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const TokensHint = styled.div`
    margin-top: 14px;
    font-size: 12px;
    color: ${p => p.theme.colors.textSecondary};
    line-height: 1.6;

    code {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        background: #f1f5f9;
        border-radius: 4px;
        padding: 1px 5px;
        margin: 0 1px;
    }
`;

const PresetList = styled.div`
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const PresetLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 2px;
`;

const PresetBtn = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 12.5px;
    color: #334155;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { border-color: #0ea5e9; color: #0ea5e9; background: #f0f9ff; }
`;

const PresetFormat = styled.span`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
`;

const PresetHint = styled.span`
    color: #94a3b8;
    font-size: 11.5px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const VisitNumberingSection = () => {
    const { config, isLoading } = useVisitNumberingConfig();
    const updateMutation = useUpdateVisitNumberingConfig();
    const { showSuccess, showError } = useToast();

    const [format, setFormat] = useState('');
    const [sequenceLength, setSequenceLength] = useState(5);
    const [randomLength, setRandomLength] = useState(6);
    const [saved, setSaved] = useState<{ format: string; sequenceLength: number; randomLength: number } | null>(null);
    const [formatError, setFormatError] = useState<string | null>(null);

    // Seeding local editable state from the loaded query result, once — guarded on
    // `saved` (state, not a ref) so this stays the React-sanctioned "adjust state
    // during render" pattern rather than an effect-driven cascade.
    if (config && saved === null) {
        setFormat(config.format);
        setSequenceLength(config.sequenceLength);
        setRandomLength(config.randomLength);
        setSaved({ format: config.format, sequenceLength: config.sequenceLength, randomLength: config.randomLength });
    }

    const dirty =
        !!saved &&
        (format !== saved.format || sequenceLength !== saved.sequenceLength || randomLength !== saved.randomLength);
    const preview = renderPreview(format, sequenceLength, randomLength);
    const isRandom = usesRandom(format);

    const applyPreset = (presetFormat: string) => {
        setFormat(presetFormat);
        setFormatError(null);
    };

    const handleSave = async () => {
        const err = validateFormat(format);
        if (err) {
            setFormatError(err);
            return;
        }
        try {
            const result = await updateMutation.mutateAsync({ format: format.trim(), sequenceLength, randomLength });
            setFormat(result.format);
            setSequenceLength(result.sequenceLength);
            setRandomLength(result.randomLength);
            setSaved({ format: result.format, sequenceLength: result.sequenceLength, randomLength: result.randomLength });
            showSuccess('Zapisano', 'Format numeracji wizyt został zaktualizowany.');
        } catch {
            showError('Błąd', 'Nie udało się zapisać formatu numeracji. Spróbuj ponownie.');
        }
    };

    const handleDiscard = () => {
        if (saved) {
            setFormat(saved.format);
            setSequenceLength(saved.sequenceLength);
            setRandomLength(saved.randomLength);
            setFormatError(null);
        }
    };

    if (isLoading || !saved) return null;

    return (
        <Wrapper>
            <Panel>
                <Title>Numeracja wizyt</Title>
                <Description>
                    Numer nadawany każdej rozpoczynanej wizycie (np. „VIS-2026-00072"). Zmiana
                    formatu dotyczy tylko nowych wizyt — istniejące numery pozostają bez zmian.
                    Numer porządkowy <code>{'{SEQ}'}</code> resetuje się automatycznie wtedy, gdy
                    zmienia się część daty użyta w formacie: format z <code>{'{MM}'}</code> resetuje
                    licznik co miesiąc, sam <code>{'{YYYY}'}</code> — co rok, a format bez daty liczy
                    w sposób ciągły. Zamiast <code>{'{SEQ}'}</code> można użyć{' '}
                    <code>{'{RAND}'}</code> — losowe cyfry zamiast rosnącego licznika, dla firm,
                    które nie chcą, aby numer wizyty zdradzał klientom liczbę zrealizowanych wizyt.
                </Description>

                <Row>
                    <Field $grow>
                        <Label>Format numeru</Label>
                        <Input
                            $mono
                            $error={!!formatError}
                            value={format}
                            onChange={e => {
                                setFormat(e.target.value);
                                setFormatError(null);
                            }}
                            placeholder="VIS-{YYYY}-{SEQ}"
                        />
                        {formatError && <ErrorMsg>{formatError}</ErrorMsg>}
                    </Field>

                    {isRandom ? (
                        <Field>
                            <Label>Cyfry numeru losowego</Label>
                            <Input
                                type="number"
                                min={1}
                                max={12}
                                value={randomLength}
                                onChange={e => {
                                    const parsed = parseInt(e.target.value, 10);
                                    setRandomLength(Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), 12));
                                }}
                            />
                        </Field>
                    ) : (
                        <Field>
                            <Label>Cyfry numeru porządkowego</Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={sequenceLength}
                                onChange={e => {
                                    const parsed = parseInt(e.target.value, 10);
                                    setSequenceLength(Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), 10));
                                }}
                            />
                        </Field>
                    )}
                </Row>

                {isRandom && randomLength <= 3 && (
                    <ErrorMsg style={{ marginTop: 8 }}>
                        Przy tak małej liczbie cyfr rośnie ryzyko losowania numeru, który już
                        istnieje — system w takim wypadku po prostu losuje ponownie, ale przy
                        dużym ruchu warto ustawić więcej cyfr.
                    </ErrorMsg>
                )}

                <TokensHint>
                    Dostępne znaczniki: <code>{'{YYYY}'}</code> rok (4 cyfry), <code>{'{YY}'}</code> rok
                    (2 cyfry), <code>{'{MM}'}</code> miesiąc, <code>{'{DD}'}</code> dzień, oraz dokładnie
                    jeden z: <code>{'{SEQ}'}</code> rosnący numer porządkowy, albo{' '}
                    <code>{'{RAND}'}</code> losowe cyfry (nie zdradzają liczby wizyt).
                </TokensHint>

                <PresetList>
                    <PresetLabel>Gotowe formaty</PresetLabel>
                    {PRESETS.map(p => (
                        <PresetBtn key={p.format} type="button" onClick={() => applyPreset(p.format)}>
                            <PresetFormat>{p.format}</PresetFormat>
                            <PresetHint>{p.hint}</PresetHint>
                        </PresetBtn>
                    ))}
                </PresetList>

                <PreviewBox>
                    <PreviewLabel>Podgląd:</PreviewLabel>
                    <PreviewValue>{preview ?? '—'}</PreviewValue>
                </PreviewBox>
            </Panel>

            <UnsavedChangesBanner
                visible={dirty}
                onSave={handleSave}
                onDiscard={handleDiscard}
                isSaving={updateMutation.isPending}
                sectionName="Numeracja wizyt"
            />
        </Wrapper>
    );
};
