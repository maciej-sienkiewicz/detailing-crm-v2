import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';
import { UnsavedChangesBanner } from '@/modules/settings/components/shared/SettingsLayout';
import { SmsSenderNameCard } from '@/modules/sms-campaigns/components/SmsSenderNameCard';
import { RedirectCard } from './RedirectCard';
import { TemplatesTable } from './TemplatesTable';
import { RuleDrawer } from './RuleDrawer';
import {
  Container,
  CountLabel,
  InlineError,
  SearchInput,
  SearchWrap,
  Segmented,
  SegmentedButton,
  TableScroll,
  Toolbar,
} from './primitives';
import { MESSAGES, type MessageSpec } from '../catalog';
import { channelStatus } from '../utils/template';
import { useMessageTemplates } from '../hooks/useMessageTemplates';
import type { Channel, ChannelDraft, MessageKey, TemplatesDraft } from '../types';

const Legend = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: ${st.textSecondary};

  span { display: inline-flex; align-items: center; gap: 6px; }
  i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
`;

const SkeletonRow = styled.div`
  height: 56px;
  border-bottom: 1px solid ${st.border};
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
  const { draft, isLoading, isError, dirty, isSaving, saveError, patchChannel, save, discard } =
    useMessageTemplates();

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

  const visibleCount = useMemo(
    () => (draft ? MESSAGES.filter(matches).length : 0),
    [draft, matches]
  );

  const openSpec = openKey ? MESSAGES.find(s => s.key === openKey) ?? null : null;

  if (isError) {
    return (
      <InlineError>
        <span aria-hidden="true">△</span>
        <span>Nie udało się wczytać szablonów wiadomości. Odśwież stronę i spróbuj ponownie.</span>
      </InlineError>
    );
  }

  if (isLoading || !draft) {
    return (
      <Container>
        <TableScroll>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </TableScroll>
      </Container>
    );
  }

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

        {saveError && (
          <InlineError>
            <span aria-hidden="true">△</span>
            <span>{saveError}</span>
          </InlineError>
        )}

        <Toolbar>
          <SearchWrap>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <SearchInput
              type="text"
              value={query}
              placeholder="Szukaj po nazwie lub treści wiadomości..."
              aria-label="Szukaj szablonu"
              onChange={e => setQuery(e.target.value)}
            />
          </SearchWrap>

          <Segmented role="group" aria-label="Filtr szablonów">
            {FILTERS.map(f => (
              <SegmentedButton
                key={f.id}
                type="button"
                $active={filter === f.id}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </SegmentedButton>
            ))}
          </Segmented>

          <CountLabel>
            {visibleCount} z {MESSAGES.length} · {activeCount} aktywnych
          </CountLabel>
        </Toolbar>

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
        onSave={() => { void save().catch(() => undefined); }}
        onDiscard={discard}
        isSaving={isSaving}
        sectionName="Szablony wiadomości"
      />
    </LockedSection>
  );
};
