import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Mail, Pencil, Phone, TriangleAlert, Undo2, User } from 'lucide-react';
import { useDebounce } from '@/common/hooks';
import { PiiValue, joinPiiName } from '@/common/pii';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { appointmentApi } from '../../api/appointmentApi';
import type { CustomerDraft, CustomerSectionState, EntityEvent } from './types';
import {
    ActionBtn, ActionsRow, Avatar, Card, CardActions, CardBody, CardHead, CardTitle,
    EmptyHint, EntityName, Field, FormGrid, HeadIcon, IdentityRow, IdentityText,
    InlineLink, MetaItem, MetaRow, MutationNotice, OptionList, OptionRow, OptionTitle,
    QuietBtn, StateTag, TextInput,
} from './EntityCardKit';

interface CustomerCardProps {
    state: CustomerSectionState;
    dispatch: (event: EntityEvent) => void;
    /**
     * Extra form content (e.g. check-in's home address / company collapsibles)
     * shown ONLY inside the new-customer and edit forms, since these fields belong to
     * the customer record, so they surface exactly when the record is being edited.
     */
    editExtras?: ReactNode;
}

const initialsOf = (firstName: string, lastName: string) =>
    `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || '?';

const draftLabel = (draft: CustomerDraft) =>
    [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Nowy klient';

/**
 * Summary card for the visit's customer. Read-only by default: the entity is a
 * reference, not a form, with explicit, intent-named actions. See entity-cards/types.ts.
 */
export const CustomerCard = ({ state, dispatch, editExtras }: CustomerCardProps) => (
    <Card>
        <CardHead>
            <HeadIcon><User /></HeadIcon>
            <CardTitle>Klient</CardTitle>
            {state.kind === 'NEW' && <StateTag $tone="new">Nowy</StateTag>}
            {state.kind === 'SELECTED_MODIFIED' && <StateTag $tone="modified">Zmienione dane</StateTag>}
        </CardHead>
        <CardBody>
            {state.kind === 'SELECTED' && (
                <SelectedView snapshot={state.snapshot} modified={false} dispatch={dispatch} />
            )}
            {state.kind === 'SELECTED_MODIFIED' && (
                <SelectedView snapshot={{ ...state.snapshot, ...state.draft }} modified dispatch={dispatch} />
            )}
            {state.kind === 'NEW' && <NewView draft={state.draft} dispatch={dispatch} editExtras={editExtras} />}
            {state.kind === 'EDITING' && <EditView state={state} dispatch={dispatch} editExtras={editExtras} />}
            {state.kind === 'CHOOSING' && <SearchView dispatch={dispatch} />}
        </CardBody>
    </Card>
);

// ─── Read-only card ───────────────────────────────────────────────────────────

const SelectedView = ({
    snapshot, modified, dispatch,
}: {
    snapshot: { firstName: string; lastName: string; phone: string; email: string };
    modified: boolean;
    dispatch: CustomerCardProps['dispatch'];
}) => (
    <>
        <IdentityRow>
            <Avatar aria-hidden>{initialsOf(snapshot.firstName, snapshot.lastName)}</Avatar>
            <IdentityText>
                <EntityName>
                    <PiiValue value={joinPiiName(snapshot.firstName, snapshot.lastName)} kind="name" />
                </EntityName>
                <MetaRow>
                    <MetaItem>
                        <Phone aria-hidden />
                        <PiiValue value={snapshot.phone} kind="phone" emptyFallback="brak telefonu" />
                    </MetaItem>
                    <MetaItem>
                        <Mail aria-hidden />
                        <PiiValue value={snapshot.email} kind="email" emptyFallback="brak e-maila" />
                    </MetaItem>
                </MetaRow>
            </IdentityText>
        </IdentityRow>
        <CardActions>
            <QuietBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_EDIT' })}>
                <Pencil aria-hidden /> Edytuj dane
            </QuietBtn>
            <QuietBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_SEARCH' })}>
                <ArrowLeftRight aria-hidden /> Zmień klienta
            </QuietBtn>
            {modified && (
                <QuietBtn $danger onClick={() => dispatch({ type: 'CUSTOMER_DISCARD_CHANGES' })}>
                    <Undo2 aria-hidden /> Wycofaj zmiany
                </QuietBtn>
            )}
        </CardActions>
    </>
);

// ─── New-customer inline form ─────────────────────────────────────────────────

const NewView = ({
    draft, dispatch, editExtras,
}: {
    draft: CustomerDraft;
    dispatch: CustomerCardProps['dispatch'];
    editExtras?: ReactNode;
}) => {
    const set = (updates: Partial<CustomerDraft>) =>
        dispatch({ type: 'CUSTOMER_NEW_DRAFT_CHANGED', draft: { ...draft, ...updates } });

    return (
        <>
            <CustomerFields draft={draft} onChange={set} />
            {editExtras}
            <CardActions>
                <QuietBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_SEARCH' })}>
                    <ArrowLeftRight aria-hidden /> Wybierz istniejącego klienta
                </QuietBtn>
            </CardActions>
        </>
    );
};

// ─── Edit form (deliberate mutation) ──────────────────────────────────────────

const EditView = ({
    state, dispatch, editExtras,
}: {
    state: Extract<CustomerSectionState, { kind: 'EDITING' }>;
    dispatch: CustomerCardProps['dispatch'];
    editExtras?: ReactNode;
}) => {
    const [draft, setDraft] = useState<CustomerDraft>(state.draft);
    const isExisting = state.base.kind !== 'NEW';

    return (
        <>
            {isExisting && (
                <MutationNotice>
                    <TriangleAlert aria-hidden />
                    <span>
                        Edytujesz dane klienta <strong>{draftLabel(draft)}</strong>.
                        Zmiany zapiszą się w jego kartotece i będą widoczne we wszystkich wizytach.
                    </span>
                </MutationNotice>
            )}
            <CustomerFields draft={draft} onChange={updates => setDraft(prev => ({ ...prev, ...updates }))} />
            {editExtras}
            <ActionsRow>
                <ActionBtn $primary onClick={() => dispatch({ type: 'CUSTOMER_COMMIT_EDIT', draft })}>
                    Zatwierdź
                </ActionBtn>
                <ActionBtn onClick={() => dispatch({ type: 'CUSTOMER_CANCEL_EDIT' })}>Anuluj</ActionBtn>
            </ActionsRow>
        </>
    );
};

const CustomerFields = ({
    draft, onChange,
}: {
    draft: CustomerDraft;
    onChange: (updates: Partial<CustomerDraft>) => void;
}) => (
    <FormGrid>
        <Field>
            Imię
            <TextInput
                value={draft.firstName}
                onChange={e => onChange({ firstName: capitalizeFirst(e.target.value) })}
                autoComplete="off"
            />
        </Field>
        <Field>
            Nazwisko
            <TextInput
                value={draft.lastName}
                onChange={e => onChange({ lastName: capitalizeFirst(e.target.value) })}
                autoComplete="off"
            />
        </Field>
        <Field>
            Telefon
            <TextInput
                value={draft.phone}
                onChange={e => onChange({ phone: e.target.value })}
                inputMode="tel"
                autoComplete="off"
            />
        </Field>
        <Field>
            E-mail
            <TextInput
                value={draft.email}
                onChange={e => onChange({ email: e.target.value })}
                inputMode="email"
                autoComplete="off"
            />
        </Field>
    </FormGrid>
);

// ─── Search / re-selection ────────────────────────────────────────────────────

const SearchView = ({ dispatch }: { dispatch: CustomerCardProps['dispatch'] }) => {
    const [query, setQuery] = useState('');
    const debounced = useDebounce(query, 300);

    const { data: results = [], isFetching } = useQuery({
        queryKey: ['entity-cards', 'customer-search', debounced],
        queryFn: () => appointmentApi.searchCustomers(debounced),
        enabled: debounced.trim().length >= 2,
    });

    return (
        <>
            <TextInput
                autoFocus
                placeholder="Szukaj po nazwisku, telefonie lub e-mailu..."
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            {debounced.trim().length >= 2 && (
                <OptionList>
                    {results.map(customer => (
                        <OptionRow
                            key={customer.id}
                            type="button"
                            onClick={() => dispatch({
                                type: 'CUSTOMER_SELECTED',
                                customer: {
                                    id: customer.id,
                                    firstName: customer.firstName ?? '',
                                    lastName: customer.lastName ?? '',
                                    phone: customer.phone ?? '',
                                    email: customer.email ?? '',
                                },
                            })}
                        >
                            <OptionTitle>
                                <PiiValue value={joinPiiName(customer.firstName ?? '', customer.lastName ?? '')} kind="name" />
                            </OptionTitle>
                            <MetaItem>
                                <Phone aria-hidden />
                                <PiiValue value={customer.phone ?? ''} kind="phone" emptyFallback="-" />
                            </MetaItem>
                        </OptionRow>
                    ))}
                    {!isFetching && results.length === 0 && (
                        <EmptyHint>Brak wyników dla „{debounced}".</EmptyHint>
                    )}
                </OptionList>
            )}
            <InlineLink type="button" onClick={() => dispatch({ type: 'CUSTOMER_CREATE_NEW' })}>
                + Dodaj nowego klienta
            </InlineLink>
            <CardActions>
                <QuietBtn onClick={() => dispatch({ type: 'CUSTOMER_CANCEL_SEARCH' })}>Anuluj</QuietBtn>
            </CardActions>
        </>
    );
};
