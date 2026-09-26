// src/modules/settings/components/services/PackageEditorModal.tsx
//
// Dodanie i edycja pakietu: nazwa, jedna cena całości i lista usług w środku.
//
// Składowe pakietu nie mają tu własnych cen, więc lista trzyma same identyfikatory
// i nazwy (`PackageMember`). Wcześniej udawała pełne usługi z cennika z ceną 0 zł,
// co psuło typy (brakujące `basePriceGross`) i zapraszało, żeby ktoś kiedyś tę
// „cenę" odczytał.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Plus, X } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FieldLabel, FormErrorMsg, InputShell, BareInput } from '@/common/components/Form';
import { Button, IconButton, Notice, StatusPill, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import {
    useCreatePackage, useCreateService, useServices, useUpdatePackage,
} from '@/modules/services/hooks/useServices';
import type { Service } from '@/modules/services/types';
import { useSettingsDirty } from '../shared/settingsChrome';
import { PriceFieldsBlock } from './PriceFieldsBlock';
import { reportMutationError } from './mutationFeedback';
import {
    EMPTY_PRICE_FIELDS, priceError, priceFieldsChanged, priceFieldsFromCatalog, pricePayload,
    validateCatalogName,
    type PriceFields,
} from './servicePriceForm.helpers';

interface PackageMember {
    id: string;
    name: string;
    /** Pozycja dopisana z palca - zakłada się ją w cenniku dopiero przy zapisie pakietu. */
    isNew?: boolean;
}

const NEW_PREFIX = 'NEW::';

interface Props {
    /** Edytowany pakiet albo `null` przy dodawaniu. */
    target: Service | null;
    onClose: () => void;
    onSaved: (saved: Service) => void;
}

export function PackageEditorModal({ target, onClose, onSaved }: Props) {
    const { showSuccess, showError } = useToast();
    const createService = useCreateService();
    const createPackage = useCreatePackage();
    const updatePackage = useUpdatePackage();

    const [initialPrice] = useState(() => (target ? priceFieldsFromCatalog(target) : EMPTY_PRICE_FIELDS));
    const [initialMembers] = useState<PackageMember[]>(() => (
        (target?.packageItems ?? [])
            .slice()
            .sort((a, b) => a.position - b.position)
            .map(item => ({ id: item.serviceId, name: item.serviceName }))
    ));

    const [name, setName] = useState(target?.name ?? '');
    const [price, setPrice] = useState<PriceFields>(initialPrice);
    const [members, setMembers] = useState<PackageMember[]>(initialMembers);
    const [query, setQuery] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingCustomName, setPendingCustomName] = useState<string | null>(null);
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const grossRef = useRef<HTMLInputElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const { services: pickerServices } = useServices({
        search: query, page: 1, limit: 50, showInactive: false, isPackage: false,
    });
    const available = pickerServices.filter(s => !s.isPackage && !members.some(m => m.id === s.id));

    // Lista podpowiedzi zamyka się kliknięciem obok - jak każda lista rozwijana.
    useEffect(() => {
        if (!pickerOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [pickerOpen]);

    const nameError = validateCatalogName(name);
    const priceProblem = priceError(price);
    const membersError = members.length < 2 ? 'Pakiet musi zawierać co najmniej 2 usługi' : undefined;

    const dirty = name !== (target?.name ?? '')
        || priceFieldsChanged(price, initialPrice)
        || members.map(m => m.id).join() !== initialMembers.map(m => m.id).join();
    useSettingsDirty(dirty);

    const addMember = (member: PackageMember) => {
        setMembers(prev => [...prev, member]);
        setQuery('');
        setPickerOpen(false);
    };

    const addCustom = async (customName: string, saveToCatalog: boolean) => {
        if (!saveToCatalog) {
            addMember({ id: `${NEW_PREFIX}${customName}`, name: customName, isNew: true });
            setPendingCustomName(null);
            return;
        }
        try {
            const created = await createService.mutateAsync({
                name: customName, basePriceNet: 0, basePriceGross: 0, vatRate: 23, requireManualPrice: true,
            });
            addMember({ id: created.id, name: created.name });
            setPendingCustomName(null);
        } catch (error) {
            reportMutationError(showError, error, 'Nie udało się zapisać usługi w cenniku');
        }
    };

    const submit = async () => {
        if (nameError || priceProblem || membersError) {
            setShowErrors(true);
            (nameError ? nameRef : priceProblem ? grossRef : searchRef).current?.focus();
            return;
        }
        setSaving(true);
        try {
            // Pozycje dopisane z palca zakładamy w cenniku dopiero teraz - i od razu
            // podmieniamy na prawdziwe identyfikatory, żeby ponowny zapis po błędzie
            // nie założył ich drugi raz.
            const resolved: PackageMember[] = [];
            for (const member of members) {
                if (!member.isNew) { resolved.push(member); continue; }
                const created = await createService.mutateAsync({
                    name: member.name, basePriceNet: 0, basePriceGross: 0, vatRate: 23, requireManualPrice: true,
                });
                const real = { id: created.id, name: created.name };
                resolved.push(real);
                setMembers(prev => prev.map(m => (m.id === member.id ? real : m)));
            }

            const request = {
                name: name.trim(),
                ...pricePayload(price),
                vatRate: price.vatRate,
                requireManualPrice: price.requireManualPrice,
                serviceIds: resolved.map(m => m.id),
            };
            const saved = target
                ? await updatePackage.mutateAsync({ originalPackageId: target.id, ...request })
                : await createPackage.mutateAsync(request);
            showSuccess(target ? 'Pakiet zapisany' : 'Pakiet dodany', `„${saved.name}" jest w cenniku.`);
            onSaved(saved);
        } catch (error) {
            reportMutationError(showError, error, target ? 'Nie udało się zapisać pakietu' : 'Nie udało się dodać pakietu');
        } finally {
            setSaving(false);
        }
    };

    const trimmedQuery = query.trim();
    const showSuggestions = pickerOpen && (available.length > 0 || trimmedQuery.length >= 2);

    return (
        <>
            <ModalShell isOpen onClose={onClose} size="md" dismissible={!dirty && pendingCustomName === null}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>{target ? 'Edytuj pakiet' : 'Nowy pakiet'}</ModalTitle>
                        <ModalSubtitle>{target ? target.name : 'Kilka usług sprzedawanych razem, z jedną ceną'}</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <Form
                        id="package-editor-form"
                        onSubmit={e => { e.preventDefault(); void submit(); }}
                        autoComplete="off"
                        noValidate
                    >
                        <Field>
                            <FieldLabel htmlFor="package-editor-name">Nazwa pakietu</FieldLabel>
                            <InputShell $hasError={showErrors && !!nameError}>
                                <BareInput
                                    id="package-editor-name"
                                    ref={nameRef}
                                    placeholder="np. Pakiet Nowy samochód"
                                    value={name}
                                    onChange={e => setName(capitalizeFirst(e.target.value))}
                                    aria-invalid={showErrors && !!nameError}
                                    autoFocus
                                />
                            </InputShell>
                            {showErrors && nameError && <FormErrorMsg>{nameError}</FormErrorMsg>}
                        </Field>

                        <Group aria-labelledby="package-editor-price">
                            <GroupTitle id="package-editor-price">Cena pakietu</GroupTitle>
                            <PriceFieldsBlock
                                ref={grossRef}
                                idPrefix="package-editor"
                                fields={price}
                                onChange={setPrice}
                                error={showErrors ? priceProblem : undefined}
                                manualHint="Cenę całego pakietu ustalasz przy każdym zleceniu."
                            />
                        </Group>

                        <Group aria-labelledby="package-editor-members">
                            <GroupTitle id="package-editor-members">Usługi w pakiecie</GroupTitle>
                            <Notice tone="info">
                                Pakiet ma jedną cenę za całość - usługi w środku nie mają w nim własnych cen.
                                Potrzebne są co najmniej 2.
                            </Notice>

                            <Field ref={pickerRef}>
                                <FieldLabel htmlFor="package-editor-search">Dodaj usługę</FieldLabel>
                                <InputShell $hasError={showErrors && !!membersError}>
                                    <BareInput
                                        id="package-editor-search"
                                        ref={searchRef}
                                        placeholder="Wpisz nazwę usługi"
                                        value={query}
                                        onChange={e => { setQuery(e.target.value); setPickerOpen(true); }}
                                        onFocus={() => setPickerOpen(true)}
                                        aria-expanded={showSuggestions}
                                        aria-controls="package-editor-suggestions"
                                    />
                                </InputShell>
                                {showSuggestions && (
                                    <Suggestions id="package-editor-suggestions" role="listbox" aria-label="Usługi do dodania">
                                        {available.map(svc => (
                                            <Suggestion
                                                key={svc.id}
                                                type="button"
                                                role="option"
                                                aria-selected={false}
                                                onClick={() => addMember({ id: svc.id, name: svc.name })}
                                            >
                                                {svc.name}
                                            </Suggestion>
                                        ))}
                                        {trimmedQuery.length >= 2 && (
                                            <Suggestion
                                                type="button"
                                                role="option"
                                                aria-selected={false}
                                                $accent
                                                onClick={() => { setPendingCustomName(trimmedQuery); setPickerOpen(false); }}
                                            >
                                                <Plus size={15} aria-hidden="true" />
                                                Dodaj „{trimmedQuery}" jako nową pozycję
                                            </Suggestion>
                                        )}
                                    </Suggestions>
                                )}
                                {showErrors && membersError && <FormErrorMsg>{membersError}</FormErrorMsg>}
                            </Field>

                            {members.length > 0 && (
                                <Members>
                                    {members.map((member, index) => (
                                        <Member key={member.id}>
                                            <Position aria-hidden="true">{index + 1}</Position>
                                            <MemberName>{member.name}</MemberName>
                                            {member.isNew && <StatusPill $tone="info">Nowa</StatusPill>}
                                            <IconButton
                                                label={`Usuń z pakietu: ${member.name}`}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setMembers(prev => prev.filter(m => m.id !== member.id))}
                                            >
                                                <X />
                                            </IconButton>
                                        </Member>
                                    ))}
                                </Members>
                            )}
                        </Group>
                    </Form>
                </ModalContent>

                <ModalFooter>
                    <Button onClick={onClose}>Anuluj</Button>
                    <Button type="submit" form="package-editor-form" variant="primary" disabled={saving}>
                        {saving ? 'Zapisywanie...' : target ? 'Zapisz pakiet' : 'Dodaj pakiet'}
                    </Button>
                </ModalFooter>
            </ModalShell>

            {pendingCustomName !== null && (
                <ModalShell isOpen onClose={() => setPendingCustomName(null)} size="sm">
                    <ModalHeader>
                        <ModalTitleGroup>
                            <ModalTitle>Zapisać „{pendingCustomName}" w cenniku?</ModalTitle>
                        </ModalTitleGroup>
                        <CloseBtn onClick={() => setPendingCustomName(null)} />
                    </ModalHeader>
                    <ModalContent>
                        <Muted>
                            Zapisana w cenniku trafi tam od razu, z wyceną ręczną, i będzie do wyboru przy
                            kolejnych zleceniach. Jeśli nie, pozycja zostanie tylko w tym pakiecie.
                        </Muted>
                    </ModalContent>
                    <ModalFooter>
                        <Button onClick={() => void addCustom(pendingCustomName, false)}>Tylko w tym pakiecie</Button>
                        <Button
                            variant="primary"
                            disabled={createService.isPending}
                            onClick={() => void addCustom(pendingCustomName, true)}
                        >
                            {createService.isPending ? 'Zapisywanie...' : 'Zapisz w cenniku'}
                        </Button>
                    </ModalFooter>
                </ModalShell>
            )}
        </>
    );
}

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 22px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding-top: 20px;
    border-top: 1px solid ${ui.lineFaint};
`;

const GroupTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Muted = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

/* Lista w przepływie formularza, nie wyskakująca nad nim: w oknie z własnym
   przewijaniem rozwijana lista `position: absolute` bywała przycinana przy dole. */
const Suggestions = styled.div`
    display: flex;
    flex-direction: column;
    max-height: 220px;
    overflow-y: auto;
    padding: 4px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
`;

const Suggestion = styled.button<{ $accent?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    font-weight: ${p => (p.$accent ? 600 : 500)};
    color: ${p => (p.$accent ? ui.brandInk : ui.ink)};
    text-align: left;
    cursor: pointer;

    &:hover, &:focus-visible { background: ${ui.surfaceAlt}; outline: none; }
`;

const Members = styled.ol`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Member = styled.li`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    border-top: 1px solid ${ui.lineFaint};

    &:first-child { border-top: none; }
`;

const Position = styled.span`
    width: 24px;
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
`;

const MemberName = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;
