import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ChannelEditor } from './ChannelEditor';
import { CHANNEL_LABEL, type MessageSpec } from '../catalog';
import { channelStatus } from '../utils/template';
import type { Channel, ChannelDraft } from '../types';

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  background: ${st.bgOverlay};
  z-index: 1200;
  animation: fade 180ms ease;

  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
`;

const Panel = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(560px, 100%);
  background: ${st.bgCard};
  box-shadow: ${st.shadowLg};
  z-index: 1201;
  display: flex;
  flex-direction: column;
  animation: slide 220ms cubic-bezier(0.32, 0.72, 0, 1);

  @keyframes slide { from { transform: translateX(100%); } to { transform: none; } }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Head = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 22px;
  border-bottom: 1px solid ${st.border};
`;

const Title = styled.h2`
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: ${st.text};
`;

const Close = styled.button`
  margin-left: auto;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid ${st.border};
  border-radius: 8px;
  background: ${st.bgCard};
  color: ${st.textSecondary};
  cursor: pointer;

  &:hover { background: ${st.bgCardAlt}; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 10px 22px 0;
  border-bottom: 1px solid ${st.border};
`;

const Tab = styled.button<{ $active: boolean }>`
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${p => (p.$active ? st.accentBlue : st.textMuted)};
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 2px solid ${p => (p.$active ? st.accentBlue : 'transparent')};
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Dot = styled.span<{ $on: boolean; $blank: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => (p.$blank ? st.accentAmber : p.$on ? st.accentGreen : st.borderHover)};
`;

export interface RuleDrawerProps {
  spec: MessageSpec;
  drafts: Partial<Record<Channel, ChannelDraft>>;
  initialChannel: Channel;
  onPatch: (channel: Channel, patch: Partial<ChannelDraft>) => void;
  onClose: () => void;
}

/**
 * Full configuration for one message, in a side panel rather than a modal: the list stays
 * visible (studios usually adjust several rules in a row), the form is tall and narrow,
 * and the SMS preview can live inline instead of stacking a modal on a modal.
 */
export const RuleDrawer: React.FC<RuleDrawerProps> = ({
  spec,
  drafts,
  initialChannel,
  onPatch,
  onClose,
}) => {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const panelRef = useRef<HTMLElement>(null);

  // Focus i blokada przewijania tła - raz, przy otwarciu panelu.
  //
  // Wcześniej siedziały w jednym efekcie z obsługą Escape, zależnym od `onClose`.
  // Rodzic przekazuje tam funkcję tworzoną w locie, więc każdy render (a render
  // leci po KAŻDYM wpisanym znaku, bo treść szablonu jest stanem rodzica)
  // uruchamiał efekt od nowa i przestawiał focus z pola na sam panel: znak
  // wchodził jeden, a potem trzeba było klikać w pole ponownie.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape zamyka panel. Ten efekt może się przepinać przy zmianie `onClose` -
  // podmiana nasłuchu jest niewidoczna dla użytkownika, w odróżnieniu od focusu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const available = (['sms', 'email'] as Channel[]).filter(c => drafts[c]);
  const draft = drafts[channel];

  return createPortal(
    <>
      <Scrim onClick={onClose} />
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={spec.name}
        tabIndex={-1}
      >
        <Head>
          <Title>{spec.name}</Title>
          <Close type="button" onClick={onClose} aria-label="Zamknij">✕</Close>
        </Head>

        {available.length > 1 && (
          <Tabs role="tablist">
            {available.map(c => {
              const status = channelStatus(drafts[c], c === 'email');
              return (
                <Tab
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={channel === c}
                  $active={channel === c}
                  onClick={() => setChannel(c)}
                >
                  <Dot $on={status === 'on'} $blank={status === 'blank'} />
                  {CHANNEL_LABEL[c]}
                </Tab>
              );
            })}
          </Tabs>
        )}

        {draft && (
          <ChannelEditor
            spec={spec}
            channel={channel}
            draft={draft}
            onPatch={patch => onPatch(channel, patch)}
          />
        )}
      </Panel>
    </>,
    document.body
  );
};
