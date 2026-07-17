// src/modules/visit-card/views/VisitCardView.tsx
//
// Public, customer-facing Visit Card page (route /vc/:token — no login).
//
// Design language: a functional, informational status page — neutral light
// background, white bordered cards, compact label/value rows, one restrained
// accent. Reads like a parcel-tracking / booking-status page, not a letter.
// Mobile-first: customers open this from an SMS/e-mail link.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { visitCardApi } from '../api/visitCardApi';
import type {
    VisitCard,
    VisitCardPaymentStatus,
    VisitCardStatus,
    VisitCardUpsellSuggestion,
} from '../types';

// ─── Palette ──────────────────────────────────────────────────────────────────

const BG = '#f1f3f6';
const CARD = '#ffffff';
const BORDER = '#e4e7ec';
const INK = '#101828';
const MUTED = '#667085';
const FAINT = '#98a2b3';
const ACCENT = '#1d4ed8';        // single functional blue — links & primary action
const ACCENT_DARK = '#1e40af';
const OK = '#067647';            // done states
const OK_BG = '#ecfdf3';

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const STATUS_LABEL: Record<VisitCardStatus, string> = {
    RESERVATION:      'Rezerwacja potwierdzona',
    DRAFT:            'Przyjęcie w toku',
    IN_PROGRESS:      'W realizacji',
    READY_FOR_PICKUP: 'Gotowy do odbioru',
    COMPLETED:        'Zakończona',
    REJECTED:         'Anulowana',
    ARCHIVED:         'Zakończona',
};

const PAYMENT_LABEL: Record<VisitCardPaymentStatus, string> = {
    PAID:    'Opłacona',
    PENDING: 'Oczekuje na płatność',
    OVERDUE: 'Płatność przeterminowana',
};

// ─── Base layout ──────────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${BG};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
`;

const Shell = styled.div`
    max-width: 680px;
    margin: 0 auto;
    padding: 16px 12px 48px;

    @media (min-width: 640px) {
        padding: 28px 20px 64px;
    }
`;

/* ── Cards ── */

const Card = styled.section`
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;

    @media (min-width: 640px) {
        padding: 20px;
    }
`;

const CardTitle = styled.h2`
    margin: 0 0 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${FAINT};
`;

/* ── Header card ── */

const HeaderCard = styled(Card)`
    padding-bottom: 0;

    @media (min-width: 640px) { padding-bottom: 0; }
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const CompanyIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
`;

const CompanyLogo = styled.img`
    height: 34px;
    max-width: 130px;
    object-fit: contain;
    flex-shrink: 0;
`;

const CompanyMark = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${INK};
`;

/** Address + contact details right under the company name. */
const CompanyContact = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    margin-top: 8px;
    font-size: 12.5px;
    color: ${MUTED};

    a {
        color: ${MUTED};
        text-decoration: none;
        &:hover { color: ${ACCENT}; text-decoration: underline; }
    }
`;

const StatusPill = styled.div<{ $tone: 'active' | 'done' | 'muted' }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 600;
    white-space: nowrap;
    background: ${p => (p.$tone === 'done' ? OK_BG : p.$tone === 'active' ? '#eff4ff' : '#f2f4f7')};
    color: ${p => (p.$tone === 'done' ? OK : p.$tone === 'active' ? ACCENT_DARK : MUTED)};

    &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
    }
`;

const HeaderTitleRow = styled.div`
    margin-top: 14px;
`;

const PageKicker = styled.div`
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${FAINT};
`;

const PageTitle = styled.h1`
    margin: 2px 0 0;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${INK};
`;

/** Key facts strip at the bottom of the header card. */
const KeyFacts = styled.dl`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0;
    margin: 16px -16px 0;
    padding: 0;
    border-top: 1px solid ${BORDER};

    @media (min-width: 640px) { margin: 18px -20px 0; }
`;

const KeyFact = styled.div`
    padding: 10px 16px;
    border-right: 1px solid ${BORDER};

    &:last-child { border-right: none; }

    @media (min-width: 640px) { padding: 12px 20px; }
`;

const KeyFactLabel = styled.dt`
    font-size: 11.5px;
    color: ${FAINT};
`;

const KeyFactValue = styled.dd`
    margin: 1px 0 0;
    font-size: 13.5px;
    font-weight: 600;
    color: ${INK};
    overflow-wrap: anywhere;
`;

/* ── Label/value rows ── */

const InfoTable = styled.dl`
    margin: 0;
`;

const InfoRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #f2f4f7;

    &:last-child { border-bottom: none; padding-bottom: 0; }
    &:first-child { padding-top: 0; }
`;

const InfoLabel = styled.dt`
    flex-shrink: 0;
    font-size: 13.5px;
    color: ${MUTED};
`;

const InfoValue = styled.dd`
    margin: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: ${INK};
    text-align: right;
    overflow-wrap: anywhere;
`;

/* ── Services table ── */

const ServiceTable = styled.div``;

const ServiceHead = styled.div`
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px 16px;
    padding-bottom: 6px;
    border-bottom: 1px solid ${BORDER};
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${FAINT};

    span:nth-child(2), span:nth-child(3) { text-align: right; }

    @media (max-width: 479px) {
        grid-template-columns: 1fr auto;
        span:nth-child(2) { display: none; }
    }
`;

const ServiceRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1px 16px;
    align-items: baseline;
    padding: 9px 0;
    border-bottom: 1px solid #f2f4f7;

    @media (max-width: 479px) {
        grid-template-columns: 1fr auto;
    }
`;

const ServiceName = styled.div`
    font-size: 13.5px;
    font-weight: 500;
    color: ${INK};
`;

const ServiceNote = styled.div`
    grid-column: 1;
    font-size: 12.5px;
    color: ${MUTED};
`;

const PriceNet = styled.div`
    grid-row: 1;
    grid-column: 2;
    font-size: 13px;
    color: ${MUTED};
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    @media (max-width: 479px) {
        grid-row: 2;
        grid-column: 2;
        font-size: 12px;
    }
`;

const PriceGross = styled.div`
    grid-row: 1;
    grid-column: 3;
    font-size: 13.5px;
    font-weight: 600;
    color: ${INK};
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    @media (max-width: 479px) {
        grid-column: 2;
    }
`;

const MobilePriceCaption = styled.span`
    display: none;
    @media (max-width: 479px) { display: inline; }
`;

const TotalBlock = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin: 10px -16px -16px;
    padding: 12px 16px;
    background: #f8fafc;
    border-top: 1px solid ${BORDER};
    border-radius: 0 0 11px 11px;

    @media (min-width: 640px) {
        margin: 12px -20px -20px;
        padding: 12px 20px;
    }
`;

const TotalLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${INK};
`;

const TotalNet = styled.div`
    font-size: 12px;
    color: ${MUTED};
`;

const TotalGross = styled.div`
    font-size: 18px;
    font-weight: 700;
    color: ${INK};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

/* ── Photos ── */

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const PhotoThumb = styled.a`
    display: block;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    background: #f2f4f7;
    border: 1px solid ${BORDER};

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 160ms ease;
    }

    &:hover img { opacity: 0.85; }
`;

/* ── Document lists ── */

const DocList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const DocRow = styled.li`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #f2f4f7;

    &:first-child { padding-top: 0; }
    &:last-child { border-bottom: none; padding-bottom: 0; }
`;

const DocInfo = styled.div`
    min-width: 0;
`;

const DocName = styled.div`
    font-size: 13.5px;
    font-weight: 500;
    color: ${INK};
    overflow-wrap: anywhere;
`;

const DocMeta = styled.div`
    font-size: 12.5px;
    color: ${MUTED};
`;

const TextLink = styled.a`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${ACCENT};
    text-decoration: none;
    white-space: nowrap;

    &:hover { color: ${ACCENT_DARK}; text-decoration: underline; }
`;

/* ── Upsell (suggested additional services) ── */

const UpsellIntro = styled.p`
    margin: 0 0 10px;
    font-size: 13px;
    color: ${MUTED};
`;

const UpsellRow = styled.label<{ $interactive: boolean }>`
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f2f4f7;
    cursor: ${p => (p.$interactive ? 'pointer' : 'default')};

    &:last-of-type { border-bottom: none; }
`;

const UpsellCheck = styled.input`
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin: 0;
    position: relative;
    top: 2px;
    accent-color: ${ACCENT};
    cursor: pointer;
`;

const UpsellInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const UpsellName = styled.div`
    font-size: 13.5px;
    font-weight: 500;
    color: ${INK};
`;

const UpsellNote = styled.div`
    font-size: 12.5px;
    color: ${MUTED};
`;

const UpsellStateNote = styled.div<{ $done?: boolean }>`
    display: inline-block;
    margin-top: 3px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    background: ${p => (p.$done ? OK_BG : '#f2f4f7')};
    color: ${p => (p.$done ? OK : MUTED)};
`;

const UpsellPrice = styled.div`
    flex-shrink: 0;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

const UpsellPriceGross = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: ${INK};
`;

const UpsellPriceOld = styled.div`
    font-size: 12px;
    color: ${FAINT};
    text-decoration: line-through;
`;

const UpsellActions = styled.div`
    padding-top: 12px;
`;

const UpsellButton = styled.button`
    width: 100%;
    padding: 11px 18px;
    border: none;
    border-radius: 8px;
    background: ${ACCENT};
    color: #fff;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 140ms ease;

    &:hover:not(:disabled) { background: ${ACCENT_DARK}; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (min-width: 640px) { width: auto; }
`;

const UpsellResult = styled.p<{ $ok: boolean }>`
    margin: 10px 0 0;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: ${p => (p.$ok ? OK : '#b42318')};
    background: ${p => (p.$ok ? OK_BG : '#fef3f2')};
`;

/* ── Footer ── */

const PaymentNote = styled.p`
    margin: 0;
    font-size: 13.5px;
    font-weight: 600;
`;

const Footer = styled.footer`
    margin-top: 16px;
    text-align: center;
    font-size: 12px;
    color: ${FAINT};
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${MUTED};
`;

/* ── Loading / error states ── */

const spin = keyframes`to { transform: rotate(360deg); }`;

const CenterState = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
    background: ${BG};
    color: ${INK};
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid ${BORDER};
    border-top-color: ${MUTED};
    animation: ${spin} 0.8s linear infinite;
`;

const StateTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
`;

const StateText = styled.div`
    font-size: 13.5px;
    color: ${MUTED};
    max-width: 340px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

const UPSELL_STATE_LABEL: Record<Exclude<VisitCardUpsellSuggestion['status'], 'SUGGESTED'>, string> = {
    REQUESTED: 'Oczekuje na potwierdzenie SMS',
    CONFIRMED: 'Dodano do wizyty',
};

const statusTone = (status: VisitCardStatus): 'active' | 'done' | 'muted' => {
    switch (status) {
        case 'COMPLETED':
        case 'ARCHIVED':
        case 'READY_FOR_PICKUP':
            return 'done';
        case 'REJECTED':
            return 'muted';
        default:
            return 'active';
    }
};

export const VisitCardView = () => {
    const { token } = useParams<{ token: string }>();
    const [card, setCard] = useState<VisitCard | null>(null);
    const [error, setError] = useState(false);
    const [selectedUpsell, setSelectedUpsell] = useState<Set<string>>(new Set());
    const [upsellSending, setUpsellSending] = useState(false);
    const [upsellResult, setUpsellResult] = useState<{ ok: boolean; message: string } | null>(null);

    const toggleUpsell = (id: string) => {
        setSelectedUpsell(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRequestUpsell = async () => {
        if (!token || selectedUpsell.size === 0) return;
        setUpsellSending(true);
        setUpsellResult(null);
        try {
            const result = await visitCardApi.requestUpsellServices(token, [...selectedUpsell]);
            setUpsellResult({ ok: result.smsSent, message: result.message });
            setSelectedUpsell(new Set());
            setCard(prev => (prev ? { ...prev, upsellSuggestions: result.suggestions } : prev));
        } catch {
            setUpsellResult({
                ok: false,
                message: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie lub skontaktuj się z serwisem.',
            });
        } finally {
            setUpsellSending(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        visitCardApi.getPublicCard(token)
            .then(data => { if (!cancelled) setCard(data); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        if (card) document.title = `Karta wizyty — ${card.company.name}`;
    }, [card]);

    if (!token || error) {
        return (
            <CenterState>
                <StateTitle>Nie znaleziono karty wizyty</StateTitle>
                <StateText>
                    Link jest nieprawidłowy lub wizyta nie jest już dostępna.
                    Skontaktuj się z serwisem, aby otrzymać nowy link.
                </StateText>
            </CenterState>
        );
    }

    if (!card) {
        return (
            <CenterState>
                <Spinner />
                <StateText>Wczytywanie karty wizyty…</StateText>
            </CenterState>
        );
    }

    const vehicleLabel = card.vehicle ? `${card.vehicle.brand} ${card.vehicle.model}` : null;
    const { inProgress, completion, company } = card;

    const addressLine = [company.street, [company.postalCode, company.city].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ');

    const websiteHref = company.website
        ? (company.website.startsWith('http') ? company.website : `https://${company.website}`)
        : null;

    return (
        <Page>
            <Shell>
                {/* ── Header: company, status, key facts ── */}
                <HeaderCard>
                    <HeaderTop>
                        <CompanyIdentity>
                            {company.logoUrl && (
                                <CompanyLogo
                                    src={company.logoUrl}
                                    alt={company.name}
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <CompanyMark>{company.name}</CompanyMark>
                        </CompanyIdentity>
                        <StatusPill $tone={statusTone(card.status)}>
                            {STATUS_LABEL[card.status] ?? card.status}
                        </StatusPill>
                    </HeaderTop>
                    <CompanyContact>
                        {addressLine && (
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(`${company.name}, ${addressLine}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {addressLine}
                            </a>
                        )}
                        {company.phone && (
                            <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a>
                        )}
                        {company.email && (
                            <a href={`mailto:${company.email}`}>{company.email}</a>
                        )}
                        {websiteHref && (
                            <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                                {company.website}
                            </a>
                        )}
                    </CompanyContact>
                    <HeaderTitleRow>
                        <PageKicker>Karta wizyty</PageKicker>
                        <PageTitle>{vehicleLabel ?? 'Rezerwacja'}</PageTitle>
                    </HeaderTitleRow>
                    <KeyFacts>
                        <KeyFact>
                            <KeyFactLabel>Termin wizyty</KeyFactLabel>
                            <KeyFactValue>{formatDateTime(card.reservation.scheduledDate)}</KeyFactValue>
                        </KeyFact>
                        {card.vehicle?.licensePlate && (
                            <KeyFact>
                                <KeyFactLabel>Nr rejestracyjny</KeyFactLabel>
                                <KeyFactValue>{card.vehicle.licensePlate}</KeyFactValue>
                            </KeyFact>
                        )}
                        <KeyFact>
                            <KeyFactLabel>Wartość usług</KeyFactLabel>
                            <KeyFactValue>{formatPln(card.totals.totalGross)} brutto</KeyFactValue>
                        </KeyFact>
                    </KeyFacts>
                </HeaderCard>

                {/* ── Pojazd ── */}
                {card.vehicle && (
                    <Card>
                        <CardTitle>Pojazd</CardTitle>
                        <InfoTable>
                            <InfoRow>
                                <InfoLabel>Marka i model</InfoLabel>
                                <InfoValue>{vehicleLabel}</InfoValue>
                            </InfoRow>
                            {card.vehicle.licensePlate && (
                                <InfoRow>
                                    <InfoLabel>Numer rejestracyjny</InfoLabel>
                                    <InfoValue>{card.vehicle.licensePlate}</InfoValue>
                                </InfoRow>
                            )}
                            {card.vehicle.yearOfProduction != null && (
                                <InfoRow>
                                    <InfoLabel>Rok produkcji</InfoLabel>
                                    <InfoValue>{card.vehicle.yearOfProduction}</InfoValue>
                                </InfoRow>
                            )}
                        </InfoTable>
                    </Card>
                )}

                {/* ── Usługi i wycena ── */}
                <Card>
                    <CardTitle>Zakres usług i wycena</CardTitle>
                    {card.services.length === 0 ? (
                        <EmptyText>Zakres usług jest w trakcie ustalania.</EmptyText>
                    ) : (
                        <ServiceTable>
                            <ServiceHead>
                                <span>Usługa</span>
                                <span>Netto</span>
                                <span>Brutto</span>
                            </ServiceHead>
                            {card.services.map((service, idx) => (
                                <ServiceRow key={idx}>
                                    <ServiceName>{service.name}</ServiceName>
                                    <PriceNet>
                                        {formatPln(service.priceNet)}
                                        <MobilePriceCaption> netto</MobilePriceCaption>
                                    </PriceNet>
                                    <PriceGross>{formatPln(service.priceGross)}</PriceGross>
                                    {service.note && <ServiceNote>{service.note}</ServiceNote>}
                                </ServiceRow>
                            ))}
                            <TotalBlock>
                                <div>
                                    <TotalLabel>Razem brutto</TotalLabel>
                                    <TotalNet>netto {formatPln(card.totals.totalNet)}</TotalNet>
                                </div>
                                <TotalGross>{formatPln(card.totals.totalGross)}</TotalGross>
                            </TotalBlock>
                        </ServiceTable>
                    )}
                </Card>

                {/* ── Sugerowane usługi dodatkowe (upselling) ── */}
                {card.upsellSuggestions.length > 0 && (
                    <Card>
                        <CardTitle>Polecane usługi dodatkowe</CardTitle>
                        <UpsellIntro>
                            Zaznacz usługi, które chcesz dodać do rezerwacji — wyślemy SMS
                            z prośbą o potwierdzenie przed doliczeniem czegokolwiek.
                        </UpsellIntro>

                        {card.upsellSuggestions.map(suggestion => {
                            const selectable = suggestion.status === 'SUGGESTED';
                            return (
                                <UpsellRow key={suggestion.id} $interactive={selectable}>
                                    {selectable && (
                                        <UpsellCheck
                                            type="checkbox"
                                            checked={selectedUpsell.has(suggestion.id)}
                                            onChange={() => toggleUpsell(suggestion.id)}
                                            disabled={upsellSending}
                                        />
                                    )}
                                    <UpsellInfo>
                                        <UpsellName>{suggestion.name}</UpsellName>
                                        {suggestion.note && <UpsellNote>{suggestion.note}</UpsellNote>}
                                        {suggestion.status !== 'SUGGESTED' && (
                                            <UpsellStateNote $done={suggestion.status === 'CONFIRMED'}>
                                                {UPSELL_STATE_LABEL[suggestion.status]}
                                            </UpsellStateNote>
                                        )}
                                    </UpsellInfo>
                                    <UpsellPrice>
                                        <UpsellPriceGross>{formatPln(suggestion.priceGross)}</UpsellPriceGross>
                                        {suggestion.originalPriceGross != null && (
                                            <UpsellPriceOld>{formatPln(suggestion.originalPriceGross)}</UpsellPriceOld>
                                        )}
                                    </UpsellPrice>
                                </UpsellRow>
                            );
                        })}

                        {card.upsellSuggestions.some(s => s.status === 'SUGGESTED') && (
                            <UpsellActions>
                                <UpsellButton
                                    onClick={handleRequestUpsell}
                                    disabled={selectedUpsell.size === 0 || upsellSending}
                                >
                                    {upsellSending
                                        ? 'Wysyłanie…'
                                        : selectedUpsell.size > 1
                                            ? `Dodaj wybrane usługi (${selectedUpsell.size})`
                                            : 'Dodaj wybraną usługę'}
                                </UpsellButton>
                            </UpsellActions>
                        )}

                        {upsellResult && (
                            <UpsellResult $ok={upsellResult.ok}>{upsellResult.message}</UpsellResult>
                        )}
                    </Card>
                )}

                {/* ── Podpisane zgody (po rozpoczęciu) ── */}
                {inProgress && inProgress.signedConsents.length > 0 && (
                    <Card>
                        <CardTitle>Protokoły i dokumenty</CardTitle>
                        <DocList>
                            {inProgress.signedConsents.map((consent, idx) => (
                                <DocRow key={idx}>
                                    <DocInfo>
                                        <DocName>{consent.name}</DocName>
                                        {consent.signedAt
                                            ? <DocMeta>podpisano {formatDateTime(consent.signedAt)}</DocMeta>
                                            : <DocMeta>do podpisu</DocMeta>
                                        }
                                    </DocInfo>
                                    {consent.downloadUrl && (
                                        <TextLink href={consent.downloadUrl} target="_blank" rel="noopener noreferrer">
                                            Pobierz
                                        </TextLink>
                                    )}
                                </DocRow>
                            ))}
                        </DocList>
                    </Card>
                )}

                {/* ── Zdjęcia i protokół szkód (po rozpoczęciu) ── */}
                {inProgress && (inProgress.photos.length > 0 || inProgress.damageMapUrl) && (
                    <Card>
                        <CardTitle>Dokumentacja zdjęciowa</CardTitle>
                        {inProgress.photos.length > 0 && (
                            <PhotoGrid>
                                {inProgress.photos.map((photo, idx) => (
                                    <PhotoThumb
                                        key={idx}
                                        href={photo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={photo.description ?? undefined}
                                    >
                                        <img src={photo.url} alt={photo.description ?? `Zdjęcie ${idx + 1}`} loading="lazy" />
                                    </PhotoThumb>
                                ))}
                            </PhotoGrid>
                        )}
                        {inProgress.damageMapUrl && (
                            <DocList style={{ marginTop: inProgress.photos.length > 0 ? 10 : 0 }}>
                                <DocRow>
                                    <DocInfo>
                                        <DocName>Protokół szkód</DocName>
                                        <DocMeta>stan pojazdu odnotowany przy przyjęciu</DocMeta>
                                    </DocInfo>
                                    <TextLink href={inProgress.damageMapUrl} target="_blank" rel="noopener noreferrer">
                                        Zobacz
                                    </TextLink>
                                </DocRow>
                            </DocList>
                        )}
                    </Card>
                )}

                {/* ── Dokumenty (po zakończeniu) ── */}
                {completion && completion.documents.length > 0 && (
                    <Card>
                        <CardTitle>Dodatkowe dokumenty</CardTitle>
                        <DocList>
                            {completion.documents.map((doc, idx) => (
                                <DocRow key={idx}>
                                    <DocInfo>
                                        <DocName>{doc.name || doc.fileName}</DocName>
                                        <DocMeta>dodano {formatDate(doc.uploadedAt)}</DocMeta>
                                    </DocInfo>
                                    {doc.downloadUrl && (
                                        <TextLink href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                                            Pobierz
                                        </TextLink>
                                    )}
                                </DocRow>
                            ))}
                        </DocList>
                    </Card>
                )}

                {/* ── Płatność (po zakończeniu) ── */}
                {completion?.paymentStatus && (
                    <Card>
                        <CardTitle>Płatność</CardTitle>
                        <PaymentNote>{PAYMENT_LABEL[completion.paymentStatus]}</PaymentNote>
                    </Card>
                )}

                <Footer>
                    Karta wizyty ma charakter informacyjny.
                    W razie pytań prosimy o kontakt z {company.name || 'serwisem'}.
                </Footer>
            </Shell>
        </Page>
    );
};
