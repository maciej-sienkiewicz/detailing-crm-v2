import React, { useState } from 'react';
import styled from 'styled-components';
import { Check, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
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
import type { AreaMatchMode, LocationTracking, SaveLocationTracking } from '../types';
import {
    useCreateLocationTracking,
    useDeleteLocationTracking,
    useLocationTrackings,
    useUpdateLocationTracking,
} from '../hooks/useAreaDiscovery';

/**
 * Konfiguracja śledzeń obszaru — pełny CRUD w jednym oknie, otwieranym kołem
 * zębatym z sekcji „Reklamodawcy w okolicy".
 *
 * Góra: lista zapisanych śledzeń (edycja / wstrzymanie / usunięcie). Dół:
 * formularz dodania albo edycji jednego śledzenia. Sama tabela wyników mieszka
 * w widoku, nie tutaj — modal służy do ustawiania, nie do oglądania.
 */

const MODE_LABELS: Record<AreaMatchMode, string> = {
    CITIES_ONLY: 'Tylko wpisane miejscowości',
    INCLUDE_BROADER: 'Także województwo i cała Polska',
};

const Section = styled.div`
    & + & { margin-top: 20px; padding-top: 20px; border-top: 1px solid ${st.border}; }
`;

const SectionLabel = styled.h3`
    margin: 0 0 12px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const TrackingRow = styled.div<{ $active: boolean; $editing: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => (p.$editing ? st.accentBlue : st.border)};
    background: ${p => (p.$editing ? st.accentBlueDim : st.bgCard)};
    opacity: ${p => (p.$active ? 1 : 0.55)};

    & + & { margin-top: 6px; }
`;

const TrackingInfo = styled.div`
    flex: 1;
    min-width: 0;

    strong { display: block; font-size: ${st.fontSm}; font-weight: 700; color: ${st.text}; }
    span { display: block; font-size: ${st.fontXs}; color: ${st.textMuted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const RowAction = styled.button`
    display: inline-flex;
    border: none;
    background: none;
    padding: 5px;
    border-radius: ${st.radiusFull};
    color: ${st.textMuted};
    cursor: pointer;
    &:hover { color: ${st.text}; background: ${st.bgCardAlt}; }
    svg { width: 15px; height: 15px; }
`;

const Field = styled.div`
    margin-bottom: 14px;
`;

const FieldLabel = styled.label`
    display: block;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    margin-bottom: 6px;
`;

const FieldHint = styled.span`
    font-weight: 500;
    color: ${st.textMuted};
`;

const TagBox = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};

    &:focus-within { border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;

const Tag = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px 4px 10px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;

    button { display: inline-flex; border: none; background: none; padding: 0; cursor: pointer; color: inherit; opacity: 0.7; }
    button:hover { opacity: 1; }
    svg { width: 13px; height: 13px; }
`;

const TextInput = styled.input`
    flex: 1;
    min-width: 140px;
    border: none;
    background: none;
    outline: none;
    font-family: inherit;
    font-size: ${st.fontMd};
    color: ${st.text};
    padding: 4px 2px;
    &::placeholder { color: ${st.textMuted}; }
`;

const ModeToggle = styled.div`
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    padding: 3px;
`;

const ModeBtn = styled.button<{ $active: boolean }>`
    padding: 6px 14px;
    border-radius: ${st.radiusFull};
    border: none;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    background: ${p => (p.$active ? st.bgCard : 'transparent')};
    color: ${p => (p.$active ? st.text : st.textSecondary)};
    box-shadow: ${p => (p.$active ? st.shadowXs : 'none')};
    cursor: pointer;
    transition: all ${st.transition};
`;

// ── Pole tagów (frazy / miejscowości) ─────────────────────────────────────────

interface TagFieldProps {
    label: React.ReactNode;
    placeholder: string;
    values: string[];
    onChange: (values: string[]) => void;
}

const TagField = ({ label, placeholder, values, onChange }: TagFieldProps) => {
    const [draft, setDraft] = useState('');

    const commit = (raw: string) => {
        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) return;
        const next = [...values];
        for (const part of parts) {
            if (!next.some(v => v.toLowerCase() === part.toLowerCase())) next.push(part);
        }
        onChange(next);
        setDraft('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
        } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            onChange(values.slice(0, -1));
        }
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
                    placeholder={values.length === 0 ? placeholder : ''}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => commit(draft)}
                />
            </TagBox>
        </Field>
    );
};

// ─── Modal ─────────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Woła się z id zapisanego śledzenia, żeby widok pokazał jego wyniki. */
    onSaved?: (id: string) => void;
    /** Śledzenie usunięte — widok czyści zaznaczenie, jeśli to było ono. */
    onDeleted?: (id: string) => void;
}

const blank = () => ({ label: '', phrases: [] as string[], locations: [] as string[], mode: 'INCLUDE_BROADER' as AreaMatchMode });

export const AreaConfigModal = ({ isOpen, onClose, onSaved, onDeleted }: Props) => {
    const trackingsQuery = useLocationTrackings(isOpen);
    const createMut = useCreateLocationTracking();
    const updateMut = useUpdateLocationTracking();
    const deleteMut = useDeleteLocationTracking();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(blank());

    const trackings = trackingsQuery.data ?? [];
    const canSave = form.label.trim() !== '' && form.phrases.length > 0 && form.locations.length > 0;
    const saving = createMut.isPending || updateMut.isPending;

    const startEdit = (tracking: LocationTracking) => {
        setEditingId(tracking.id);
        setForm({ label: tracking.label, phrases: tracking.phrases, locations: tracking.locations, mode: tracking.matchMode });
    };

    const startNew = () => {
        setEditingId(null);
        setForm(blank());
    };

    const handleSave = () => {
        if (!canSave) return;
        const body: SaveLocationTracking = {
            label: form.label.trim(),
            phrases: form.phrases,
            locations: form.locations,
            matchMode: form.mode,
            active: true,
        };
        if (editingId) {
            updateMut.mutate({ id: editingId, request: body }, { onSuccess: saved => { onSaved?.(saved.id); startNew(); } });
        } else {
            createMut.mutate(body, { onSuccess: saved => { onSaved?.(saved.id); startNew(); } });
        }
    };

    const toggleActive = (tracking: LocationTracking) => {
        updateMut.mutate({
            id: tracking.id,
            request: {
                label: tracking.label,
                phrases: tracking.phrases,
                locations: tracking.locations,
                matchMode: tracking.matchMode,
                active: !tracking.active,
            },
        });
    };

    const remove = (tracking: LocationTracking) => {
        deleteMut.mutate(tracking.id, { onSuccess: () => onDeleted?.(tracking.id) });
        if (editingId === tracking.id) startNew();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="560px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Śledzenie obszaru</ModalTitle>
                    <ModalSubtitle>
                        Frazy z reklam + rejon. Frazy odświeżają się automatycznie dwa razy dziennie.
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {trackings.length > 0 && (
                    <Section>
                        <SectionLabel>Twoje śledzenia</SectionLabel>
                        {trackings.map(tracking => (
                            <TrackingRow key={tracking.id} $active={tracking.active} $editing={editingId === tracking.id}>
                                <TrackingInfo>
                                    <strong>{tracking.label}{!tracking.active && ' · wstrzymane'}</strong>
                                    <span>{tracking.locations.join(', ')} · {tracking.phrases.join(', ')}</span>
                                </TrackingInfo>
                                <RowAction type="button" aria-label="Edytuj" title="Edytuj" onClick={() => startEdit(tracking)}>
                                    <Pencil />
                                </RowAction>
                                <RowAction
                                    type="button"
                                    aria-label={tracking.active ? 'Wstrzymaj' : 'Wznów'}
                                    title={tracking.active ? 'Wstrzymaj' : 'Wznów'}
                                    onClick={() => toggleActive(tracking)}
                                >
                                    {tracking.active ? <Pause /> : <Play />}
                                </RowAction>
                                <RowAction type="button" aria-label="Usuń" title="Usuń" onClick={() => remove(tracking)}>
                                    <Trash2 />
                                </RowAction>
                            </TrackingRow>
                        ))}
                    </Section>
                )}

                <Section>
                    <SectionLabel>{editingId ? 'Edytuj śledzenie' : 'Nowe śledzenie'}</SectionLabel>

                    <Field>
                        <FieldLabel>Nazwa</FieldLabel>
                        <TagBox as="div">
                            <TextInput
                                value={form.label}
                                placeholder="np. Detailing — aglomeracja poznańska"
                                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                style={{ width: '100%' }}
                            />
                        </TagBox>
                    </Field>

                    <TagField
                        label={<>Frazy <FieldHint>(Enter lub przecinek dodaje kolejną)</FieldHint></>}
                        placeholder="np. detailing, powłoka ceramiczna, PPF"
                        values={form.phrases}
                        onChange={phrases => setForm(f => ({ ...f, phrases }))}
                    />

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

                    {editingId && (
                        <SharedButton type="button" $variant="ghost" $size="sm" onClick={startNew}>
                            <Plus size={15} /> Dodaj inne zamiast edytować
                        </SharedButton>
                    )}
                </Section>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" $size="sm" onClick={onClose}>Zamknij</SharedButton>
                <SharedButton $variant="primary" $size="sm" onClick={handleSave} disabled={!canSave || saving}>
                    {editingId ? <><Check size={15} /> Zapisz zmiany</> : <><Plus size={15} /> Dodaj śledzenie</>}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
