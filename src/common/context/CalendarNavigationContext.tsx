import React, { createContext, useContext, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnimPhase = 'idle' | 'to-center' | 'centered' | 'to-cell' | 'done';

export interface CardSnapshot {
  id: string;
  label: string;       // "Brand Model"
  customer: string;
  amount: string;
  accentColor: string;
  sourceRect: DOMRect;
  scheduledDate?: string;
}

interface ContextValue {
  phase: AnimPhase;
  card: CardSnapshot | null;
  targetRect: DOMRect | null;
  start: (snap: CardSnapshot, doNavigate: () => void) => void;
  reportTargetRect: (rect: DOMRect) => void;
  finish: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CalendarNavigationContext = createContext<ContextValue | null>(null);

export const useCalendarNavigation = () => {
  const ctx = useContext(CalendarNavigationContext);
  if (!ctx) throw new Error('useCalendarNavigation must be used inside CalendarNavigationProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CalendarNavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [card, setCard] = useState<CardSnapshot | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
  };

  const start = (snap: CardSnapshot, doNavigate: () => void) => {
    clearTimers();
    setTargetRect(null);
    setCard(snap);
    setPhase('to-center');

    // Navigate after card starts moving so calendar loads behind it
    schedule(doNavigate, 320);

    // Card arrives at center
    schedule(() => setPhase('centered'), 520);
  };

  const reportTargetRect = (rect: DOMRect) => {
    setTargetRect(rect);
    setPhase('to-cell');
    schedule(() => setPhase('done'), 600);
    schedule(() => {
      setPhase('idle');
      setCard(null);
      setTargetRect(null);
    }, 750);
  };

  const finish = () => {
    clearTimers();
    setPhase('idle');
    setCard(null);
    setTargetRect(null);
  };

  return (
    <CalendarNavigationContext.Provider value={{ phase, card, targetRect, start, reportTargetRect, finish }}>
      {children}
    </CalendarNavigationContext.Provider>
  );
};
