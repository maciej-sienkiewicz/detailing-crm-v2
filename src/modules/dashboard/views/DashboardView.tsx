/**
 * Dashboard View: Command Center
 */

import { usePermissions, usePersonalDataActions } from '@/core/permissions';
import { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertCircle, ChevronDown, LineChart, MoreHorizontal, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useBreakpoint } from '@/common/hooks';
import { usePiiAccess } from '@/common/pii';
import { PageContainer } from '@/common/components/PageContainer';
import { ActionMenu, MenuItem, useActionMenu } from '@/common/components/ui';
import { ReportWorkdayButton } from '@/modules/worktime';
import { OperationalScorecard } from '../components/OperationalScorecard';
import { UpcomingVisitsPanel } from '../components/UpcomingVisitsPanel';
import { TasksPanel } from '../components/TasksPanel';
import { RevenueKpiCard } from '../components/RevenueKpiCard';
import { ReservationsKpiCard } from '../components/ReservationsKpiCard';
import { LeadsWaitingKpi } from '../components/LeadsWaitingKpi';
import { MailSetupKpi } from '../components/mailSetup/MailSetupKpi';
import { useMailAccounts } from '@/modules/comms/hooks/useComms';
import { DashboardHintsBar } from '../components/DashboardHintsBar';
import { GeneratePostModal } from '@/modules/competition-monitoring/components/GeneratePostModal';
import { useDashboard, useDashboardSocket } from '../hooks';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h >= 5 && h < 18) return 'Dzień dobry';
  return 'Dobry wieczór';
};

/** „środa, 21 października” - nad powitaniem, bez roku. */
const formatLocalDate = (): string =>
  new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const ViewContainer = styled(PageContainer)`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.spacing.xl};
  animation: ${fadeUp} 300ms ease both;

  /* Na telefonie 32px miedzy sekcjami to byl pusty ekran do przewijania,
     a nie oddech: karty maja wlasne obramowania i cienie, wiec rozdzielaja
     sie same. Odstepy schodza do wysokosci jednego wiersza tekstu. */
  @media (max-width: 767px) {
    gap: 14px;
  }
`;

// ─── Hero ─────────────────────────────────────────────────────────────────────
//
// Wariant B (21.10.2026): płaska ciemna karta w kolorze menu - bez gradientu
// i błękitnej poświaty, które robiły z powitania szablon. Powitanie mniejsze,
// z datą; jedna akcja główna („Nowa wizyta”), reszta w „⋯”. Pod spodem wskaźniki
// obok siebie zamiast karuzeli: przychód, rezerwacje, czekające zapytania - każdy
// tylko dla tego, kto ma do niego prawo.

const HeroCard = styled.div`
  background: #0f172a;
  border-radius: 16px;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    padding: 18px 16px;
    gap: 16px;
  }
`;

const HeroTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const HeroDate = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
`;

const HeroGreeting = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.3px;
  line-height: 1.2;

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    font-size: 21px;
  }
`;

const HeroActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

/** Na ciemnej karcie główna akcja jest biała - najmocniejszy kontrast, bez trzeciego koloru. */
const HeroBtnPrimary = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover { background: #e2e8f0; }
  &:focus-visible { outline: 2px solid #8ebbd5; outline-offset: 2px; }
  svg { width: 16px; height: 16px; stroke-width: 2.2; }
`;

const HeroIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover { background: rgba(255, 255, 255, 0.12); }
  &:focus-visible { outline: 2px solid #8ebbd5; outline-offset: 2px; }
  svg { width: 18px; height: 18px; }
`;

/** Wskaźniki obok siebie, rozdzielone cienkimi liniami; na telefonie jeden pod drugim. */
const KpiRow = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$cols}, minmax(0, 1fr));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 18px;

  > * { padding: 0 20px; }
  > *:first-child { padding-left: 0; }
  > * + * { border-left: 1px solid rgba(255, 255, 255, 0.08); }

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    padding-top: 4px;

    > * { padding: 14px 0 0; }
    > * + * { border-left: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 14px; }
  }
`;

// ─── Hero stats toggle (mobile) ───────────────────────────────────────────────
//
// Na telefonie wskaźniki zajmowały pół ekranu powitalnego, zanim użytkownik
// zobaczył cokolwiek do zrobienia. Chowamy je za wąskim przyciskiem - liczby
// są o jedno dotknięcie, a nagłówek wraca do rozmiaru nagłówka.
const StatsToggle = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  width: 100%;
  box-sizing: border-box;
  padding: 7px 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  color: #cbd5e1;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, color 150ms ease;

  &:active { background: rgba(255,255,255,0.12); color: #f1f5f9; }

  svg { width: 14px; height: 14px; stroke-width: 2; flex-shrink: 0; }

  svg:last-child {
    transition: transform 200ms ease;
    transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  }
`;

// ─── Two-column panels grid ───────────────────────────────────────────────────

const TwoColGrid = styled.div<{ $single?: boolean }>`
  display: grid;
  grid-template-columns: ${p => (p.$single ? '1fr' : '2fr 1fr')};
  gap: 20px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

// Na telefonie zadania idą przed wizytami: "Do zrobienia" to lista, do której
// wraca się w ciągu dnia, a nadchodzące wizyty są kontekstem.
const TasksSlot = styled.div`
  min-width: 0;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    order: -1;
  }
`;

const VisitsSlot = styled.div`
  min-width: 0;
`;

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.spacing.md};
  padding: ${p => p.theme.spacing.lg};
  background: ${p => p.theme.colors.errorLight};
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: ${p => p.theme.radii.xl};
`;

const ErrorIcon = styled(AlertCircle)`
  width: 22px;
  height: 22px;
  color: ${p => p.theme.colors.error};
  flex-shrink: 0;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.p`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.colors.error};
  margin: 0 0 2px;
`;

const ErrorMsg = styled.p`
  font-size: 13px;
  color: ${p => p.theme.colors.textSecondary};
  margin: 0;
`;

const RetryBtn = styled.button`
  flex-shrink: 0;
  padding: 8px 16px;
  background: ${p => p.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${p => p.theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease;
  &:hover { opacity: 0.85; }
`;

// ─── View ─────────────────────────────────────────────────────────────────────

export const DashboardView = () => {
  useDashboardSocket();
  const navigate = useNavigate();
  /*
   * Pulpit otwiera każde uprawnienie z ANY_DASHBOARD, więc każdy element pilnuje swojego:
   * bez prawa do zadań lista „Do zrobienia" była pusta („Brak zadań"), choć zadania są,
   * a przyciski prowadziły na ekran braku dostępu albo kończyły się odmową serwera.
   */
  const { can } = usePermissions();
  const { canCreateVisit } = usePersonalDataActions();
  const canSeeTasks = can('TASKS_VIEW');
  // Statystyki, podpowiedzi, rezerwacje i najbliższe wizyty są na serwerze za VISITS_VIEW.
  // Rola wpuszczona na Tablicę innym uprawnieniem dostawała przy nich 403, a statystyki
  // co 30 s - razem z kolejnym /auth/me i ramką „Nie udało się wczytać danych".
  const canSeeVisits = can('VISITS_VIEW');
  const { user } = useAuth();
  const [instagramModalOpen, setInstagramModalOpen] = useState(false);
  const isDesktop = useBreakpoint('md');
  const [heroStatsOpen, setHeroStatsOpen] = useState(false);
  // Bez dostępu do danych osobowych cała Tablica jest pusta w treści: kafelki
  // stanu, nadchodzące wizyty i zadania mówią o klientach. Zostaje powitanie
  // i jedyna czynność, jaką taki użytkownik tu wykonuje - raport dnia pracy.
  const hasPiiAccess = usePiiAccess();

  const {
    stats,
    isError,
    refetch,
  } = useDashboard({ enabled: canSeeVisits && hasPiiAccess });

    const greeting = useMemo(() => getGreeting(), []);
    const localDate = useMemo(() => capitalize(formatLocalDate()), []);
    const moreMenu = useActionMenu();
    // Poczta podłączona = choć jedna skrzynka, która nie jest wyłączona. Bez niej trzeci
    // wskaźnik zachęca do podłączenia zamiast pokazywać licznik zapytań.
    const canLeads = can('LEADS_MANAGE');
    const { data: mailAccounts } = useMailAccounts({ enabled: canLeads && hasPiiAccess });

  const hello = (
    <HeroText>
      <HeroDate>{localDate}</HeroDate>
      <HeroGreeting>{greeting}{user?.firstName ? `, ${user.firstName}` : ''}</HeroGreeting>
    </HeroText>
  );

  if (!hasPiiAccess) {
    return (
      <ViewContainer>
        <HeroCard>
          <HeroTop>
            {hello}
            <HeroActions>
              <ReportWorkdayButton />
            </HeroActions>
          </HeroTop>
        </HeroCard>
      </ViewContainer>
    );
  }

  // Każdy wskaźnik tylko dla tego, kto ma do niego prawo: przychód to dane finansowe,
  // zapytania widzi obsługa zapytań. Rezerwacje widzi każdy z dostępem do Tablicy.
  // Do wczytania listy skrzynek trzecie miejsce stoi puste - bez mignięcia licznika,
  // który zaraz zamieniłby się w zachętę do podłączenia poczty.
  const mailConnected = mailAccounts?.some(account => account.status !== 'DISABLED');
  const leadsKpi = !canLeads ? null
    : mailAccounts === undefined ? <div key="leads" />
    : mailConnected ? <LeadsWaitingKpi key="leads" />
    : <MailSetupKpi key="leads" />;
  const kpis = [
    can(['FINANCE_VIEW_REPORTS', 'STATISTICS_VIEW']) && <RevenueKpiCard key="revenue" />,
    canSeeVisits && <ReservationsKpiCard key="reservations" />,
    leadsKpi,
  ].filter(Boolean);
  const kpiRow = <KpiRow $cols={kpis.length}>{kpis}</KpiRow>;

  return (
    <ViewContainer>

      <HeroCard>
        <HeroTop>
          {hello}
          <HeroActions>
            {can('MARKETING_MANAGE') && (
              <HeroIconBtn
                type="button"
                aria-label="Więcej akcji"
                aria-expanded={moreMenu.isOpen()}
                onClick={e => moreMenu.toggle(e, null)}
              >
                <MoreHorizontal />
              </HeroIconBtn>
            )}
            {canCreateVisit && (
              <HeroBtnPrimary type="button" onClick={() => navigate('/checkin/new')}>
                <Plus />
                Nowa wizyta
              </HeroBtnPrimary>
            )}
          </HeroActions>
        </HeroTop>
        {kpis.length > 0 && (isDesktop ? kpiRow : (
          <>
            <StatsToggle
              $open={heroStatsOpen}
              onClick={() => setHeroStatsOpen(v => !v)}
              aria-expanded={heroStatsOpen}
            >
              <LineChart />
              {heroStatsOpen ? 'Ukryj statystyki' : 'Pokaż statystyki'}
              <ChevronDown />
            </StatsToggle>
            {heroStatsOpen && kpiRow}
          </>
        ))}
      </HeroCard>
      <ActionMenu anchor={moreMenu.menu?.anchor ?? null} onClose={moreMenu.close} label="Więcej akcji">
        <MenuItem icon={<Sparkles />} onClick={() => { moreMenu.close(); setInstagramModalOpen(true); }}>
          Generuj post
        </MenuItem>
      </ActionMenu>

      {/* Podpowiedzi między powitaniem a kafelkami - komponent sam chowa się
          na telefonie i znika całkiem, gdy nie ma nic do powiedzenia. */}
      {isDesktop && canSeeVisits && <DashboardHintsBar hideKinds={canLeads && mailConnected ? ['LEADS_AWAITING'] : []} />}

      {instagramModalOpen && (
        <GeneratePostModal onClose={() => setInstagramModalOpen(false)} />
      )}

      {isError && (
        <ErrorBox>
          <ErrorIcon />
          <ErrorContent>
            <ErrorTitle>Nie udało się wczytać danych</ErrorTitle>
            <ErrorMsg>Sprawdź internet i spróbuj ponownie.</ErrorMsg>
          </ErrorContent>
          <RetryBtn onClick={() => refetch()}>Spróbuj ponownie</RetryBtn>
        </ErrorBox>
      )}

      {canSeeVisits && (
        <div>
          <OperationalScorecard stats={stats} />
        </div>
      )}

      {(canSeeVisits || canSeeTasks) && (
        <TwoColGrid $single={!(canSeeVisits && canSeeTasks)}>
          {canSeeVisits && (
            <VisitsSlot>
              <UpcomingVisitsPanel />
            </VisitsSlot>
          )}
          {canSeeTasks && (
            <TasksSlot>
              <TasksPanel />
            </TasksSlot>
          )}
        </TwoColGrid>
      )}

    </ViewContainer>
  );
};
