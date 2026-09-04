// src/modules/comms/components/LeadCellEditor.tsx
// Edycja pojedynczej komórki tabeli leadów - chmurka zaczepiona pod klikniętym polem.
//
// Poprawki w tabeli leadów są drobne i częste: dopisać model auta, którego LLM nie
// wyłapał, zmienić status po telefonie, dorzucić tag. Droga „otwórz panel, znajdź
// sekcję, zapisz, zamknij panel" kosztowała cztery kliknięcia i utratę miejsca na
// liście - przy dziesięciu poprawkach z rzędu to różnica między pracą a mordęgą.
//
// Panel szczegółów zostaje dla rzeczy większych: wyceny, historii, usunięcia.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { useToast } from '@/common/components/Toast';
import {
    useLeadDictionaries,
    useUpdateLeadTags,
    useUpdateLeadVehicle,
} from '../hooks/useLeads';
import { LEAD_STATUS_FLOW, LEAD_STATUS_LABELS, type Lead, type LeadStatus } from '../types';
import { TagMultiSelect } from './TagMultiSelect';
import { useTagCatalogActions } from '../hooks/useTagCatalogActions';

export type LeadCellField = 'vehicle' | 'tags' | 'status';

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 110;
`;

const Card = styled.div`
    position: fixed;
    z-index: 111;
    width: 300px;
    max-width: calc(100vw - 24px);
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 16px 44px rgba(15, 23, 42, 0.18);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.div`
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

const StatusList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StatusOption = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : 'transparent')};
    color: ${p => p.theme.colors.text};
    border-radius: ${p => p.theme.radii.sm};
    padding: 7px 9px;
    font-size: 13px;
    font-family: inherit;
    font-weight: ${({ $active, theme }) =>
        $active ? theme.fontWeights.semibold : theme.fontWeights.normal};
    text-align: left;
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    svg { width: 13px; height: 13px; flex-shrink: 0; opacity: ${({ $active }) => ($active ? 1 : 0)}; }
`;

const Actions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 2px;
`;

const SmallButton = styled.button<{ $primary?: boolean }>`
    border: 1px solid ${({ $primary, theme }) => ($primary ? 'transparent' : theme.colors.border)};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.surface)};
    color: ${({ $primary, theme }) => ($primary ? '#ffffff' : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.md};
    padding: 6px 12px;
    font-size: 12.5px;
    font-family: inherit;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: default; }
`;

interface LeadCellEditorProps {
    lead: Lead;
    field: LeadCellField;
    anchor: HTMLElement;
    onClose: () => void;
    /** „Przegrany" wymaga powodu ze słownika - o to pyta osobne okno w widoku. */
    onRequestLost: (leadId: string) => void;
    onChangeStatus: (leadId: string, status: LeadStatus) => void;
}

const FIELD_TITLES: Record<LeadCellField, string> = {
    vehicle: 'Pojazd',
    tags: 'Tagi',
    status: 'Status',
};

export function LeadCellEditor({
    lead,
    field,
    anchor,
    onClose,
    onRequestLost,
    onChangeStatus,
}: LeadCellEditorProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    // Stan startowy bierzemy z leada raz, przy montowaniu - chmurka żyje tylko przez
    // jedną edycję, a jej remount (klucz w widoku) zeruje wszystko bez efektu.
    const [brand, setBrand] = useState(lead.vehicleBrand ?? '');
    const [model, setModel] = useState(lead.vehicleModel ?? '');
    const [tags, setTags] = useState<string[]>(lead.tags);

    const { data: dictionaries } = useLeadDictionaries();
    const updateVehicle = useUpdateLeadVehicle();
    const updateTags = useUpdateLeadTags();
    const { showError } = useToast();
    const tagActions = useTagCatalogActions((code) =>
        setTags((current) => (current.includes(code) ? current : [...current, code]))
    );

    useEffect(() => {
        const place = () => {
            const rect = anchor.getBoundingClientRect();
            const width = 300;
            const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
            // Pod komórką, chyba że tam już nie ma miejsca - wtedy nad nią.
            const below = window.innerHeight - rect.bottom;
            const top = below > 280 ? rect.bottom + 6 : Math.max(12, rect.top - 286);
            setPos({ top, left });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [anchor]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const failed = (title: string) => (error: unknown) => {
        const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        showError(title, message ?? 'Spróbuj ponownie');
    };

    const saveVehicle = () =>
        updateVehicle.mutate(
            { leadId: lead.id, vehicleBrand: brand || null, vehicleModel: model || null },
            { onSuccess: onClose, onError: failed('Nie udało się zapisać pojazdu') }
        );

    const saveTags = () =>
        updateTags.mutate(
            { leadId: lead.id, tags },
            { onSuccess: onClose, onError: failed('Nie udało się zapisać tagów') }
        );

    if (!pos) return null;

    return createPortal(
        <>
            <Backdrop onMouseDown={onClose} />
            <Card
                ref={cardRef}
                style={{ top: pos.top, left: pos.left }}
                role="dialog"
                aria-label={FIELD_TITLES[field]}
            >
                <Label>{FIELD_TITLES[field]}</Label>

                {field === 'vehicle' && (
                    <>
                        {/* Ten sam wybierak marki i modelu co przy przyjęciu pojazdu
                            i w rezerwacji: wyszukiwarka w rozwijanej liście zamiast
                            natywnego <select> z kilkuset pozycjami, których nie da się
                            przefiltrować. Katalog pobiera sobie sam. */}
                        <BrandSelect
                            value={brand}
                            placeholder="Marka…"
                            onChange={(next) => {
                                setBrand(next);
                                // Modele są per marka - zostawiony stary nie przeszedłby walidacji.
                                setModel('');
                            }}
                        />
                        <ModelSelect
                            brand={brand}
                            value={model}
                            placeholder="Model…"
                            onChange={setModel}
                        />
                        <Actions>
                            <SmallButton type="button" onClick={onClose}>Anuluj</SmallButton>
                            <SmallButton
                                $primary
                                type="button"
                                onClick={saveVehicle}
                                disabled={updateVehicle.isPending}
                            >
                                Zapisz
                            </SmallButton>
                        </Actions>
                    </>
                )}

                {field === 'tags' && (
                    <>
                        <TagMultiSelect
                            options={dictionaries?.tags ?? []}
                            value={tags}
                            onChange={setTags}
                            onCreate={tagActions.onCreate}
                            onDelete={tagActions.onDelete}
                            isCreating={tagActions.isCreating}
                        />
                        <Actions>
                            <SmallButton type="button" onClick={onClose}>Anuluj</SmallButton>
                            <SmallButton
                                $primary
                                type="button"
                                onClick={saveTags}
                                disabled={updateTags.isPending}
                            >
                                Zapisz
                            </SmallButton>
                        </Actions>
                    </>
                )}

                {field === 'status' && (
                    <StatusList>
                        {LEAD_STATUS_FLOW.map((status) => (
                            <StatusOption
                                key={status}
                                type="button"
                                $active={status === lead.status}
                                onClick={() => {
                                    onClose();
                                    if (status === lead.status) return;
                                    // „Przegrany" nie zapisuje się jednym kliknięciem - powód
                                    // przegranej jest osią raportu, więc pyta o niego osobne okno.
                                    if (status === 'LOST') onRequestLost(lead.id);
                                    else onChangeStatus(lead.id, status);
                                }}
                            >
                                <Check />
                                {LEAD_STATUS_LABELS[status]}
                            </StatusOption>
                        ))}
                    </StatusList>
                )}
            </Card>
        </>,
        document.body
    );
}
