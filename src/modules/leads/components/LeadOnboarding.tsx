import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Mail,
  Phone,
  PenLine,
  ArrowRight,
  Settings,
  Zap,
  MessageSquare,
  BarChart2,
  CheckCircle2,
  CalendarCheck,
  PhoneCall,
  ClipboardList,
  Copy,
  Check,
  Mic,
  Smartphone,
  PlayCircle,
} from 'lucide-react';
import { useCompanySettings } from '@/modules/settings/hooks/useCompany';
import { LeadTour } from './LeadTour';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Root = styled.div`
  padding: 40px 32px 48px;
  max-width: 960px;
  margin: 0 auto;
  animation: ${fadeUp} 300ms ease both;
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.25);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  color: #0ea5e9;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 16px;
  svg { width: 12px; height: 12px; }
`;

const HeroTitle = styled.h2`
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.4px;
`;

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  max-width: 520px;
  margin: 0 auto;
`;

const TourBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 11px 22px;
  border-radius: 9999px;
  border: none;
  background: #0ea5e9;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.32);
  transition: all 170ms ease;

  &:hover { background: #0284c7; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4); }
  &:active { transform: translateY(0); }
  svg { width: 17px; height: 17px; }
`;

// ─── Email alias chip with copy ────────────────────────────────────────────────

const AliasRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 4px;
`;

const CopyBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 140ms ease;
  &:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
  svg { width: 14px; height: 14px; }
`;

const AliasPlaceholder = styled.div`
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
  margin: 10px 0 4px;
`;

// ─── Setup cards ──────────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 14px;
`;

const SetupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 40px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SetupCard = styled.div<{ $recommended?: boolean }>`
  position: relative;
  background: #fff;
  border: 1.5px solid ${p => p.$recommended ? '#bae6fd' : '#e2e8f0'};
  border-radius: 14px;
  padding: 22px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 180ms, box-shadow 180ms;
  animation: ${fadeUp} 300ms ease both;

  &:hover {
    border-color: ${p => p.$recommended ? '#7dd3fc' : '#cbd5e1'};
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  }
`;

const RecommendedTag = styled.div`
  position: absolute;
  top: -10px;
  left: 16px;
  padding: 3px 10px;
  background: #0ea5e9;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardIcon = styled.div<{ $color: string; $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: ${p => p.$bg};
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 20px; height: 20px; }
`;

const CardBody = styled.div`
  flex: 1;
`;

const CardTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
`;

const CardDesc = styled.div`
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.6;
`;

const CardCta = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${p => p.$primary ? '9px 16px' : '7px 14px'};
  border-radius: 9999px;
  border: ${p => p.$primary ? 'none' : '1.5px solid #e2e8f0'};
  background: ${p => p.$primary ? '#0ea5e9' : '#f8fafc'};
  color: ${p => p.$primary ? '#fff' : '#475569'};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
  align-self: flex-start;

  &:hover {
    background: ${p => p.$primary ? '#0284c7' : '#f1f5f9'};
    ${p => !p.$primary && 'border-color: #cbd5e1; color: #0f172a;'}
  }
  svg { width: 13px; height: 13px; }
`;

const CodeChip = styled.code`
  display: inline-block;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11.5px;
  color: #0284c7;
  font-family: 'SFMono-Regular', 'Menlo', monospace;
  word-break: break-all;
`;

// ─── Pipeline flow ────────────────────────────────────────────────────────────

const PipelineSection = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 28px;
`;

const PipelineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    gap: 6px;
  }
`;

const PipelineStep = styled.div<{ $color: string; $bg: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  background: ${p => p.$bg};
  border: 1px solid ${p => p.$color}40;
  flex-shrink: 0;
  min-width: 0;
`;

const PipelineStepIcon = styled.div<{ $color: string }>`
  color: ${p => p.$color};
  flex-shrink: 0;
  svg { width: 16px; height: 16px; }
`;

const PipelineStepText = styled.div``;

const PipelineStepTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
`;

const PipelineStepDesc = styled.div`
  font-size: 10.5px;
  color: #64748b;
  margin-top: 1px;
`;

const PipelineArrow = styled.div`
  color: #cbd5e1;
  flex-shrink: 0;
  svg { width: 14px; height: 14px; }
`;

// ─── Stats info row ───────────────────────────────────────────────────────────

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const InfoCard = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: ${fadeUp} 400ms ease both;
`;

const InfoCardIcon = styled.div<{ $color: string }>`
  color: ${p => p.$color};
  svg { width: 16px; height: 16px; }
`;

const InfoCardTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
`;

const InfoCardDesc = styled.div`
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.55;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onAddLead: () => void;
  onGoToSettings: () => void;
  onOpenMobile: () => void;
}

export function LeadOnboarding({ onAddLead, onGoToSettings, onOpenMobile }: Props) {
  const { company } = useCompanySettings();
  const [tourOpen, setTourOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const aliasAddress = company?.emailAlias ? `${company.emailAlias}@detailboost.pl` : null;

  const copyAlias = async () => {
    if (!aliasAddress) return;
    try {
      await navigator.clipboard.writeText(aliasAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable — ignore */ }
  };

  return (
    <Root>
      {tourOpen && <LeadTour onClose={() => setTourOpen(false)} />}

      <Hero>
        <HeroBadge><Zap />Pierwsze kroki</HeroBadge>
        <HeroTitle>Zacznij zbierać zapytania</HeroTitle>
        <HeroSubtitle>
          Skonfiguruj źródła, z których będą trafiać leady, albo dodaj pierwsze zapytanie ręcznie.
          Całość obsługujesz z tego widoku.
        </HeroSubtitle>
        <TourBtn onClick={() => setTourOpen(true)}>
          <PlayCircle /> Przewodnik krok po kroku
        </TourBtn>
      </Hero>

      {/* ── Setup steps ── */}
      <SectionLabel>Jak podłączyć źródła leadów</SectionLabel>
      <SetupGrid>

        {/* E-mail */}
        <SetupCard $recommended>
          <RecommendedTag>Polecane</RecommendedTag>
          <CardIcon $color="#0ea5e9" $bg="rgba(14,165,233,0.1)">
            <Mail />
          </CardIcon>
          <CardBody>
            <CardTitle>Zapytania e-mail</CardTitle>
            <CardDesc>
              Klienci piszą do Ciebie e-mailem? W swojej skrzynce ustaw automatyczne
              przekierowanie wiadomości na adres alias Twojej firmy — każdy przekierowany
              e-mail stworzy wtedy nowy lead.
            </CardDesc>
            {aliasAddress ? (
              <AliasRow>
                <CodeChip>{aliasAddress}</CodeChip>
                <CopyBtn onClick={copyAlias} title="Kopiuj adres" aria-label="Kopiuj adres alias">
                  {copied ? <Check /> : <Copy />}
                </CopyBtn>
              </AliasRow>
            ) : (
              <AliasPlaceholder>
                Adres alias pojawi się tutaj po skonfigurowaniu w ustawieniach firmy.
              </AliasPlaceholder>
            )}
            <CardDesc style={{ fontSize: 11.5, marginTop: 6 }}>
              Alias to tylko pośrednik — serwer przetwarza wiadomość i od razu o niej zapomina.
              Treści e-maili nie są przechowywane.
            </CardDesc>
          </CardBody>
          <CardCta onClick={onGoToSettings}>
            <Settings /> Ustawienia firmy
          </CardCta>
        </SetupCard>

        {/* Telefon */}
        <SetupCard>
          <CardIcon $color="#8b5cf6" $bg="rgba(139,92,246,0.1)">
            <Phone />
          </CardIcon>
          <CardBody>
            <CardTitle>Po rozmowie telefonicznej</CardTitle>
            <CardDesc>
              Mamy osobny widok pod telefon. Po rozmowie z klientem klikasz „Lead",
              wklejasz numer i <strong>opowiadasz głosowo</strong>, czego dotyczyła rozmowa —
              bez pisania na małej klawiaturze.
            </CardDesc>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Mic size={14} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>
                System sam rozpozna, jakie usługi przypisać, i zaproponuje kosztorys, który
                później dowolnie zmienisz.
              </span>
            </div>
          </CardBody>
          <CardCta onClick={onOpenMobile}>
            <Smartphone /> Otwórz widok mobilny
          </CardCta>
        </SetupCard>

        {/* Ręcznie */}
        <SetupCard>
          <CardIcon $color="#16a34a" $bg="rgba(22,163,74,0.1)">
            <PenLine />
          </CardIcon>
          <CardBody>
            <CardTitle>Klient zapytał osobiście</CardTitle>
            <CardDesc>
              Ktoś przyszedł do firmy o coś zapytać albo napisał na komunikatorze?
              Dodaj lead ręcznie — wystarczy numer telefonu lub e-mail i krótki opis
              zapytania. Resztę uzupełnisz później.
            </CardDesc>
          </CardBody>
          <CardCta $primary onClick={onAddLead}>
            <PenLine /> Dodaj pierwszy lead
          </CardCta>
        </SetupCard>

      </SetupGrid>

      {/* ── Pipeline flow ── */}
      <SectionLabel>Jak wygląda cykl życia leada</SectionLabel>
      <PipelineSection>
        <PipelineRow>
          <PipelineStep $color="#f59e0b" $bg="rgba(245,158,11,0.08)">
            <PipelineStepIcon $color="#f59e0b"><PhoneCall /></PipelineStepIcon>
            <PipelineStepText>
              <PipelineStepTitle>Nowy</PipelineStepTitle>
              <PipelineStepDesc>Zapytanie wpłynęło</PipelineStepDesc>
            </PipelineStepText>
          </PipelineStep>
          <PipelineArrow><ArrowRight /></PipelineArrow>
          <PipelineStep $color="#0ea5e9" $bg="rgba(14,165,233,0.08)">
            <PipelineStepIcon $color="#0ea5e9"><MessageSquare /></PipelineStepIcon>
            <PipelineStepText>
              <PipelineStepTitle>W kontakcie</PipelineStepTitle>
              <PipelineStepDesc>Rozmawiasz z klientem</PipelineStepDesc>
            </PipelineStepText>
          </PipelineStep>
          <PipelineArrow><ArrowRight /></PipelineArrow>
          <PipelineStep $color="#8b5cf6" $bg="rgba(139,92,246,0.08)">
            <PipelineStepIcon $color="#8b5cf6"><CalendarCheck /></PipelineStepIcon>
            <PipelineStepText>
              <PipelineStepTitle>Zarezerwowany</PipelineStepTitle>
              <PipelineStepDesc>Termin ustalony</PipelineStepDesc>
            </PipelineStepText>
          </PipelineStep>
          <PipelineArrow><ArrowRight /></PipelineArrow>
          <PipelineStep $color="#16a34a" $bg="rgba(22,163,74,0.08)">
            <PipelineStepIcon $color="#16a34a"><CheckCircle2 /></PipelineStepIcon>
            <PipelineStepText>
              <PipelineStepTitle>Zakończony</PipelineStepTitle>
              <PipelineStepDesc>Usługa zrealizowana</PipelineStepDesc>
            </PipelineStepText>
          </PipelineStep>
        </PipelineRow>
        <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          Status zmieniasz klikając kolorowy badge w wierszu leada. Możesz też oznaczyć lead jako
          <strong style={{ color: '#64748b' }}> Utracony</strong> lub
          <strong style={{ color: '#64748b' }}> Porzucony</strong> — system zapyta o powód, co pozwoli
          Ci później analizować, skąd wycieka sprzedaż.
        </div>
      </PipelineSection>

      {/* ── What the tiles show ── */}
      <SectionLabel>Co pokazują kafelki i analityka</SectionLabel>
      <InfoGrid>
        <InfoCard>
          <InfoCardIcon $color="#ef4444"><PhoneCall /></InfoCardIcon>
          <InfoCardTitle>Do obsłużenia</InfoCardTitle>
          <InfoCardDesc>
            Leady czekające na Twój <strong>pierwszy kontakt</strong>.
            Im szybciej zareagujesz, tym wyższy wskaźnik konwersji —
            klienci detailingu często wysyłają zapytania do kilku firm jednocześnie.
          </InfoCardDesc>
        </InfoCard>
        <InfoCard>
          <InfoCardIcon $color="#0ea5e9"><BarChart2 /></InfoCardIcon>
          <InfoCardTitle>Konwersja</InfoCardTitle>
          <InfoCardDesc>
            Procent leadów zamienionych w klientów w tym miesiącu,
            z trendem względem poprzedniego.
            Jeśli spada — czas sprawdzić szybkość odpowiedzi i cennik.
          </InfoCardDesc>
        </InfoCard>
        <InfoCard>
          <InfoCardIcon $color="#16a34a"><CheckCircle2 /></InfoCardIcon>
          <InfoCardTitle>Zrealizowane</InfoCardTitle>
          <InfoCardDesc>
            Suma wartości leadów zakończonych sukcesem w tym miesiącu.
            To już <strong>potwierdzony przychód</strong>, nie prognoza.
          </InfoCardDesc>
        </InfoCard>
        <InfoCard>
          <InfoCardIcon $color="#d97706"><ClipboardList /></InfoCardIcon>
          <InfoCardTitle>Analityka</InfoCardTitle>
          <InfoCardDesc>
            Kliknij „Analityka" w nagłówku, żeby zobaczyć win/loss per usługa,
            skuteczność każdego pracownika i rozkład godzinowy zapytań.
          </InfoCardDesc>
        </InfoCard>
      </InfoGrid>
    </Root>
  );
}
