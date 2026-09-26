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
//
// Ten sam język co lista usług obok: jedna karta z wierszami, akcje w menu ⋮,
// edycja w oknie. Wcześniej każda instrukcja była osobną obramowaną kartą z dwoma
// przyciskami, a edytor rozwijał się nad listą.
import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FieldLabel, FormErrorMsg, InputShell, InputShellTextArea, BareInput, BareTextArea,
} from '@/common/components/Form';
import {
    ActionMenu, Button, Card, IconButton, MenuDivider, MenuItem, Notice, StatusPill, ui, useActionMenu,
} from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import {
    CARE_INSTRUCTIONS_KEY, useCareInstructions, useCareInstructionMutations,
} from '../hooks/useCareInstructions';
import type { CareInstruction } from '../api/careInstructionsApi';
import { SettingsHeaderActions } from './shared/SettingsHeaderActions';
import { useSettingsDirty } from './shared/settingsChrome';
import { reportMutationError } from './services/mutationFeedback';

interface Draft {
    id: string | null;
    title: string;
    content: string;
    isDefaultSelected: boolean;
}

const EMPTY: Draft = { id: null, title: '', content: '', isDefaultSelected: false };

interface Props {
    /** Przełącznik „Usługi | Pakiety | Instrukcje pielęgnacji" z ramy cennika. */
    switcher?: ReactNode;
}

export function CareInstructionsSection({ switcher }: Props) {
    const { instructions, isLoading, isError } = useCareInstructions();
    const { remove } = useCareInstructionMutations();
    const { showError, showSuccess } = useToast();
    const queryClient = useQueryClient();
    const menu = useActionMenu<CareInstruction>();
    const [draft, setDraft] = useState<Draft | null>(null);

    const del = async (instruction: CareInstruction) => {
        // Bez okna potwierdzenia: instrukcja jest wpisem słownika, nie danymi klienta —
        // wpisanie jej z powrotem to dwa pola, a potwierdzenie przy każdym porządkowaniu
        // listy zmęczyłoby bardziej, niż chroni. Od przypadkowego kliknięcia chroni menu ⋮:
        // „Usuń" to drugi, świadomy ruch.
        try {
            await remove.mutateAsync(instruction.id);
            showSuccess('Instrukcja usunięta', `„${instruction.title}" nie będzie się już pojawiać.`);
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się usunąć instrukcji');
        }
    };

    const current = menu.menu?.item ?? null;

    return (
        <Wrap>
            <SettingsHeaderActions>
                <Button variant="primary" size="lg" onClick={() => setDraft(EMPTY)}>
                    <Plus /> Dodaj instrukcję
                </Button>
            </SettingsHeaderActions>

            {switcher && <Toolbar>{switcher}</Toolbar>}

            <Card aria-label="Instrukcje pielęgnacji">
                {isError ? (
                    <Padded>
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać instrukcji"
                            action={(
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void queryClient.invalidateQueries({ queryKey: CARE_INSTRUCTIONS_KEY })}
                                >
                                    Spróbuj ponownie
                                </Button>
                            )}
                        >
                            Lista jest pusta tylko na ekranie - zapisane instrukcje są bezpieczne.
                        </Notice>
                    </Padded>
                ) : isLoading ? (
                    <Muted>Wczytywanie instrukcji…</Muted>
                ) : instructions.length === 0 ? (
                    <Empty>
                        <strong>Słownik jest pusty</strong>
                        <span>Dodaj pierwszą instrukcję przyciskiem „Dodaj instrukcję".</span>
                    </Empty>
                ) : (
                    <List>
                        {instructions.map(instruction => (
                            <Row key={instruction.id}>
                                <Main>
                                    <Title>{instruction.title}</Title>
                                    <Text>{instruction.content}</Text>
                                    {(instruction.isDefaultSelected || instruction.serviceIds.length > 0) && (
                                        <Pills>
                                            {instruction.isDefaultSelected && (
                                                <StatusPill $tone="info">Zaznaczana przy każdym certyfikacie</StatusPill>
                                            )}
                                            {instruction.serviceIds.length > 0 && (
                                                <StatusPill $tone="neutral">
                                                    {/* Dopełniacz po „do": 1 usługi, 2 usług, 5 usług. */}
                                                    {instruction.serviceIds.length === 1
                                                        ? 'Przypisana do 1 usługi'
                                                        : `Przypisana do ${instruction.serviceIds.length} usług`}
                                                </StatusPill>
                                            )}
                                        </Pills>
                                    )}
                                </Main>
                                <IconButton
                                    label={`Więcej akcji: ${instruction.title}`}
                                    variant="outline"
                                    size="sm"
                                    shape="square"
                                    aria-haspopup="menu"
                                    active={menu.isOpen(instruction.id)}
                                    disabled={remove.isPending}
                                    onClick={e => menu.toggle(e, instruction, instruction.id)}
                                >
                                    <MoreVertical />
                                </IconButton>
                            </Row>
                        ))}
                    </List>
                )}
            </Card>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje instrukcji">
                {current && (
                    <>
                        <MenuItem
                            icon={<Pencil />}
                            onClick={() => setDraft({
                                id: current.id,
                                title: current.title,
                                content: current.content,
                                isDefaultSelected: current.isDefaultSelected,
                            })}
                        >
                            Edytuj
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem icon={<Trash2 />} danger onClick={() => void del(current)}>
                            Usuń
                        </MenuItem>
                    </>
                )}
            </ActionMenu>

            {draft && <CareInstructionEditor initial={draft} onClose={() => setDraft(null)} />}
        </Wrap>
    );
}

// ─── Edytor ───────────────────────────────────────────────────────────────────

function CareInstructionEditor({ initial, onClose }: { initial: Draft; onClose: () => void }) {
    const { create, update } = useCareInstructionMutations();
    const { showError, showSuccess } = useToast();
    const [draft, setDraft] = useState<Draft>(initial);
    const [showErrors, setShowErrors] = useState(false);

    const busy = create.isPending || update.isPending;
    const titleError = draft.title.trim() ? undefined : 'Podaj nazwę instrukcji';
    const contentError = draft.content.trim() ? undefined : 'Wpisz treść, która trafi na certyfikat';
    const dirty = draft.title !== initial.title
        || draft.content !== initial.content
        || draft.isDefaultSelected !== initial.isDefaultSelected;
    useSettingsDirty(dirty);

    const save = async () => {
        if (titleError || contentError) {
            setShowErrors(true);
            return;
        }
        try {
            const req = {
                title: draft.title.trim(),
                content: draft.content.trim(),
                isDefaultSelected: draft.isDefaultSelected,
            };
            if (draft.id) await update.mutateAsync({ id: draft.id, req });
            else await create.mutateAsync(req);
            showSuccess(draft.id ? 'Instrukcja zapisana' : 'Instrukcja dodana', `„${req.title}" jest w słowniku.`);
            onClose();
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się zapisać instrukcji');
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md" dismissible={!dirty}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{initial.id ? 'Edytuj instrukcję' : 'Nowa instrukcja'}</ModalTitle>
                    <ModalSubtitle>Treść trafia na certyfikat jakości słowo w słowo</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Form
                    id="care-instruction-form"
                    onSubmit={e => { e.preventDefault(); void save(); }}
                    autoComplete="off"
                    noValidate
                >
                    <Field>
                        <FieldLabel htmlFor="care-title">Nazwa (widoczna tylko dla Was)</FieldLabel>
                        <InputShell $hasError={showErrors && !!titleError}>
                            <BareInput
                                id="care-title"
                                value={draft.title}
                                onChange={e => setDraft({ ...draft, title: e.target.value })}
                                placeholder="np. Powłoka ceramiczna, utwardzanie"
                                aria-invalid={showErrors && !!titleError}
                                autoFocus
                            />
                        </InputShell>
                        {showErrors && titleError && <FormErrorMsg>{titleError}</FormErrorMsg>}
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="care-content">Treść drukowana na certyfikacie</FieldLabel>
                        <InputShellTextArea $hasError={showErrors && !!contentError}>
                            <BareTextArea
                                id="care-content"
                                value={draft.content}
                                onChange={e => setDraft({ ...draft, content: e.target.value })}
                                placeholder="np. Pierwsze mycie nie wcześniej niż 7 dni po nałożeniu powłoki. Do pełnej twardości powłoka dochodzi przez 30 dni."
                                aria-invalid={showErrors && !!contentError}
                            />
                        </InputShellTextArea>
                        {showErrors && contentError && <FormErrorMsg>{contentError}</FormErrorMsg>}
                    </Field>

                    <CheckRow>
                        <Check
                            type="checkbox"
                            checked={draft.isDefaultSelected}
                            onChange={e => setDraft({ ...draft, isDefaultSelected: e.target.checked })}
                        />
                        <CheckText>
                            <strong>Zaznaczaj przy każdym certyfikacie</strong>
                            <span>
                                Dla zasad prawdziwych niezależnie od wykonanej usługi. Pracownik może je
                                odznaczyć przy generowaniu.
                            </span>
                        </CheckText>
                    </CheckRow>
                </Form>
            </ModalContent>

            <ModalFooter>
                <Button onClick={onClose}>Anuluj</Button>
                <Button type="submit" form="care-instruction-form" variant="primary" disabled={busy}>
                    {busy ? 'Zapisywanie...' : initial.id ? 'Zapisz zmiany' : 'Dodaj instrukcję'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PHONE = '@media (max-width: 767px)';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 12px;
`;

const Intro = styled.p`
    margin: 0;
    max-width: 72ch;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

const List = styled.ul`
    margin: 0;
    padding: 6px 0;
    list-style: none;
`;

const Row = styled.li`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 24px;

    & + & { border-top: 1px solid ${ui.lineFaint}; }

    ${PHONE} { padding: 12px 16px; }
`;

const Main = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled.span`
    font-size: 14.5px;
    font-weight: 600;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

const Text = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    overflow-wrap: anywhere;
`;

const Pills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
`;

const Padded = styled.div`
    padding: 16px 24px 20px;

    ${PHONE} { padding: 14px 16px; }
`;

const Muted = styled.p`
    margin: 0;
    padding: 20px 24px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const Empty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 40px 24px 44px;
    text-align: center;

    strong { font-size: 15px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 13.5px; color: ${ui.textMuted}; }
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const CheckRow = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: pointer;
`;

const Check = styled.input`
    width: 18px;
    height: 18px;
    margin: 1px 0 0;
    flex-shrink: 0;
    accent-color: ${ui.brand};
`;

const CheckText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 13px; line-height: 1.45; color: ${ui.textMuted}; }
`;
