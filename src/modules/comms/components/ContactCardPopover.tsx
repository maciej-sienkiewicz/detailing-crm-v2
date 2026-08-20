// src/modules/comms/components/ContactCardPopover.tsx
// Wizytówka klienta spod avatara albo nazwiska w nagłówku rozmowy.
//
// Pytanie zawsze brzmi tak samo: przyszedł mail „proszę o termin na przegląd folii" —
// kto to w ogóle jest, kiedy tu był i czym jeździ? Odpowiedź musi paść w miejscu,
// w którym się czyta, bo inaczej trzeba przerwać czytanie, otworzyć kartotekę,
// odszukać klienta i wrócić — a wtedy odpowiedź i tak pisze się z pamięci.
//
// Chmurka pokazuje dokładnie tyle, ile potrzeba do napisania odpowiedzi: nazwisko,
// kiedy był ostatnio, czym jeździ i trzy ostatnie zlecenia z kwotą. Wszystko inne
// jest o jedno kliknięcie dalej, w kartotece.
//
// Gdy adresu nie ma w bazie, chmurka nie kończy się na „brak" — proponuje dwa
// wyjścia, bo nieznany adres to zwykle albo klient zapisany pod innym mailem,
// albo klient, którego jeszcze nie ma.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Car, Link2, Loader2, Search, UserPlus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { customerApi } from '@/modules/customers/api/customerApi';
import { AddCustomerModal } from '@/modules/customers/components/AddCustomerModal';
import { useToast } from '@/common/components/Toast';
import type { Customer } from '@/modules/customers/types';
import { COMMS_CONTACT_CARD_KEY, COMMS_INSIGHTS_KEY, useContactCard } from '../hooks/useComms';
import { formatGrosze } from './shared';

const Card = styled.div`
    position: fixed;
    z-index: 120;
    width: 360px;
    max-width: calc(100vw - 24px);
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Head = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid ${p => p.theme.colors.border};

    .who { flex: 1; min-width: 0; }
    .name {
        font-size: 14px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow-wrap: anywhere;
    }
    .sub {
        margin-top: 2px;
        font-size: 12px;
        color: ${p => p.theme.colors.textMuted};
        overflow-wrap: anywhere;
    }

    button.close {
        flex-shrink: 0;
        border: none;
        background: transparent;
        color: ${p => p.theme.colors.textMuted};
        cursor: pointer;
        padding: 2px;
        display: inline-flex;

        &:hover { color: ${p => p.theme.colors.text}; }
    }
`;

const Body = styled.div`
    max-height: 380px;
    overflow-y: auto;
    padding: 10px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Stats = styled.div`
    display: flex;
    gap: 8px;

    /* Tylko bezpośrednie dzieci — inaczej ramkę dostają też .label i .value w środku. */
    > div {
        flex: 1;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 7px 9px;
        background: ${p => p.theme.colors.surfaceAlt};
    }
    .label {
        font-size: 10.5px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }
    .value {
        margin-top: 1px;
        font-size: 13.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 5px;

    h5 {
        margin: 0;
        font-size: 10.5px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const VehicleLine = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: ${p => p.theme.colors.text};

    svg { flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
    .plate {
        margin-left: auto;
        font-size: 11.5px;
        color: ${p => p.theme.colors.textSecondary};
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.sm};
        padding: 0 5px;
        white-space: nowrap;
    }
`;

const VisitLine = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: ${p => p.theme.colors.text};

    .grow { flex: 1; min-width: 0; }
    .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta {
        font-size: 11.5px;
        color: ${p => p.theme.colors.textMuted};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .amount {
        font-variant-numeric: tabular-nums;
        font-weight: ${p => p.theme.fontWeights.semibold};
        white-space: nowrap;
    }
`;

const Muted = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;

const Foot = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    border: 1px solid ${({ $primary, theme }) => ($primary ? 'transparent' : theme.colors.border)};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : theme.colors.surface)};
    color: ${({ $primary, theme }) => ($primary ? '#ffffff' : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.md};
    padding: 8px 12px;
    font-size: 13px;
    font-family: inherit;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    transition: filter ${p => p.theme.transitions.fast};

    &:hover:not(:disabled) { filter: brightness(0.97); }
    &:disabled { opacity: 0.6; cursor: default; }

    svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 7px 10px;
    color: ${p => p.theme.colors.textMuted};

    input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        font-size: 13px;
        font-family: inherit;
        background: transparent;
        color: ${p => p.theme.colors.text};
    }
`;

const CandidateList = styled.div`
    max-height: 160px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
`;

const Candidate = styled.button`
    border: none;
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    padding: 7px 8px;
    border-radius: ${p => p.theme.radii.sm};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .name { font-size: 13px; color: ${p => p.theme.colors.text}; }
    .meta { font-size: 11.5px; color: ${p => p.theme.colors.textMuted}; }
`;

const ProfileLink = styled(Link)`
    font-size: 12.5px;
    color: ${p => p.theme.colors.primary};
    text-decoration: none;
    font-weight: ${p => p.theme.fontWeights.medium};

    &:hover { text-decoration: underline; }
`;

const dateOnly = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** „Jan Kowalski" → imię i nazwisko; jedno słowo trafia w imię. */
function splitName(full: string | null): { firstName: string; lastName: string } {
    const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

interface ContactCardPopoverProps {
    email: string;
    /** Nazwa z wątku — podpowiedź przy zakładaniu kartoteki. */
    participantName: string | null;
    anchor: HTMLElement;
    onClose: () => void;
}

export function ContactCardPopover({ email, participantName, anchor, onClose }: ContactCardPopoverProps) {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [linking, setLinking] = useState(false);
    const [query, setQuery] = useState('');
    const [candidates, setCandidates] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const { data, isLoading } = useContactCard(email);
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        const place = () => {
            const rect = anchor.getBoundingClientRect();
            const width = 360;
            const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
            const below = window.innerHeight - rect.bottom;
            const top = below > 360 ? rect.bottom + 6 : Math.max(12, rect.top - 366);
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
        const onDocClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (cardRef.current?.contains(target) || anchor.contains(target)) return;
            // Modal zakładania klienta żyje we własnym portalu — kliknięcie w nim
            // nie może zamykać chmurki, która go otworzyła.
            if (addOpen) return;
            onClose();
        };
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !addOpen) onClose();
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [anchor, onClose, addOpen]);

    // Wyszukiwanie kandydatów do powiązania — z opóźnieniem, żeby nie strzelać przy
    // każdej literze.
    useEffect(() => {
        if (!linking) return;
        const term = query.trim();
        if (term.length < 2) {
            setCandidates([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const page = await customerApi.getCustomers({ search: term, page: 1, limit: 8 });
                if (!cancelled) setCandidates(page.data);
            } catch {
                if (!cancelled) setCandidates([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [linking, query]);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: COMMS_CONTACT_CARD_KEY });
        queryClient.invalidateQueries({ queryKey: COMMS_INSIGHTS_KEY });
    };

    const linkTo = async (customer: Customer) => {
        setSaving(true);
        try {
            // Powiązanie znaczy: zapisz ten adres w kartotece. Bez tego następna
            // wiadomość z tego samego maila znów będzie od nieznajomego.
            await customerApi.updateCustomer(customer.id, { email });
            refresh();
            showSuccess(
                'Powiązano z klientem',
                `Adres ${email} zapisany w kartotece klienta`
            );
            setLinking(false);
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Nie udało się powiązać klienta', message ?? 'Spróbuj ponownie');
        } finally {
            setSaving(false);
        }
    };

    const initialValues = useMemo(() => {
        const { firstName, lastName } = splitName(participantName);
        return { firstName, lastName, email };
    }, [participantName, email]);

    if (!pos) return null;

    const customer = data?.customer ?? null;

    return createPortal(
        <>
            <Card ref={cardRef} style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="Wizytówka klienta">
                <Head>
                    <div className="who">
                        <div className="name">{customer?.fullName ?? participantName ?? email}</div>
                        <div className="sub">
                            {email}
                            {customer?.phone && ` · ${customer.phone}`}
                        </div>
                    </div>
                    <button type="button" className="close" onClick={onClose} aria-label="Zamknij">
                        <X size={14} />
                    </button>
                </Head>

                <Body>
                    {isLoading && <Muted>Wczytywanie…</Muted>}

                    {!isLoading && customer && (
                        <>
                            <Stats>
                                <div>
                                    <div className="label">Ostatnia wizyta</div>
                                    <div className="value">
                                        {customer.lastVisitAt ? dateOnly(customer.lastVisitAt) : 'Jeszcze nie był'}
                                    </div>
                                </div>
                                <div>
                                    <div className="label">Zostawił u nas</div>
                                    <div className="value">{formatGrosze(customer.totalSpentGross)}</div>
                                </div>
                            </Stats>

                            <Section>
                                <h5>Pojazdy</h5>
                                {(data?.vehicles ?? []).length === 0 && (
                                    <Muted>Brak aut w kartotece.</Muted>
                                )}
                                {(data?.vehicles ?? []).map((vehicle) => (
                                    <VehicleLine key={vehicle.id}>
                                        <Car size={13} />
                                        <span>
                                            {vehicle.brand} {vehicle.model}
                                            {vehicle.year && ` (${vehicle.year})`}
                                        </span>
                                        {vehicle.licensePlate && (
                                            <span className="plate">{vehicle.licensePlate}</span>
                                        )}
                                    </VehicleLine>
                                ))}
                            </Section>

                            <Section>
                                <h5>Ostatnie wizyty</h5>
                                {(data?.recentVisits ?? []).length === 0 && (
                                    <Muted>Jeszcze żadnej wizyty.</Muted>
                                )}
                                {(data?.recentVisits ?? []).map((visit) => (
                                    <VisitLine key={visit.id}>
                                        <span className="grow">
                                            <span className="title">{visit.title ?? 'Wizyta'}</span>
                                            <div className="meta">
                                                {dateOnly(visit.date)}
                                                {visit.vehicleLabel && ` · ${visit.vehicleLabel}`}
                                            </div>
                                        </span>
                                        <span className="amount">{formatGrosze(visit.totalGross)}</span>
                                    </VisitLine>
                                ))}
                            </Section>

                            <ProfileLink to={`/customers/${customer.id}`} onClick={onClose}>
                                Otwórz pełną kartotekę →
                            </ProfileLink>
                        </>
                    )}

                    {!isLoading && !customer && !linking && (
                        <Muted>
                            Tego adresu nie ma w kartotece. Możesz przypiąć go do klienta,
                            którego już masz, albo założyć nową kartotekę.
                        </Muted>
                    )}

                    {!isLoading && !customer && linking && (
                        <>
                            <SearchBox>
                                <Search size={13} />
                                <input
                                    autoFocus
                                    placeholder="Szukaj po nazwisku, telefonie…"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                />
                            </SearchBox>
                            {searching && <Muted>Szukam…</Muted>}
                            {!searching && query.trim().length >= 2 && candidates.length === 0 && (
                                <Muted>Nic nie znaleziono.</Muted>
                            )}
                            <CandidateList>
                                {candidates.map((candidate) => (
                                    <Candidate
                                        key={candidate.id}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => linkTo(candidate)}
                                    >
                                        <div className="name">
                                            {[candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || '(bez nazwiska)'}
                                        </div>
                                        <div className="meta">
                                            {candidate.contact?.email ?? 'brak adresu'}
                                            {candidate.contact?.phone && ` · ${candidate.contact.phone}`}
                                        </div>
                                    </Candidate>
                                ))}
                            </CandidateList>
                            {saving && <Muted><Loader2 size={12} /> Zapisuję…</Muted>}
                        </>
                    )}
                </Body>

                {!isLoading && !customer && (
                    <Foot>
                        <ActionButton type="button" onClick={() => setLinking((current) => !current)}>
                            <Link2 /> {linking ? 'Anuluj wyszukiwanie' : 'Połącz z istniejącym klientem'}
                        </ActionButton>
                        <ActionButton $primary type="button" onClick={() => setAddOpen(true)}>
                            <UserPlus /> Dodaj nowego klienta
                        </ActionButton>
                    </Foot>
                )}
            </Card>

            {addOpen && (
                <AddCustomerModal
                    isOpen
                    onClose={() => setAddOpen(false)}
                    initialValues={initialValues}
                    onSuccess={() => {
                        setAddOpen(false);
                        refresh();
                        showSuccess('Klient dodany', `Adres ${email} jest już w kartotece`);
                    }}
                />
            )}
        </>,
        document.body
    );
}
