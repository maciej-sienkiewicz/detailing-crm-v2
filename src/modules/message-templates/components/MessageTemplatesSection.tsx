import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { serverMessage, toastedGlobally } from '@/modules/settings/components/errorToast';
import { useFeature } from '@/modules/subscription';
import { UnsavedChangesBanner } from '@/modules/settings/components/shared/SettingsLayout';
import { SmsSenderNameCard } from '@/modules/sms-settings/components/SmsSenderNameCard';
import { RedirectCard } from './RedirectCard';
import { MessageTimeline } from './MessageTimeline';
import { RuleDrawer } from './RuleDrawer';
import { Container, SearchInput, SearchWrap, Toolbar } from './primitives';
import { MESSAGES, type MessageSpec } from '../catalog';
import { channelStatus } from '../utils/template';
import { useMessageTemplates } from '../hooks/useMessageTemplates';
import type { Channel, ChannelDraft, MessageKey, TemplatesDraft } from '../types';

/* Jedyna wyniesiona powierzchnia sekcji: wiadomości na osi wizyty (CLAUDE.md §2). */
const TemplatesCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 24px 6px;

  @media (max-width: 767px) { padding: 16px 16px 4px; }
`;

const CardHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const HeadRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  flex-wrap: wrap;
`;

const HeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  p { margin: 0; font-size: 13px; line-height: 1.5; color: ${ui.textMuted}; }
`;

/* Nadawca SMS i karta wizyty obok siebie: dwie krótkie karty, które czyta się razem. */
const TopRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  align-items: start;

  @media (max-width: 640px) { grid-template-columns: minmax(0, 1fr); }
`;

const Matches = styled.span`
  font-size: 12.5px;
  color: ${ui.textMuted};
  font-variant-numeric: tabular-nums;
`;

const SkeletonRow = styled.div`
  height: 88px;
  border-radius: 14px;
  background: linear-gradient(90deg, #F1F5F9 25%, #E8EDF3 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

type Filter = 'all' | 'on' | 'off';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'on', label: 'Włączone' },
  { id: 'off', label: 'Wyłączone' },
];

const isActive = (drafts: Partial<Record<Channel, ChannelDraft>>) =>
  channelStatus(drafts.sms, false) === 'on' || channelStatus(drafts.email, true) === 'on';

function searchHaystack(spec: MessageSpec, drafts: Partial<Record<Channel, ChannelDraft>>) {
  return [
    spec.name,
    spec.description,
    drafts.sms?.body,
    drafts.email?.subject,
    drafts.email?.body,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export interface MessageTemplatesSectionProps {
  /**
   * Karta wizyty (Ustawienia → Wiadomości do klientów). Wstawia ją rama ustawień, bo
   * sama karta mieszka w module ustawień i ma własne wymaganie dostępu.
   */
  visitCard?: ReactNode;
}

/**
 * One screen for every message the customer can receive, laid out on the visit timeline.
 * Each message shows what the customer will actually read, so "what does the customer
 * get when the car is ready?" is answered by looking, not by opening every message.
 */
export const MessageTemplatesSection: React.FC<MessageTemplatesSectionProps> = ({ visitCard }) => {
  const feature = useFeature('SMS_EMAIL');
  const { draft, isLoading, isError, refetch, dirty, isSaving, patchChannel, save, discard } =
    useMessageTemplates();
  const { showSuccess, showError } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openKey, setOpenKey] = useState<MessageKey | null>(null);
  const closeDrawer = useCallback(() => setOpenKey(null), []);

  const activeCount = useMemo(() => {
    if (!draft) return 0;
    return MESSAGES.filter(spec => isActive(draft[spec.key])).length;
  }, [draft]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (spec: MessageSpec) => {
      if (!draft) return false;
      const drafts = draft[spec.key];
      if (filter === 'on' && !isActive(drafts)) return false;
      if (filter === 'off' && isActive(drafts)) return false;
      if (needle && !searchHaystack(spec, drafts).includes(needle)) return false;
      return true;
    };
  }, [draft, filter, query]);

  const counts: Record<Filter, number> = {
    all: MESSAGES.length,
    on: activeCount,
    off: MESSAGES.length - activeCount,
  };

  const visibleCount = useMemo(
    () => (draft ? MESSAGES.filter(matches).length : 0),
    [draft, matches]
  );

  const openSpec = openKey ? MESSAGES.find(s => s.key === openKey) ?? null : null;

  // Błąd wczytania to nie pusta lista - bez tego ekran stał na szkielecie w nieskończoność
  // albo pokazywał zdanie „odśwież stronę" bez przycisku, który to robi.
  if (isError) {
    return (
      <Notice
        tone="danger"
        role="alert"
        title="Nie udało się wczytać wiadomości automatycznych"
        action={<Button variant="ghost" size="sm" onClick={refetch}>Spróbuj ponownie</Button>}
      >
        Szablony SMS i e-maili są zapisane na serwerze, nic nie zginęło.
      </Notice>
    );
  }

  if (isLoading || !draft) {
    return (
      <Container>
        <TemplatesCard aria-busy="true" aria-label="Wczytywanie wiadomości">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </TemplatesCard>
      </Container>
    );
  }

  /*
   * Błąd zapisu stał wcześniej czerwoną ramką NAD przekierowaniem i nazwą nadawcy -
   * przy pasku zapisu na dole okna był poza ekranem, więc kliknięcie „Zapisz zmiany"
   * wyglądało, jakby nic nie zrobiło. Teraz: dymek, a pasek zostaje, bo zmiany
   * dalej są niezapisane. Zapis SMS-ów idzie z `skipErrorToast`, więc powód od serwera
   * (np. nieznaną zmienną) pokazuje ten dymek - jeden, nie dwa jak wcześniej.
   */
  const handleSave = (): Promise<boolean> =>
    save()
      .then(() => {
        showSuccess('Zapisano wiadomości', 'Zmiany obowiązują od następnej wysyłki.');
        return true;
      })
      .catch(err => {
        if (!toastedGlobally(err)) {
          showError(
            'Nie zapisano zmian',
            serverMessage(err) ?? 'Sprawdź połączenie i spróbuj ponownie. Zmiany czekają w pasku zapisu.'
          );
        }
        return false;
      });

  // Pasek zapisu leży pod panelem reguły, więc zapis musi być też w samym panelu.
  // Po udanym zapisie panel się zamyka: edycja tej wiadomości jest skończona.
  const saveFromDrawer = () => {
    void handleSave().then(ok => { if (ok) closeDrawer(); });
  };

  const toggle = (key: MessageKey, channel: Channel) => {
    const current = (draft as TemplatesDraft)[key]?.[channel];
    if (!current) return;
    patchChannel(key, channel, { enabled: !current.enabled });
  };

  const enable = (key: MessageKey) => {
    const spec = MESSAGES.find(s => s.key === key);
    if (!spec) return;
    patchChannel(key, spec.sms ? 'sms' : 'email', { enabled: true });
    setOpenKey(key);
  };

  return (
    <LockedSection
      locked={!feature.enabled}
      message="Twój abonament nie obsługuje automatycznych wiadomości SMS i e-mail."
    >
      <Container>
        <TopRow>
          <SmsSenderNameCard />
          {visitCard}
        </TopRow>
        <RedirectCard />

        <TemplatesCard aria-labelledby="customer-messages-title">
          <CardHead>
            <HeadRow>
              <HeadText>
                <SectionTitle as="h3" size="lg" id="customer-messages-title">Co klient dostaje w trakcie wizyty</SectionTitle>
                <p>Włączone: {activeCount} z {MESSAGES.length}. Podświetlone fragmenty system wstawia sam.</p>
              </HeadText>
              <Segmented
                label="Filtr wiadomości"
                size="sm"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map(f => ({ value: f.id, label: f.label, count: counts[f.id] }))}
              />
            </HeadRow>
            <Toolbar>
              <SearchWrap>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <SearchInput
                  type="search"
                  value={query}
                  placeholder="Szukaj po nazwie lub treści wiadomości…"
                  aria-label="Szukaj wiadomości"
                  onChange={e => setQuery(e.target.value)}
                />
              </SearchWrap>

              {query.trim() && <Matches aria-live="polite">Pasuje: {visibleCount}</Matches>}
            </Toolbar>
          </CardHead>

          <MessageTimeline
            draft={draft}
            matches={matches}
            onOpen={setOpenKey}
            onToggle={toggle}
            onEnable={enable}
          />
        </TemplatesCard>
      </Container>

      {openSpec && (
        <RuleDrawer
          spec={openSpec}
          drafts={draft[openSpec.key]}
          initialChannel={openSpec.sms ? 'sms' : 'email'}
          onPatch={(channel, patch) => patchChannel(openSpec.key, channel, patch)}
          onClose={closeDrawer}
          dirty={dirty}
          isSaving={isSaving}
          onSave={saveFromDrawer}
        />
      )}

      <UnsavedChangesBanner
        visible={dirty}
        onSave={handleSave}
        onDiscard={discard}
        isSaving={isSaving}
      />
    </LockedSection>
  );
};
