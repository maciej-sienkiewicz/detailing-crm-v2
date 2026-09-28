import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvalidationBatcher, type InvalidationBatch } from './invalidationBatcher';

// Pierwszy import skrzynki: jedno zdarzenie na wiadomość. Setki zdarzeń w oknie
// mają dać jedno odświeżenie list, a nie setki (limit żądań całego biura).
describe('createInvalidationBatcher', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('dwieście zdarzeń w oknie to jedno odświeżenie, z każdym wątkiem raz', () => {
        const flushed: InvalidationBatch[] = [];
        const batcher = createInvalidationBatcher(batch => flushed.push(batch), 1500);

        for (let i = 0; i < 200; i++) batcher.add({ threadLists: true, leads: true, threadId: `t-${i % 3}` });
        expect(flushed).toHaveLength(0);

        vi.advanceTimersByTime(1500);

        expect(flushed).toHaveLength(1);
        expect(flushed[0].threadLists).toBe(true);
        expect(flushed[0].leads).toBe(true);
        expect([...flushed[0].threadIds].sort()).toEqual(['t-0', 't-1', 't-2']);
    });

    it('zdarzenie „przeczytano" nie odświeża leadów', () => {
        const flushed: InvalidationBatch[] = [];
        const batcher = createInvalidationBatcher(batch => flushed.push(batch), 1500);

        batcher.add({ threadLists: true, threadId: 't-1' });
        vi.advanceTimersByTime(1500);

        expect(flushed[0].leads).toBe(false);
    });

    it('kolejne okno zaczyna się od pustej paczki', () => {
        const flushed: InvalidationBatch[] = [];
        const batcher = createInvalidationBatcher(batch => flushed.push(batch), 1500);

        batcher.add({ threadId: 't-1' });
        vi.advanceTimersByTime(1500);
        batcher.add({ threadId: 't-2' });
        vi.advanceTimersByTime(1500);

        expect(flushed.map(b => [...b.threadIds])).toEqual([['t-1'], ['t-2']]);
    });

    it('po odmontowaniu nic już nie odświeża', () => {
        const onFlush = vi.fn();
        const batcher = createInvalidationBatcher(onFlush, 1500);

        batcher.add({ threadLists: true });
        batcher.dispose();
        vi.advanceTimersByTime(5000);

        expect(onFlush).not.toHaveBeenCalled();
    });
});
