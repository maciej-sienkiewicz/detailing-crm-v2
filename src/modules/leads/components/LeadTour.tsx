import { useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import {
  Mail,
  Phone,
  PenLine,
  PhoneCall,
  MessageSquare,
  CalendarCheck,
  CheckCircle2,
  Users,
  UserCheck,
  Calculator,
  Send,
  BarChart2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Flag,
} from 'lucide-react';

// ─── Animations ───────────────────────────────────────────────────────────────

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const stepIn = keyframes`
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0); }
`;

// ─── Overlay & card ───────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${overlayIn} 200ms ease;
`;

const Card = styled.div`
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${cardIn} 260ms cubic-bezier(0.16, 1, 0.3, 1);
`;

// ─── Visual header ────────────────────────────────────────────────────────────

const Visual = styled.div<{ $from: string; $to: string }>`
  position: relative;
  height: 168px;
  background: linear-gradient(135deg, ${p => p.$from} 0%, ${p => p.$to} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const VisualGlow = styled.div`
  position: absolute;
  top: -40%;
  right: -10%;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
  pointer-events: none;
`;

const VisualIcon = styled.div`
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  backdrop-filter: blur(6px);
  animation: ${stepIn} 320ms ease both;
  svg { width: 36px; height: 36px; }
`;

const StepCounter = styled.div`
  position: absolute;
  top: 16px;
  left: 20px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.04em;
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms;
  &:hover { background: rgba(255, 255, 255, 0.32); }
  svg { width: 16px; height: 16px; }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const Body = styled.div`
  padding: 26px 28px 8px;
  animation: ${stepIn} 320ms ease both;
`;

const Title = styled.h2`
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.3px;
`;

const Desc = styled.div`
  font-size: 14px;
  color: #475569;
  line-height: 1.65;

  strong { color: #0f172a; font-weight: 600; }
`;

const BulletList = styled.ul`
  margin: 12px 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Bullet = styled.li<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.5;

  svg {
    width: 16px;
    height: 16px;
    color: ${p => p.$color};
    flex-shrink: 0;
    margin-top: 1px;
  }
  strong { color: #0f172a; font-weight: 600; }
`;

// ─── Footer / nav ─────────────────────────────────────────────────────────────

const Footer = styled.div`
  padding: 18px 28px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Dots = styled.div`
  display: flex;
  gap: 6px;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${p => p.$active ? '22px' : '7px'};
  height: 7px;
  border-radius: 9999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: ${p => p.$active ? '#0ea5e9' : '#cbd5e1'};
  transition: all 220ms ease;
  &:hover { background: ${p => p.$active ? '#0ea5e9' : '#94a3b8'}; }
`;

const NavBtns = styled.div`
  display: flex;
  gap: 8px;
`;

const NavBtn = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${p => p.$primary ? '9px 18px' : '9px 14px'};
  border-radius: 9999px;
  border: ${p => p.$primary ? 'none' : '1.5px solid #e2e8f0'};
  background: ${p => p.$primary ? '#0ea5e9' : '#fff'};
  color: ${p => p.$primary ? '#fff' : '#475569'};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;

  &:hover {
    background: ${p => p.$primary ? '#0284c7' : '#f8fafc'};
    ${p => !p.$primary && 'border-color: #cbd5e1; color: #0f172a;'}
  }
  svg { width: 15px; height: 15px; }
`;

// ─── Step data ────────────────────────────────────────────────────────────────

interface TourStep {
  icon: ReactNode;
  from: string;
  to: string;
  title: string;
  body: ReactNode;
}

const STEPS: TourStep[] = [
  {
    icon: <Sparkles />,
    from: '#0ea5e9',
    to: '#2563eb',
    title: 'Witaj w widoku Leadów',
    body: (
      <Desc>
        Lead to każde zapytanie od potencjalnego klienta — z e-maila, telefonu albo dodane ręcznie.
        Ten przewodnik w kilku krokach pokaże Ci, <strong>skąd biorą się leady</strong>, jak
        przechodzą przez kolejne etapy i <strong>gdzie szukać najważniejszych informacji</strong>.
      </Desc>
    ),
  },
  {
    icon: <Mail />,
    from: '#0ea5e9',
    to: '#0284c7',
    title: 'Skąd biorą się leady',
    body: (
      <>
        <Desc>Masz trzy źródła, z których zapytania trafiają do tego widoku:</Desc>
        <BulletList>
          <Bullet $color="#0ea5e9">
            <Mail /><span><strong>E-mail</strong> — przekierowujesz pocztę od klientów na swój
            adres alias, a każda wiadomość tworzy nowy lead.</span>
          </Bullet>
          <Bullet $color="#8b5cf6">
            <Phone /><span><strong>Telefon</strong> — po rozmowie wklejasz numer i opowiadasz
            głosowo, czego dotyczyła; system spisuje to za Ciebie.</span>
          </Bullet>
          <Bullet $color="#16a34a">
            <PenLine /><span><strong>Ręcznie</strong> — gdy klient zapytał osobiście lub
            na komunikatorze, dodajesz lead jednym kliknięciem.</span>
          </Bullet>
        </BulletList>
      </>
    ),
  },
  {
    icon: <CalendarCheck />,
    from: '#8b5cf6',
    to: '#6d28d9',
    title: 'Cykl życia leada',
    body: (
      <>
        <Desc>Każdy lead przechodzi przez kolejne etapy. Status zmieniasz klikając kolorowy
        badge w wierszu:</Desc>
        <BulletList>
          <Bullet $color="#f59e0b"><PhoneCall /><span><strong>Nowy</strong> — zapytanie właśnie wpłynęło, czeka na kontakt.</span></Bullet>
          <Bullet $color="#0ea5e9"><MessageSquare /><span><strong>W kontakcie</strong> — rozmawiasz z klientem, ustalacie szczegóły.</span></Bullet>
          <Bullet $color="#8b5cf6"><CalendarCheck /><span><strong>Zarezerwowany</strong> — termin ustalony, rezerwacja w kalendarzu.</span></Bullet>
          <Bullet $color="#16a34a"><CheckCircle2 /><span><strong>Zakończony</strong> — usługa zrealizowana. Możesz też oznaczyć lead jako Utracony lub Porzucony.</span></Bullet>
        </BulletList>
      </>
    ),
  },
  {
    icon: <Users />,
    from: '#0891b2',
    to: '#0e7490',
    title: 'Przypisywanie',
    body: (
      <>
        <Desc>Do leada możesz przypiąć osoby i terminy, żeby wszystko było w jednym miejscu:</Desc>
        <BulletList>
          <Bullet $color="#0ea5e9"><Users /><span><strong>Klienta</strong> z bazy — łączysz zapytanie z kartoteką i jej historią. Nowego klienta dodasz z auto-uzupełnionymi danymi.</span></Bullet>
          <Bullet $color="#8b5cf6"><UserCheck /><span><strong>Pracownika</strong> — kto odpowiada za kontakt. „Przypisz siebie" działa jednym kliknięciem.</span></Bullet>
          <Bullet $color="#16a34a"><CalendarCheck /><span><strong>Rezerwację lub wizytę</strong> z kalendarza — jedna pozycja może należeć tylko do jednego leada.</span></Bullet>
        </BulletList>
      </>
    ),
  },
  {
    icon: <Calculator />,
    from: '#16a34a',
    to: '#15803d',
    title: 'Kosztorys',
    body: (
      <Desc>
        Dla zapytań e-mail i telefonicznych system sam proponuje <strong>kosztorys</strong> —
        rozpoznaje usługi i dopasowuje ceny. Możesz stworzyć też <strong>własny kosztorys</strong>,
        edytując pozycje ręcznie. Twój kosztorys ma zawsze wyższy priorytet i to on liczy się przy
        wartości leada oraz przy tworzeniu rezerwacji.
      </Desc>
    ),
  },
  {
    icon: <Send />,
    from: '#d946ef',
    to: '#a21caf',
    title: 'Odpowiedź na e-mail',
    body: (
      <Desc>
        Przyciskiem <strong>„Przygotuj ofertę"</strong> otwierasz okno z gotową treścią odpowiedzi,
        spersonalizowaną pod klienta i jego pojazd. Edytujesz ją swobodnie i kopiujesz do swojej
        skrzynki. Udane odpowiedzi zapisujesz jako <strong>przykłady</strong> — kolejne propozycje
        będą trzymać Twój styl.
      </Desc>
    ),
  },
  {
    icon: <BarChart2 />,
    from: '#f59e0b',
    to: '#d97706',
    title: 'Kafelki i analityka',
    body: (
      <>
        <Desc>Na górze widoku cztery <strong>kafelki</strong> pokazują kondycję sprzedaży —
        ile leadów czeka na kontakt, jaka jest konwersja, zrealizowany przychód i ryzyko utraty.
        Klikając kafelek odfiltrujesz powiązane leady.</Desc>
        <Desc style={{ marginTop: 12 }}>
          Przycisk <strong>„Analityka"</strong> w nagłówku otwiera głębsze raporty: win/loss per
          usługa, skuteczność pracowników i rozkład godzinowy zapytań.
        </Desc>
      </>
    ),
  },
  {
    icon: <Flag />,
    from: '#0ea5e9',
    to: '#16a34a',
    title: 'To wszystko — możesz zaczynać',
    body: (
      <Desc>
        Znasz już cały obieg: <strong>źródła → etapy → przypisania → kosztorys → odpowiedź →
        analityka</strong>. Podłącz źródło leadów albo dodaj pierwsze zapytanie ręcznie.
        Ten przewodnik znajdziesz zawsze pod ikoną „?" w nagłówku.
      </Desc>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onFinish?: () => void;
}

export function LeadTour({ onClose, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      onFinish?.();
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  return createPortal(
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <Card>
        <Visual $from={current.from} $to={current.to}>
          <VisualGlow />
          <StepCounter>{step + 1} / {STEPS.length}</StepCounter>
          <CloseBtn onClick={onClose} aria-label="Zamknij przewodnik"><X /></CloseBtn>
          {/* key forces re-mount so the icon animates on each step */}
          <VisualIcon key={step}>{current.icon}</VisualIcon>
        </Visual>

        <Body key={`body-${step}`}>
          <Title>{current.title}</Title>
          {current.body}
        </Body>

        <Footer>
          <Dots>
            {STEPS.map((_, i) => (
              <Dot key={i} $active={i === step} onClick={() => setStep(i)} aria-label={`Krok ${i + 1}`} />
            ))}
          </Dots>
          <NavBtns>
            {!isFirst && (
              <NavBtn onClick={() => setStep(s => s - 1)}>
                <ArrowLeft /> Wstecz
              </NavBtn>
            )}
            <NavBtn $primary onClick={next}>
              {isLast ? 'Zaczynam' : 'Dalej'}
              {!isLast && <ArrowRight />}
            </NavBtn>
          </NavBtns>
        </Footer>
      </Card>
    </Overlay>,
    document.body,
  );
}
