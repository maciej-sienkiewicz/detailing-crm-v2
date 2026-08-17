// src/modules/settings/components/VisitNumberingSection.tsx
//
// Ustawienia → Dane firmy → Numeracja wizyt.
//
// Format is a small template language: {YYYY} {YY} {MM} {DD} and exactly one of
// {SEQ} (rosnący licznik) or {RAND} (losowe cyfry). The reset period for {SEQ}
// falls out of which date tokens are used, not a separate setting. Validation
// mirrors the backend's NumberingTemplate so typos show up before saving.

import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { useVisitNumberingConfig, useUpdateVisitNumberingConfig } from '../hooks/useCompany';
import { UnsavedChangesBanner } from './shared/SettingsLayout';

const PLACEHOLDERS: { token: string; label: string; required?: boolean }[] = [
    { token: '{YYYY}', label: 'rok, 4 cyfry' },
    { token: '{YY}', label: 'rok, 2 cyfry' },
    { token: '{MM}', label: 'miesiąc' },
    { token: '{DD}', label: 'dzień' },
    { token: '{SEQ}', label: 'licznik rosnący', required: true },
    { token: '{RAND}', label: 'cyfry losowe', required: true },
];

const KNOWN_TOKENS = new Set(PLACEHOLDERS.map(p => p.token.slice(1, -1)));
const TOKEN_RE = /\{([A-Za-z]*)\}/g;

const validateFormat = (format: string): string | null => {
    if (!format.trim()) return 'Format nie może być pusty';
    if (format.length > 100) return 'Format jest za długi (maks. 100 znaków)';
    const seqCount = (format.match(/\{SEQ\}/g) ?? []).length;
    const randCount = (format.match(/\{RAND\}/g) ?? []).length;
    if (seqCount + randCount !== 1) return 'Wymagany dokładnie jeden znacznik: {SEQ} albo {RAND}';
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
    { format: 'VIS-{YYYY}-{SEQ}', hint: 'reset co rok' },
    { format: 'VIS/{YYYY}/{MM}/{SEQ}', hint: 'reset co miesiąc' },
    { format: 'W/{SEQ}/{YY}', hint: 'bez resetu' },
    { format: 'VIS-{YYYY}-{RAND}', hint: 'losowy' },
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
    margin: 0 0 4px;
`;

const Subtitle = styled.p`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin: 0 0 16px;
`;

const PlaceholderRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 18px;
`;

const Chip = styled.span<{ $required?: boolean }>`
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 999px;
    border: 1px solid ${p => (p.$required ? '#bae6fd' : '#e2e8f0')};
    background: ${p => (p.$required ? '#f0f9ff' : '#f8fafc')};
    font-size: 11.5px;
    color: #475569;

    code {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-weight: 700;
        color: ${p => (p.$required ? '#0369a1' : '#334155')};
    }
`;

const RequiredNote = styled.div`
    font-size: 11.5px;
    color: #94a3b8;
    margin: -12px 0 18px;
`;

const Row = styled.div`
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    align-items: flex-start;
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
    display: flex;
    align-items: center;
    gap: 5px;
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

const PresetList = styled.div`
    margin-top: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const PresetLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 2px;
`;

const PresetRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const PresetBtn = styled.button`
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

// ─── Digit-length field ─────────────────────────────────────────────────────
//
// A plain <input type="number"> re-derives its displayed value from the
// numeric state on every keystroke, so clearing "1" to type "2" never actually
// shows empty — the old value snaps back before the new digit lands, and you
// get "12". This keeps a raw text buffer while the field is focused and only
// commits/clamps the parsed number on blur, so backspace-then-type works like
// any normal input.

const DigitLengthField = ({
    label,
    value,
    min,
    max,
    onCommit,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onCommit: (n: number) => void;
}) => {
    const [draft, setDraft] = useState<string | null>(null);

    const commit = (raw: string) => {
        const parsed = parseInt(raw, 10);
        const clamped = Number.isNaN(parsed) ? min : Math.min(Math.max(parsed, min), max);
        onCommit(clamped);
        setDraft(null);
    };

    return (
        <Field>
            <Label>{label}</Label>
            <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft ?? String(value)}
                onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                onBlur={e => commit(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                }}
            />
        </Field>
    );
};

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
    const liveError = format ? validateFormat(format) : null;

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
                <Subtitle>Numer nadawany każdej wizycie. Zmiana dotyczy tylko nowych wizyt.</Subtitle>

                <PlaceholderRow>
                    {PLACEHOLDERS.map(p => (
                        <Chip key={p.token} $required={p.required}>
                            <code>{p.token}</code>
                            {p.label}
                        </Chip>
                    ))}
                </PlaceholderRow>
                <RequiredNote>Wymagany dokładnie jeden z: {'{SEQ}'} albo {'{RAND}'}.</RequiredNote>

                <PresetList>
                    <PresetLabel>Szablon</PresetLabel>
                    <PresetRow>
                        {PRESETS.map(p => (
                            <PresetBtn key={p.format} type="button" onClick={() => applyPreset(p.format)}>
                                <PresetFormat>{p.format}</PresetFormat>
                                <PresetHint>{p.hint}</PresetHint>
                            </PresetBtn>
                        ))}
                    </PresetRow>
                </PresetList>

                <Row style={{ marginTop: 18 }}>
                    <Field $grow>
                        <Label>Format numeru</Label>
                        <Input
                            $mono
                            $error={!!(formatError || liveError)}
                            value={format}
                            onChange={e => {
                                setFormat(e.target.value);
                                setFormatError(null);
                            }}
                            placeholder="VIS-{YYYY}-{SEQ}"
                        />
                        {(formatError || liveError) && <ErrorMsg>⚠ {formatError || liveError}</ErrorMsg>}
                    </Field>

                    {isRandom ? (
                        <DigitLengthField
                            label="Cyfry losowe"
                            value={randomLength}
                            min={1}
                            max={12}
                            onCommit={setRandomLength}
                        />
                    ) : (
                        <DigitLengthField
                            label="Cyfry licznika"
                            value={sequenceLength}
                            min={1}
                            max={10}
                            onCommit={setSequenceLength}
                        />
                    )}
                </Row>

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
