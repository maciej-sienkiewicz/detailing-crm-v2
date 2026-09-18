// src/modules/settings/components/CareInstructionsSection.tsx
//
// Ustawienia → Cennik usług → Instrukcje pielęgnacji.
//
// Słownik zdań, z których składa się sekcja „Jak utrzymać efekt" na certyfikacie
// jakości. Wcześniej cztery zasady siedziały na sztywno w generatorze PDF — studio nie
// mogło ich zmienić własnym językiem ani dopisać instrukcji zależnych od usługi.
//
// Instrukcja jest tu JEDEN raz i z jednego miejsca trafia wszędzie: do certyfikatu
// przez zaznaczenie i do usług przez przypisanie. Poprawka treści działa wstecz, bo
// dokument czyta słownik, a nie kopię sprzed roku.
import { useState } from 'react';
import styled from 'styled-components';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SharedButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast/ToastContainer';
import { useCareInstructions, useCareInstructionMutations } from '../hooks/useCareInstructions';
import type { CareInstruction } from '../api/careInstructionsApi';

const Wrap = styled.div` display: flex; flex-direction: column; gap: 16px; `;
const Head = styled.div`
    display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    @media (max-width: 640px) { flex-direction: column; align-items: stretch; }
`;
const Title = styled.h3` margin: 0 0 4px; font-size: 16px; font-weight: 700; color: ${st.text}; `;
const Desc = styled.p` margin: 0; font-size: 13px; line-height: 1.5; color: ${st.textSecondary}; max-width: 68ch; `;

const List = styled.div` display: flex; flex-direction: column; gap: 10px; `;
const Card = styled.div`
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; background: ${st.bgCard};
    border: 1px solid ${st.border}; border-radius: ${st.radius};
`;
const CardMain = styled.div` flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; `;
const CardTitle = styled.div` font-size: 14px; font-weight: 700; color: ${st.text}; overflow-wrap: anywhere; `;
const CardText = styled.p` margin: 0; font-size: 13px; line-height: 1.5; color: ${st.textSecondary}; overflow-wrap: anywhere; `;
const Badges = styled.div` display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; `;
const Badge = styled.span<{ $tone: 'blue' | 'muted' }>`
    display: inline-flex; align-items: center; padding: 2px 8px;
    border-radius: ${st.radiusFull}; font-size: 11px; font-weight: 600;
    background: ${p => (p.$tone === 'blue' ? st.accentBlueDim : st.bgCardAlt)};
    color: ${p => (p.$tone === 'blue' ? st.accentBlue : st.textMuted)};
`;
// Akcje przy wierszu: odcień i obwódka, bez wypełnienia (CLAUDE.md §2).
const IconBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; flex-shrink: 0;
    border: 1px solid ${p => (p.$danger ? 'rgba(239,68,68,0.35)' : st.border)};
    border-radius: ${st.radiusSm}; background: ${st.bgCard};
    color: ${p => (p.$danger ? st.accentRed : st.textSecondary)};
    cursor: pointer;
    &:hover { border-color: ${p => (p.$danger ? st.accentRed : st.borderHover)}; }
`;

const Editor = styled.div`
    display: flex; flex-direction: column; gap: 12px;
    padding: 16px; background: ${st.bgCardAlt};
    border: 1px solid ${st.border}; border-radius: ${st.radius};
`;
const Field = styled.label` display: flex; flex-direction: column; gap: 6px; `;
const FieldLabel = styled.span` font-size: 12.5px; font-weight: 600; color: ${st.textSecondary}; `;
const Input = styled.input`
    padding: 10px 12px; font-family: inherit; font-size: 14px; color: ${st.text};
    background: ${st.bgInput}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;
const Area = styled.textarea`
    min-height: 92px; resize: vertical;
    padding: 10px 12px; font-family: inherit; font-size: 14px; line-height: 1.5; color: ${st.text};
    background: ${st.bgInput}; border: 1px solid ${st.border}; border-radius: ${st.radiusSm};
    &:focus { outline: none; border-color: ${st.borderFocus}; box-shadow: ${st.shadowBlue}; }
`;
const CheckRow = styled.label` display: flex; align-items: flex-start; gap: 10px; cursor: pointer; `;
const Check = styled.input` margin: 2px 0 0; width: 16px; height: 16px; accent-color: ${st.accentBlue}; `;
const CheckText = styled.span` font-size: 13px; color: ${st.text}; `;
const CheckHint = styled.span` display: block; font-size: 12px; color: ${st.textMuted}; `;
const Actions = styled.div` display: flex; justify-content: flex-end; gap: 8px; `;
const Empty = styled.p` margin: 0; font-size: 13px; color: ${st.textMuted}; `;

interface Draft {
    id: string | null;
    title: string;
    content: string;
    isDefaultSelected: boolean;
}

const EMPTY: Draft = { id: null, title: '', content: '', isDefaultSelected: false };

export function CareInstructionsSection() {
    const { instructions, isLoading } = useCareInstructions();
    const { create, update, remove } = useCareInstructionMutations();
    const { showError, showSuccess } = useToast();
    const [draft, setDraft] = useState<Draft | null>(null);

    const busy = create.isPending || update.isPending;

    const save = async () => {
        if (!draft) return;
        const title = draft.title.trim();
        const content = draft.content.trim();
        if (!title || !content) {
            showError('Uzupełnij instrukcję', 'Nazwa i treść są wymagane.');
            return;
        }
        try {
            const req = { title, content, isDefaultSelected: draft.isDefaultSelected };
            if (draft.id) await update.mutateAsync({ id: draft.id, req });
            else await create.mutateAsync(req);
            setDraft(null);
        } catch {
            showError('Nie udało się zapisać instrukcji', 'Spróbuj ponownie za chwilę.');
        }
    };

    const del = async (instruction: CareInstruction) => {
        // Bez okna potwierdzenia: instrukcja jest wpisem słownika, nie danymi klienta —
        // wpisanie jej z powrotem to dwa pola, a potwierdzenie przy każdym porządkowaniu
        // listy zmęczyłoby bardziej, niż chroni.
        try {
            await remove.mutateAsync(instruction.id);
            showSuccess('Instrukcja usunięta', `„${instruction.title}" nie będzie się już pojawiać.`);
        } catch {
            showError('Nie udało się usunąć instrukcji', 'Spróbuj ponownie za chwilę.');
        }
    };

    return (
        <Wrap>
            <Head>
                <div>
                    <Title>Instrukcje pielęgnacji</Title>
                    <Desc>
                        Zdania, z których składa się sekcja „Jak utrzymać efekt" na certyfikacie
                        jakości. Zaznaczane zawsze dotyczą każdej realizacji; pozostałe przypisz do
                        usług w zakładce obok — wtedy zaznaczą się same, gdy usługa znajdzie się na
                        certyfikacie.
                    </Desc>
                </div>
                {/* Ukryty, gdy edytor jest otwarty: jedno wypełnienie na okno (CLAUDE.md §2). */}
                {!draft && (
                    <SharedButton type="button" onClick={() => setDraft(EMPTY)}>
                        <Plus size={16} /> Dodaj instrukcję
                    </SharedButton>
                )}
            </Head>

            {draft && (
                <Editor>
                    <Field>
                        <FieldLabel>Nazwa (widoczna tylko dla Was)</FieldLabel>
                        <Input
                            value={draft.title}
                            onChange={e => setDraft({ ...draft, title: e.target.value })}
                            placeholder="np. Powłoka ceramiczna — utwardzanie"
                            autoFocus
                        />
                    </Field>
                    <Field>
                        <FieldLabel>Treść drukowana na certyfikacie</FieldLabel>
                        <Area
                            value={draft.content}
                            onChange={e => setDraft({ ...draft, content: e.target.value })}
                            placeholder="np. Pierwsze mycie nie wcześniej niż 7 dni po nałożeniu powłoki. Do pełnej twardości powłoka dochodzi przez 30 dni."
                        />
                    </Field>
                    <CheckRow>
                        <Check
                            type="checkbox"
                            checked={draft.isDefaultSelected}
                            onChange={e => setDraft({ ...draft, isDefaultSelected: e.target.checked })}
                        />
                        <CheckText>
                            Zaznaczaj przy każdym certyfikacie
                            <CheckHint>
                                Dla zasad prawdziwych niezależnie od wykonanej usługi. Pracownik może
                                je odznaczyć przy generowaniu.
                            </CheckHint>
                        </CheckText>
                    </CheckRow>
                    <Actions>
                        <SharedButton type="button" $variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                            Anuluj
                        </SharedButton>
                        <SharedButton type="button" onClick={save} disabled={busy}>
                            {busy ? 'Zapisuję…' : draft.id ? 'Zapisz zmiany' : 'Dodaj instrukcję'}
                        </SharedButton>
                    </Actions>
                </Editor>
            )}

            {isLoading && <Empty>Wczytywanie…</Empty>}
            {!isLoading && instructions.length === 0 && (
                <Empty>Słownik jest pusty — dodaj pierwszą instrukcję.</Empty>
            )}

            <List>
                {instructions.map(instruction => (
                    <Card key={instruction.id}>
                        <CardMain>
                            <CardTitle>{instruction.title}</CardTitle>
                            <CardText>{instruction.content}</CardText>
                            <Badges>
                                {instruction.isDefaultSelected && <Badge $tone="blue">Zaznaczana zawsze</Badge>}
                                {instruction.serviceIds.length > 0 && (
                                    <Badge $tone="muted">
                                        {instruction.serviceIds.length === 1
                                            ? 'przypisana do 1 usługi'
                                            : `przypisana do ${instruction.serviceIds.length} usług`}
                                    </Badge>
                                )}
                            </Badges>
                        </CardMain>
                        <IconBtn
                            type="button"
                            aria-label="Edytuj instrukcję"
                            onClick={() => setDraft({
                                id: instruction.id,
                                title: instruction.title,
                                content: instruction.content,
                                isDefaultSelected: instruction.isDefaultSelected,
                            })}
                        >
                            <Pencil size={15} />
                        </IconBtn>
                        <IconBtn $danger type="button" aria-label="Usuń instrukcję" onClick={() => del(instruction)}>
                            <Trash2 size={15} />
                        </IconBtn>
                    </Card>
                ))}
            </List>
        </Wrap>
    );
}
