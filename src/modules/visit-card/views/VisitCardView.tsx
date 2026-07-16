// src/modules/visit-card/views/VisitCardView.tsx
//
// Public, customer-facing Visit Card page (route /vc/:token — no login).
// Mobile-first: the customer opens this from an SMS/e-mail link, usually on a phone.
// Dark, premium look consistent with the studio-facing hero styling.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { visitCardApi } from '../api/visitCardApi';
import type { VisitCard, VisitCardPaymentStatus, VisitCardStatus } from '../types';

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const STATUS_CONFIG: Record<VisitCardStatus, { label: string; color: string; bg: string; dot: string }> = {
    DRAFT:            { label: 'Przyjęcie w toku',  color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.14)', dot: '#f59e0b' },
    IN_PROGRESS:      { label: 'W realizacji',      color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.14)', dot: '#10b981' },
    READY_FOR_PICKUP: { label: 'Gotowy do odbioru', color: '#7dd3fc', bg: 'rgba(14, 165, 233, 0.14)', dot: '#0ea5e9' },
    COMPLETED:        { label: 'Zakończona',        color: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.14)', dot: '#94a3b8' },
    REJECTED:         { label: 'Anulowana',         color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.14)',  dot: '#ef4444' },
    ARCHIVED:         { label: 'Zakończona',        color: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.14)', dot: '#94a3b8' },
};

const PAYMENT_CONFIG: Record<VisitCardPaymentStatus, { label: string; color: string; bg: string }> = {
    PAID:    { label: 'Opłacona',                 color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.14)' },
    PENDING: { label: 'Oczekuje na płatność',     color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.14)' },
    OVERDUE: { label: 'Płatność przeterminowana', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.14)'  },
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(14, 165, 233, 0.13), transparent),
        linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
    color: #e2e8f0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
`;

const Shell = styled.div`
    max-width: 720px;
    margin: 0 auto;
    padding: 0 16px 48px;

    @media (min-width: 640px) {
        padding: 0 24px 64px;
    }
`;

/* ── Hero ── */

const Hero = styled.header`
    position: relative;
    overflow: hidden;
    color: #fff;
    padding: 30px 16px 26px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    &::before {
        content: '';
        position: absolute;
        top: -140px;
        right: -80px;
        width: 380px;
        height: 380px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, transparent 62%);
        pointer-events: none;
    }

    @media (min-width: 640px) {
        padding: 40px 24px 34px;
    }
`;

const HeroInner = styled.div`
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
`;

const CompanyRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
`;

const CompanyLogo = styled.img`
    height: 40px;
    max-width: 140px;
    object-fit: contain;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    padding: 3px 6px;
`;

const CompanyName = styled.div`
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #f1f5f9;
`;

const Eyebrow = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #7dd3fc;
    margin-bottom: 8px;
`;

const HeroTitle = styled.h1`
    margin: 0 0 6px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.2;
    color: #fff;

    @media (min-width: 640px) { font-size: 32px; }
`;

const HeroSub = styled.div`
    font-size: 14px;
    color: rgba(203, 213, 225, 0.72);
    max-width: 440px;
`;

const StatusBadge = styled.span<{ $color: string; $bg: string; $dot: string }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 7px 15px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.$color};
    background: ${p => p.$bg};
    border: 1px solid ${p => p.$bg.replace('0.14', '0.3')};

    &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${p => p.$dot};
        box-shadow: 0 0 8px ${p => p.$dot};
    }
`;

/* ── Cards ── */

const Card = styled.section`
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 18px 16px;
    margin-top: 16px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 8px 24px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(6px);

    @media (min-width: 640px) {
        padding: 22px 24px;
    }
`;

const CardTitle = styled.h2`
    margin: 0 0 14px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #7dd3fc;
`;

const InfoGrid = styled.dl`
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px 20px;
    margin: 0;

    @media (min-width: 480px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const InfoItem = styled.div``;

const InfoLabel = styled.dt`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.85);
    font-weight: 600;
    margin-bottom: 2px;
`;

const InfoValue = styled.dd`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #f1f5f9;
    overflow-wrap: anywhere;
`;

const Plate = styled.span`
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #f8fafc;
`;

/* ── Services ── */

const ServiceList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const ServiceRow = styled.li`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    &:last-child { border-bottom: none; }
`;

const ServiceName = styled.div`
    font-size: 14.5px;
    font-weight: 600;
    color: #f1f5f9;
`;

const ServiceNote = styled.div`
    font-size: 12.5px;
    color: rgba(148, 163, 184, 0.9);
    margin-top: 2px;
`;

const ServicePrices = styled.div`
    text-align: right;
    flex-shrink: 0;
`;

const ServicePriceGross = styled.div`
    font-size: 14.5px;
    font-weight: 700;
    color: #f1f5f9;
    white-space: nowrap;
`;

const ServicePriceNet = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.9);
    white-space: nowrap;
    margin-top: 1px;
`;

const TotalRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 12px;
    padding-top: 14px;
    border-top: 1px solid rgba(125, 211, 252, 0.35);
`;

const TotalLabel = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
`;

const TotalHint = styled.div`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.9);
    font-weight: 500;
    margin-top: 2px;
`;

const TotalValue = styled.div`
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.3px;
    color: #7dd3fc;
`;

/* ── Timeline ── */

const Timeline = styled.ol`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const TimelineItem = styled.li<{ $done: boolean }>`
    position: relative;
    padding: 0 0 18px 26px;

    &::before {
        content: '';
        position: absolute;
        left: 6px;
        top: 18px;
        bottom: 0;
        width: 2px;
        background: ${p => (p.$done ? '#10b981' : 'rgba(255, 255, 255, 0.1)')};
    }

    &:last-child { padding-bottom: 0; }
    &:last-child::before { display: none; }

    &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 4px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${p => (p.$done ? '#10b981' : '#0f172a')};
        border: 2px solid ${p => (p.$done ? '#10b981' : 'rgba(148, 163, 184, 0.4)')};
        ${p => p.$done && 'box-shadow: 0 0 10px rgba(16, 185, 129, 0.45);'}
    }
`;

const TimelineLabel = styled.div<{ $done: boolean }>`
    font-size: 14px;
    font-weight: 700;
    color: ${p => (p.$done ? '#f1f5f9' : 'rgba(148, 163, 184, 0.6)')};
`;

const TimelineDate = styled.div`
    font-size: 12.5px;
    color: rgba(148, 163, 184, 0.9);
    margin-top: 1px;
`;

/* ── Photos ── */

const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const PhotoThumb = styled.a`
    display: block;
    aspect-ratio: 1;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 200ms ease, opacity 200ms ease;
    }

    &:hover img { transform: scale(1.04); opacity: 0.9; }
`;

/* ── Documents / consents ── */

const DocList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const DocRow = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    &:last-child { border-bottom: none; }

    svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: #38bdf8;
    }
`;

const DocInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
    overflow-wrap: anywhere;
`;

const DocMeta = styled.div`
    font-size: 12px;
    color: rgba(148, 163, 184, 0.85);
    margin-top: 1px;
`;

const DocLink = styled.a`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 700;
    color: #7dd3fc;
    text-decoration: none;
    padding: 6px 14px;
    border: 1px solid rgba(14, 165, 233, 0.35);
    border-radius: 9999px;
    white-space: nowrap;
    transition: all 160ms ease;

    &:hover {
        background: rgba(14, 165, 233, 0.12);
        border-color: rgba(14, 165, 233, 0.6);
    }
`;

/* ── Contact ── */

const ContactList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const ContactRow = styled.a`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14.5px;
    font-weight: 600;
    color: #e2e8f0;
    text-decoration: none;
    overflow-wrap: anywhere;
    transition: color 160ms ease;

    svg {
        width: 17px;
        height: 17px;
        flex-shrink: 0;
        color: #38bdf8;
    }

    &[href]:hover { color: #7dd3fc; }
`;

const PaymentBadge = styled.span<{ $color: string; $bg: string }>`
    display: inline-block;
    padding: 7px 15px;
    border-radius: 9999px;
    font-size: 13.5px;
    font-weight: 700;
    color: ${p => p.$color};
    background: ${p => p.$bg};
    border: 1px solid ${p => p.$bg.replace('0.14', '0.3')};
`;

const Footer = styled.footer`
    margin-top: 28px;
    text-align: center;
    font-size: 12px;
    color: rgba(100, 116, 139, 0.9);
`;

const EmptyText = styled.div`
    font-size: 14px;
    color: rgba(148, 163, 184, 0.9);
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
    gap: 14px;
    padding: 24px;
    text-align: center;
    background: linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
`;

const Spinner = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.12);
    border-top-color: #38bdf8;
    animation: ${spin} 0.8s linear infinite;
`;

const StateTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: #f1f5f9;
`;

const StateText = styled.div`
    font-size: 14px;
    color: rgba(148, 163, 184, 0.9);
    max-width: 340px;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const VisitCardView = () => {
    const { token } = useParams<{ token: string }>();
    const [card, setCard] = useState<VisitCard | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        visitCardApi.getPublicCard(token)
            .then(data => { if (!cancelled) setCard(data); })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => {
        if (card) document.title = `Karta wizyty ${card.visitNumber} — ${card.company.name}`;
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

    const status = STATUS_CONFIG[card.status] ?? STATUS_CONFIG.IN_PROGRESS;
    const greetingName = card.customer.firstName;
    const vehicleLabel = `${card.vehicle.brand} ${card.vehicle.model}`;
    const { inProgress, completion, company } = card;

    const addressLine = [company.street, [company.postalCode, company.city].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ');

    const websiteHref = company.website
        ? (company.website.startsWith('http') ? company.website : `https://${company.website}`)
        : null;

    return (
        <Page>
            <Hero>
                <HeroInner>
                    <CompanyRow>
                        {company.logoUrl && <CompanyLogo src={company.logoUrl} alt={company.name} />}
                        <CompanyName>{company.name}</CompanyName>
                    </CompanyRow>
                    <Eyebrow>Karta wizyty {card.visitNumber}</Eyebrow>
                    <HeroTitle>{card.title || vehicleLabel}</HeroTitle>
                    <HeroSub>
                        {greetingName ? `${greetingName}, tutaj` : 'Tutaj'} znajdziesz wszystkie
                        informacje o wizycie Twojego pojazdu.
                    </HeroSub>
                    <StatusBadge $color={status.color} $bg={status.bg} $dot={status.dot}>
                        {status.label}
                    </StatusBadge>
                </HeroInner>
            </Hero>

            <Shell>
                {/* ── Rezerwacja ── */}
                <Card>
                    <CardTitle>Rezerwacja</CardTitle>
                    <InfoGrid>
                        <InfoItem>
                            <InfoLabel>Termin wizyty</InfoLabel>
                            <InfoValue>{formatDateTime(card.reservation.scheduledDate)}</InfoValue>
                        </InfoItem>
                        {card.reservation.estimatedCompletionDate && (
                            <InfoItem>
                                <InfoLabel>Planowane zakończenie</InfoLabel>
                                <InfoValue>{formatDateTime(card.reservation.estimatedCompletionDate)}</InfoValue>
                            </InfoItem>
                        )}
                        <InfoItem>
                            <InfoLabel>Numer wizyty</InfoLabel>
                            <InfoValue>{card.visitNumber}</InfoValue>
                        </InfoItem>
                    </InfoGrid>
                </Card>

                {/* ── Pojazd ── */}
                <Card>
                    <CardTitle>Pojazd</CardTitle>
                    <InfoGrid>
                        <InfoItem>
                            <InfoLabel>Marka i model</InfoLabel>
                            <InfoValue>{vehicleLabel}</InfoValue>
                        </InfoItem>
                        {card.vehicle.licensePlate && (
                            <InfoItem>
                                <InfoLabel>Numer rejestracyjny</InfoLabel>
                                <InfoValue><Plate>{card.vehicle.licensePlate}</Plate></InfoValue>
                            </InfoItem>
                        )}
                        {card.vehicle.yearOfProduction != null && (
                            <InfoItem>
                                <InfoLabel>Rok produkcji</InfoLabel>
                                <InfoValue>{card.vehicle.yearOfProduction}</InfoValue>
                            </InfoItem>
                        )}
                        {card.vehicle.color && (
                            <InfoItem>
                                <InfoLabel>Kolor</InfoLabel>
                                <InfoValue>{card.vehicle.color}</InfoValue>
                            </InfoItem>
                        )}
                    </InfoGrid>
                </Card>

                {/* ── Przebieg wizyty ── */}
                <Card>
                    <CardTitle>Przebieg wizyty</CardTitle>
                    <Timeline>
                        <TimelineItem $done={!!inProgress}>
                            <TimelineLabel $done={!!inProgress}>Przyjęcie pojazdu</TimelineLabel>
                            <TimelineDate>
                                {inProgress
                                    ? formatDateTime(inProgress.admissionDate)
                                    : formatDateTime(card.reservation.scheduledDate)}
                            </TimelineDate>
                        </TimelineItem>
                        <TimelineItem $done={!!completion?.readyForPickupDate}>
                            <TimelineLabel $done={!!completion?.readyForPickupDate}>Prace zakończone</TimelineLabel>
                            <TimelineDate>
                                {completion?.readyForPickupDate
                                    ? formatDateTime(completion.readyForPickupDate)
                                    : card.reservation.estimatedCompletionDate
                                        ? `planowo ${formatDateTime(card.reservation.estimatedCompletionDate)}`
                                        : 'w trakcie ustalania'}
                            </TimelineDate>
                        </TimelineItem>
                        <TimelineItem $done={!!completion?.pickupDate}>
                            <TimelineLabel $done={!!completion?.pickupDate}>Odbiór pojazdu</TimelineLabel>
                            <TimelineDate>
                                {completion?.pickupDate ? formatDateTime(completion.pickupDate) : '—'}
                            </TimelineDate>
                        </TimelineItem>
                    </Timeline>
                </Card>

                {/* ── Usługi i wycena ── */}
                <Card>
                    <CardTitle>Zakres usług i wycena</CardTitle>
                    {card.services.length === 0 ? (
                        <EmptyText>Zakres usług jest w trakcie ustalania.</EmptyText>
                    ) : (
                        <>
                            <ServiceList>
                                {card.services.map((service, idx) => (
                                    <ServiceRow key={idx}>
                                        <div>
                                            <ServiceName>{service.name}</ServiceName>
                                            {service.note && <ServiceNote>{service.note}</ServiceNote>}
                                        </div>
                                        <ServicePrices>
                                            <ServicePriceGross>{formatPln(service.priceGross)} brutto</ServicePriceGross>
                                            <ServicePriceNet>{formatPln(service.priceNet)} netto</ServicePriceNet>
                                        </ServicePrices>
                                    </ServiceRow>
                                ))}
                            </ServiceList>
                            <TotalRow>
                                <div>
                                    <TotalLabel>Razem</TotalLabel>
                                    <TotalHint>netto {formatPln(card.totals.totalNet)}</TotalHint>
                                </div>
                                <TotalValue>{formatPln(card.totals.totalGross)}</TotalValue>
                            </TotalRow>
                        </>
                    )}
                </Card>

                {/* ── Podpisane zgody (po rozpoczęciu) ── */}
                {inProgress && inProgress.signedConsents.length > 0 && (
                    <Card>
                        <CardTitle>Podpisane dokumenty i zgody</CardTitle>
                        <DocList>
                            {inProgress.signedConsents.map((consent, idx) => (
                                <DocRow key={idx}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    <DocInfo>
                                        <DocName>{consent.name}</DocName>
                                        <DocMeta>podpisano {formatDateTime(consent.signedAt)}</DocMeta>
                                    </DocInfo>
                                    {consent.downloadUrl && (
                                        <DocLink href={consent.downloadUrl} target="_blank" rel="noopener noreferrer">
                                            Pobierz
                                        </DocLink>
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
                            <DocList style={{ marginTop: inProgress.photos.length > 0 ? 14 : 0 }}>
                                <DocRow>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <DocInfo>
                                        <DocName>Protokół szkód</DocName>
                                        <DocMeta>stan pojazdu odnotowany przy przyjęciu</DocMeta>
                                    </DocInfo>
                                    <DocLink href={inProgress.damageMapUrl} target="_blank" rel="noopener noreferrer">
                                        Zobacz
                                    </DocLink>
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
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <DocInfo>
                                        <DocName>{doc.name || doc.fileName}</DocName>
                                        <DocMeta>dodano {formatDate(doc.uploadedAt)}</DocMeta>
                                    </DocInfo>
                                    {doc.downloadUrl && (
                                        <DocLink href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                                            Pobierz
                                        </DocLink>
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
                        <PaymentBadge
                            $color={PAYMENT_CONFIG[completion.paymentStatus].color}
                            $bg={PAYMENT_CONFIG[completion.paymentStatus].bg}
                        >
                            {PAYMENT_CONFIG[completion.paymentStatus].label}
                        </PaymentBadge>
                    </Card>
                )}

                {/* ── Kontakt ── */}
                <Card>
                    <CardTitle>Kontakt i adres</CardTitle>
                    <ContactList>
                        {addressLine && (
                            <ContactRow
                                as="a"
                                href={`https://maps.google.com/?q=${encodeURIComponent(`${company.name}, ${addressLine}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                {addressLine}
                            </ContactRow>
                        )}
                        {company.phone && (
                            <ContactRow href={`tel:${company.phone.replace(/\s/g, '')}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                                </svg>
                                {company.phone}
                            </ContactRow>
                        )}
                        {company.email && (
                            <ContactRow href={`mailto:${company.email}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {company.email}
                            </ContactRow>
                        )}
                        {websiteHref && (
                            <ContactRow href={websiteHref} target="_blank" rel="noopener noreferrer">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                </svg>
                                {company.website}
                            </ContactRow>
                        )}
                    </ContactList>
                </Card>

                <Footer>
                    Karta wizyty ma charakter informacyjny.
                    W razie pytań skontaktuj się bezpośrednio z {company.name || 'serwisem'}.
                </Footer>
            </Shell>
        </Page>
    );
};
