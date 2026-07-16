// src/modules/visit-card/views/VisitCardView.tsx
//
// Public, customer-facing Visit Card page (route /vc/:token — no login).
//
// Design language: a calm, editorial document — warm paper background,
// serif display headings, hairline rules instead of boxed cards, a single
// muted accent color. Reads like a well-set invoice or invitation, not a
// dashboard. Mobile-first: customers open this from an SMS/e-mail link.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { visitCardApi } from '../api/visitCardApi';
import type { VisitCard, VisitCardPaymentStatus, VisitCardStatus } from '../types';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Warm paper + ink + one muted accent. No gradients, no glow.

const PAPER = '#f6f4ef';
const INK = '#22211d';
const INK_SOFT = '#6e6a60';
const INK_FAINT = '#98938a';
const RULE = '#e0dcd2';
const ACCENT = '#41604f'; // muted forest green — used sparingly for links & emphasis

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

const STATUS_LABEL: Record<VisitCardStatus, string> = {
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
    background: ${PAPER};
    color: ${INK};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
`;

const Shell = styled.div`
    max-width: 640px;
    margin: 0 auto;
    padding: 40px 20px 72px;

    @media (min-width: 640px) {
        padding: 56px 24px 96px;
    }
`;

/* ── Masthead ── */

const Masthead = styled.header`
    padding-bottom: 28px;
    border-bottom: 1px solid ${INK};
`;

const CompanyLine = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
`;

const CompanyLogo = styled.img`
    height: 32px;
    max-width: 120px;
    object-fit: contain;
`;

const CompanyMark = styled.div`
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${INK_SOFT};
`;

const Overline = styled.div`
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${INK_FAINT};
    margin-bottom: 10px;
`;

const DocTitle = styled.h1`
    margin: 0 0 10px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 30px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.18;
    color: ${INK};

    @media (min-width: 640px) { font-size: 36px; }
`;

const Lede = styled.p`
    margin: 0;
    font-size: 15px;
    color: ${INK_SOFT};
    max-width: 46ch;
`;

const StatusLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
    font-size: 13px;
    font-weight: 600;
    color: ${INK};

    &::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${ACCENT};
    }
`;

/* ── Sections ── */

const Section = styled.section`
    padding: 30px 0 6px;
    border-bottom: 1px solid ${RULE};

    &:last-of-type { border-bottom: none; }
`;

const SectionTitle = styled.h2`
    margin: 0 0 18px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${INK_FAINT};
`;

const SectionBody = styled.div`
    padding-bottom: 24px;
`;

/* ── Fact grid ── */

const FactGrid = styled.dl`
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px 32px;
    margin: 0;

    @media (min-width: 480px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const Fact = styled.div``;

const FactLabel = styled.dt`
    font-size: 12.5px;
    color: ${INK_SOFT};
    margin-bottom: 1px;
`;

const FactValue = styled.dd`
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: ${INK};
    overflow-wrap: anywhere;
`;

/* ── Services (invoice-style table) ── */

const ServiceTable = styled.div``;

const ServiceHead = styled.div`
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 8px 20px;
    padding-bottom: 8px;
    border-bottom: 1px solid ${RULE};
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${INK_FAINT};

    span:nth-child(2), span:nth-child(3) { text-align: right; }

    @media (max-width: 479px) {
        grid-template-columns: 1fr auto;
        span:nth-child(2) { display: none; }
    }
`;

const ServiceRow = styled.div`
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 2px 20px;
    align-items: baseline;
    padding: 12px 0;
    border-bottom: 1px solid ${RULE};

    @media (max-width: 479px) {
        grid-template-columns: 1fr auto;
    }
`;

const ServiceName = styled.div`
    font-size: 15px;
    font-weight: 500;
    color: ${INK};
`;

const ServiceNote = styled.div`
    grid-column: 1;
    font-size: 13px;
    color: ${INK_SOFT};
`;

const PriceNet = styled.div`
    grid-row: 1;
    grid-column: 2;
    font-size: 14px;
    color: ${INK_SOFT};
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    @media (max-width: 479px) {
        grid-row: 2;
        grid-column: 2;
        font-size: 12.5px;
    }
`;

const PriceGross = styled.div`
    grid-row: 1;
    grid-column: 3;
    font-size: 15px;
    font-weight: 500;
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
    align-items: baseline;
    gap: 20px;
    padding-top: 14px;
    margin-top: 2px;
    border-top: 2px solid ${INK};
`;

const TotalLabel = styled.div`
    font-size: 14px;
    font-weight: 600;
`;

const TotalNet = styled.div`
    font-size: 13px;
    color: ${INK_SOFT};
    margin-top: 2px;
`;

const TotalGross = styled.div`
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    color: ${INK};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

/* ── Timeline ── */

const Timeline = styled.ol`
    list-style: none;
    margin: 0;
    padding: 0;
`;

const TimelineItem = styled.li<{ $done: boolean }>`
    position: relative;
    padding: 0 0 20px 24px;

    &::before {
        content: '';
        position: absolute;
        left: 3.5px;
        top: 16px;
        bottom: -2px;
        width: 1px;
        background: ${RULE};
    }

    &:last-child { padding-bottom: 0; }
    &:last-child::before { display: none; }

    &::after {
        content: '';
        position: absolute;
        left: 0;
        top: 7px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${p => (p.$done ? ACCENT : PAPER)};
        border: 1.5px solid ${p => (p.$done ? ACCENT : INK_FAINT)};
    }
`;

const TimelineLabel = styled.div<{ $done: boolean }>`
    font-size: 15px;
    font-weight: ${p => (p.$done ? 600 : 400)};
    color: ${p => (p.$done ? INK : INK_SOFT)};
`;

const TimelineDate = styled.div`
    font-size: 13px;
    color: ${INK_SOFT};
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
    border-radius: 3px;
    background: ${RULE};

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
    gap: 20px;
    padding: 10px 0;
    border-bottom: 1px solid ${RULE};

    &:last-child { border-bottom: none; }
`;

const DocInfo = styled.div`
    min-width: 0;
`;

const DocName = styled.div`
    font-size: 15px;
    font-weight: 500;
    color: ${INK};
    overflow-wrap: anywhere;
`;

const DocMeta = styled.div`
    font-size: 13px;
    color: ${INK_SOFT};
`;

const TextLink = styled.a`
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 500;
    color: ${ACCENT};
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
    white-space: nowrap;

    &:hover { color: #2e4839; }
`;

/* ── Contact ── */

const ContactBlock = styled.address`
    font-style: normal;
`;

const ContactName = styled.div`
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 19px;
    margin-bottom: 6px;
`;

const ContactLine = styled.div`
    font-size: 15px;
    color: ${INK_SOFT};
`;

const ContactLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    margin-top: 14px;
`;

const PaymentNote = styled.p`
    margin: 0;
    font-size: 15px;
    font-weight: 500;
`;

const Footer = styled.footer`
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid ${RULE};
    font-size: 12.5px;
    color: ${INK_FAINT};
`;

const EmptyText = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${INK_SOFT};
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
    background: ${PAPER};
    color: ${INK};
`;

const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid ${RULE};
    border-top-color: ${INK_SOFT};
    animation: ${spin} 0.8s linear infinite;
`;

const StateTitle = styled.div`
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
`;

const StateText = styled.div`
    font-size: 14px;
    color: ${INK_SOFT};
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
            <Shell>
                <Masthead>
                    <CompanyLine>
                        {company.logoUrl
                            ? <CompanyLogo src={company.logoUrl} alt={company.name} />
                            : <CompanyMark>{company.name}</CompanyMark>}
                    </CompanyLine>
                    <Overline>Karta wizyty</Overline>
                    <DocTitle>{vehicleLabel}</DocTitle>
                    <Lede>
                        {greetingName ? `${greetingName}, na` : 'Na'} tej stronie znajdziesz
                        wszystkie informacje o wizycie Twojego pojazdu — od rezerwacji po odbiór.
                    </Lede>
                    <StatusLine>{STATUS_LABEL[card.status] ?? card.status}</StatusLine>
                </Masthead>

                {/* ── Rezerwacja ── */}
                <Section>
                    <SectionTitle>Rezerwacja</SectionTitle>
                    <SectionBody>
                        <FactGrid>
                            <Fact>
                                <FactLabel>Termin wizyty</FactLabel>
                                <FactValue>{formatDateTime(card.reservation.scheduledDate)}</FactValue>
                            </Fact>
                        </FactGrid>
                    </SectionBody>
                </Section>

                {/* ── Pojazd ── */}
                <Section>
                    <SectionTitle>Pojazd</SectionTitle>
                    <SectionBody>
                        <FactGrid>
                            <Fact>
                                <FactLabel>Marka i model</FactLabel>
                                <FactValue>{vehicleLabel}</FactValue>
                            </Fact>
                            {card.vehicle.licensePlate && (
                                <Fact>
                                    <FactLabel>Numer rejestracyjny</FactLabel>
                                    <FactValue>{card.vehicle.licensePlate}</FactValue>
                                </Fact>
                            )}
                            {card.vehicle.yearOfProduction != null && (
                                <Fact>
                                    <FactLabel>Rok produkcji</FactLabel>
                                    <FactValue>{card.vehicle.yearOfProduction}</FactValue>
                                </Fact>
                            )}
                        </FactGrid>
                    </SectionBody>
                </Section>

                {/* ── Przebieg wizyty ── */}
                <Section>
                    <SectionTitle>Przebieg wizyty</SectionTitle>
                    <SectionBody>
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
                    </SectionBody>
                </Section>

                {/* ── Usługi i wycena ── */}
                <Section>
                    <SectionTitle>Zakres usług i wycena</SectionTitle>
                    <SectionBody>
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
                    </SectionBody>
                </Section>

                {/* ── Podpisane zgody (po rozpoczęciu) ── */}
                {inProgress && inProgress.signedConsents.length > 0 && (
                    <Section>
                        <SectionTitle>Protokoły i dokumenty</SectionTitle>
                        <SectionBody>
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
                        </SectionBody>
                    </Section>
                )}

                {/* ── Zdjęcia i protokół szkód (po rozpoczęciu) ── */}
                {inProgress && (inProgress.photos.length > 0 || inProgress.damageMapUrl) && (
                    <Section>
                        <SectionTitle>Dokumentacja zdjęciowa</SectionTitle>
                        <SectionBody>
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
                                <DocList style={{ marginTop: inProgress.photos.length > 0 ? 12 : 0 }}>
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
                        </SectionBody>
                    </Section>
                )}

                {/* ── Dokumenty (po zakończeniu) ── */}
                {completion && completion.documents.length > 0 && (
                    <Section>
                        <SectionTitle>Dodatkowe dokumenty</SectionTitle>
                        <SectionBody>
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
                        </SectionBody>
                    </Section>
                )}

                {/* ── Płatność (po zakończeniu) ── */}
                {completion?.paymentStatus && (
                    <Section>
                        <SectionTitle>Płatność</SectionTitle>
                        <SectionBody>
                            <PaymentNote>{PAYMENT_LABEL[completion.paymentStatus]}</PaymentNote>
                        </SectionBody>
                    </Section>
                )}

                {/* ── Kontakt ── */}
                <Section>
                    <SectionTitle>Kontakt i adres</SectionTitle>
                    <SectionBody>
                        <ContactBlock>
                            <ContactName>{company.name}</ContactName>
                            {addressLine && <ContactLine>{addressLine}</ContactLine>}
                            <ContactLinks>
                                {company.phone && (
                                    <TextLink href={`tel:${company.phone.replace(/\s/g, '')}`}>
                                        {company.phone}
                                    </TextLink>
                                )}
                                {company.email && (
                                    <TextLink href={`mailto:${company.email}`}>
                                        {company.email}
                                    </TextLink>
                                )}
                                {websiteHref && (
                                    <TextLink href={websiteHref} target="_blank" rel="noopener noreferrer">
                                        {company.website}
                                    </TextLink>
                                )}
                                {addressLine && (
                                    <TextLink
                                        href={`https://maps.google.com/?q=${encodeURIComponent(`${company.name}, ${addressLine}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Pokaż na mapie
                                    </TextLink>
                                )}
                            </ContactLinks>
                        </ContactBlock>
                    </SectionBody>
                </Section>

                <Footer>
                    Karta wizyty ma charakter informacyjny.
                    W razie pytań prosimy o kontakt bezpośrednio z {company.name || 'serwisem'}.
                </Footer>
            </Shell>
        </Page>
    );
};
