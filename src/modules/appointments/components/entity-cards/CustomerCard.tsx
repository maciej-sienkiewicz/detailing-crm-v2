import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/common/hooks';
import { PiiValue, joinPiiName } from '@/common/pii';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { appointmentApi } from '../../api/appointmentApi';
import type { CustomerDraft, CustomerSectionState, EntityEvent } from './types';
import {
    ActionBtn, ActionsRow, Card, CardBody, CardHead, CardTitle, EmptyHint, EntityMeta,
    EntityName, Field, FormGrid, InlineLink, ModeBadge, MutationNotice, OptionList,
    OptionRow, OptionTitle, TextInput,
} from './EntityCardKit';

interface CustomerCardProps {
    state: CustomerSectionState;
    dispatch: (event: EntityEvent) => void;
}

const draftLabel = (draft: CustomerDraft) =>
    [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Nowy klient';

/**
 * Summary card for the visit's customer. Read-only by default — the entity is a
 * reference, not a form — with explicit, intent-named actions. See entity-cards/types.ts.
 */
export const CustomerCard = ({ state, dispatch }: CustomerCardProps) => {
    const badge =
        state.kind === 'NEW' ? <ModeBadge $tone="new">nowy — zostanie utworzony</ModeBadge> :
        state.kind === 'SELECTED_MODIFIED' ? <ModeBadge $tone="modified">edytowany — zmiany zapiszą się w bazie</ModeBadge> :
        state.kind === 'SELECTED' ? <ModeBadge $tone="neutral">istniejący</ModeBadge> :
        null;

    return (
        <Card>
            <CardHead>
                <CardTitle>Dane klienta</CardTitle>
                {badge}
            </CardHead>
            <CardBody>
                {state.kind === 'SELECTED' && (
                    <SelectedView snapshot={state.snapshot} modified={false} dispatch={dispatch} />
                )}
                {state.kind === 'SELECTED_MODIFIED' && (
                    <SelectedView
                        snapshot={{ ...state.snapshot, ...state.draft }}
                        modified
                        dispatch={dispatch}
                    />
                )}
                {state.kind === 'NEW' && <NewView draft={state.draft} dispatch={dispatch} />}
                {state.kind === 'EDITING' && <EditView state={state} dispatch={dispatch} />}
                {state.kind === 'CHOOSING' && <SearchView dispatch={dispatch} />}
            </CardBody>
        </Card>
    );
};

// ─── Read-only card ───────────────────────────────────────────────────────────

const SelectedView = ({
    snapshot, modified, dispatch,
}: {
    snapshot: { firstName: string; lastName: string; phone: string; email: string };
    modified: boolean;
    dispatch: CustomerCardProps['dispatch'];
}) => (
    <>
        <div>
            <EntityName>
                <PiiValue value={joinPiiName(snapshot.firstName, snapshot.lastName)} kind="name" />
            </EntityName>
            <EntityMeta>
                <PiiValue value={snapshot.phone} kind="phone" emptyFallback="brak telefonu" />
                {' · '}
                <PiiValue value={snapshot.email} kind="email" emptyFallback="brak e-maila" />
            </EntityMeta>
        </div>
        <ActionsRow>
            <ActionBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_EDIT' })}>Edytuj dane</ActionBtn>
            <ActionBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_SEARCH' })}>Zmień klienta</ActionBtn>
            {modified && (
                <ActionBtn $danger onClick={() => dispatch({ type: 'CUSTOMER_DISCARD_CHANGES' })}>
                    Wycofaj zmiany
                </ActionBtn>
            )}
        </ActionsRow>
    </>
);

// ─── New-customer inline form ─────────────────────────────────────────────────

const NewView = ({ draft, dispatch }: { draft: CustomerDraft; dispatch: CustomerCardProps['dispatch'] }) => {
    const set = (updates: Partial<CustomerDraft>) =>
        dispatch({ type: 'CUSTOMER_NEW_DRAFT_CHANGED', draft: { ...draft, ...updates } });

    return (
        <>
            <CustomerFields draft={draft} onChange={set} />
            <ActionsRow>
                <ActionBtn onClick={() => dispatch({ type: 'CUSTOMER_OPEN_SEARCH' })}>
                    Wybierz istniejącego klienta
                </ActionBtn>
            </ActionsRow>
        </>
    );
};

// ─── Edit form (deliberate mutation) ──────────────────────────────────────────

const EditView = ({
    state, dispatch,
}: {
    state: Extract<CustomerSectionState, { kind: 'EDITING' }>;
    dispatch: CustomerCardProps['dispatch'];
}) => {
    const [draft, setDraft] = useState<CustomerDraft>(state.draft);
    const isExisting = state.base.kind !== 'NEW';

    return (
        <>
            {isExisting && (
                <MutationNotice>
                    <span aria-hidden>⚠️</span>
                    <span>
                        Edytujesz dane klienta <strong>{draftLabel(draft)}</strong>.
                        Zmiany zapiszą się w jego kartotece i będą widoczne we wszystkich wizytach.
                    </span>
                </MutationNotice>
            )}
            <CustomerFields draft={draft} onChange={updates => setDraft(prev => ({ ...prev, ...updates }))} />
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
                placeholder="Szukaj po nazwisku, telefonie lub e-mailu…"
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
                            <EntityMeta>
                                <PiiValue value={customer.phone ?? ''} kind="phone" emptyFallback="—" />
                            </EntityMeta>
                        </OptionRow>
                    ))}
                    {!isFetching && results.length === 0 && (
                        <EmptyHint>Brak wyników dla „{debounced}".</EmptyHint>
                    )}
                </OptionList>
            )}
            <ActionsRow>
                <InlineLink type="button" onClick={() => dispatch({ type: 'CUSTOMER_CREATE_NEW' })}>
                    + Dodaj nowego klienta
                </InlineLink>
            </ActionsRow>
            <ActionsRow>
                <ActionBtn onClick={() => dispatch({ type: 'CUSTOMER_CANCEL_SEARCH' })}>Anuluj</ActionBtn>
            </ActionsRow>
        </>
    );
};
