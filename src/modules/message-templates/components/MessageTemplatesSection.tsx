import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { serverMessage, toastedGlobally } from '@/modules/settings/components/errorToast';
import { useFeature } from '@/modules/subscription';
import { UnsavedChangesBanner } from '@/modules/settings/components/shared/SettingsLayout';
import { SmsSenderNameCard } from '@/modules/sms-campaigns/components/SmsSenderNameCard';
import { RedirectCard } from './RedirectCard';
import { TemplatesTable } from './TemplatesTable';
import { RuleDrawer } from './RuleDrawer';
import { Container, SearchInput, SearchWrap, Toolbar } from './primitives';
import { MESSAGES, type MessageSpec } from '../catalog';
import { channelStatus } from '../utils/template';
import { useMessageTemplates } from '../hooks/useMessageTemplates';
import type { Channel, ChannelDraft, MessageKey, TemplatesDraft } from '../types';

/* Jedyna wyniesiona powierzchnia sekcji: lista wiadomości (CLAUDE.md §2). */
const TemplatesCard = styled(Card)`
  display: flex;
  flex-direction: column;
`;

const CardHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px 14px;

  @media (max-width: 767px) { padding: 14px 16px 12px; }
`;

const Matches = styled.span`
  font-size: 12.5px;
  color: ${ui.textMuted};
  font-variant-numeric: tabular-nums;
`;

const Legend = styled.div`
  display: flex;
  gap: 8px 16px;
  flex-wrap: wrap;
  padding: 12px 18px 16px;
  border-top: 1px solid ${ui.lineFaint};
  font-size: 12px;
  color: ${st.textSecondary};

  span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
`;

const SkeletonRow = styled.div`
  height: 56px;
  border-bottom: 1px solid ${ui.lineFaint};
  background: linear-gradient(90deg, #F1F5F9 25%, #E8EDF3 50%, #F1F5F9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  &:last-child { border-bottom: 0; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

type Filter = 'all' | 'on' | 'off';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'on', label: 'Aktywne' },
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

/**
 * One screen for every message the customer can receive, grouped by the moment in the
 * visit it belongs to. Channels are a column rather than a separate settings page, so
 * "what does the customer get when the car is ready?" has a single answer in one row.
 */
export const MessageTemplatesSection: React.FC = () => {
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
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </TemplatesCard>
      </Container>
    );
  }

  /*
   * Błąd zapisu stał wcześniej czerwoną ramką NAD przekierowaniem i nazwą nadawcy -
   * przy pasku zapisu na dole okna był poza ekranem, więc kliknięcie „Zapisz zmiany"
   * wyglądało, jakby nic nie zrobiło. Teraz: dymek, a pasek zostaje, bo zmiany
   * dalej są niezapisane. 4xx pokazuje już globalny interceptor (z powodem od serwera,
   * np. nieznaną zmienną) - drugi dymek o tym samym tylko by hałasował.
   */
  const handleSave = () => {
    save()
      .then(() => showSuccess('Zapisano wiadomości', 'Zmiany obowiązują od następnej wysyłki.'))
      .catch(err => {
        if (toastedGlobally(err)) return;
        showError(
          'Nie zapisano zmian',
          serverMessage(err) ?? 'Sprawdź połączenie i spróbuj ponownie. Zmiany czekają w pasku zapisu.'
        );
      });
  };

  const toggle = (key: MessageKey, channel: Channel) => {
    const current = (draft as TemplatesDraft)[key]?.[channel];
    if (!current) return;
    patchChannel(key, channel, { enabled: !current.enabled });
  };

  return (
    <LockedSection
      locked={!feature.enabled}
      message="Twój abonament nie obsługuje automatycznych wiadomości SMS i e-mail."
    >
      <Container>
        <RedirectCard />
        <SmsSenderNameCard />

        <TemplatesCard aria-label="Lista wiadomości">
          <CardHead>
            <SectionTitle count={`aktywne: ${activeCount} z ${MESSAGES.length}`}>Wiadomości</SectionTitle>
            <Toolbar>
              <SearchWrap>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <SearchInput
                  type="search"
                  value={query}
                  placeholder="Szukaj po nazwie lub treści wiadomości..."
                  aria-label="Szukaj szablonu"
                  onChange={e => setQuery(e.target.value)}
                />
              </SearchWrap>

              <Segmented
                label="Filtr szablonów"
                size="sm"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map(f => ({ value: f.id, label: f.label, count: counts[f.id] }))}
              />

              {query.trim() && <Matches aria-live="polite">Pasuje: {visibleCount}</Matches>}
            </Toolbar>
          </CardHead>

          <TemplatesTable
            draft={draft}
            matches={matches}
            onOpen={setOpenKey}
            onToggle={toggle}
          />

          <Legend>
            <span><i style={{ background: st.accentGreen }} /> włączona: wychodzi do klienta</span>
            <span><i style={{ background: st.accentAmber }} /> włączona, ale bez treści: nic nie wyjdzie</span>
            <span><i style={{ background: st.borderHover }} /> wyłączona</span>
          </Legend>
        </TemplatesCard>
      </Container>

      {openSpec && (
        <RuleDrawer
          spec={openSpec}
          drafts={draft[openSpec.key]}
          initialChannel={openSpec.sms ? 'sms' : 'email'}
          onPatch={(channel, patch) => patchChannel(openSpec.key, channel, patch)}
          onClose={closeDrawer}
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
