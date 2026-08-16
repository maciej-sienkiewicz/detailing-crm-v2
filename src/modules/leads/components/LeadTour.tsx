import { GuidedTour, TourDesc, TourBulletList, TourBullet } from '@/common/components/GuidedTour';
import type { TourStep } from '@/common/components/GuidedTour';
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
  Sparkles,
  Flag,
} from 'lucide-react';

// ─── Step content primitives ──────────────────────────────────────────────────
// The modal chrome lives in GuidedTour; only the per-step content is local.

const Desc = TourDesc;
const BulletList = TourBulletList;
const Bullet = TourBullet;

// ─── Step data ────────────────────────────────────────────────────────────────

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
  return <GuidedTour steps={STEPS} onClose={onClose} onFinish={onFinish} />;
}
