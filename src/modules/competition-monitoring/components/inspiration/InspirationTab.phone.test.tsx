// @vitest-environment jsdom
//
// Inspiracje na telefonie: post to ~560 px, więc strona ma 8 postów zamiast 24 (komputer
// zostaje przy 24 - to samo zapytanie co wcześniej), „Otwórz" jest ikoną wychodzącą
// z aplikacji, a format ma krótką pierwszą opcję, która mieści się na 360 px.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { instagramApi } from '../../api/instagramApi';
import type { ContentItem } from '../../types';
import { InspirationTab } from './InspirationTab';

vi.mock('../../api/instagramApi', () => ({
    instagramApi: {
        getContent: vi.fn(),
        reactToPost: vi.fn(async () => ({})),
    },
}));

const item = (i: number): ContentItem => ({
    postId: `post-${i}`, profileId: 'p1', username: 'lustro_detailing_wilanow', isSelf: false,
    takenAt: '2026-10-08T10:00:00Z', permalink: `https://www.instagram.com/p/code${i}/`,
    caption: 'Renowacja skóry w Range Rover Velar', likeCount: 120, commentCount: 4, viewCount: null,
    format: 'REELS', topic: 'WNETRZE', topicLabel: 'Detailing wnętrza', isPromo: false, isContest: false,
    erPct: null, engagement: 124, reaction: null, relativeToNorm: 2.4,
});

let desktop = false;
const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });

beforeEach(() => {
    desktop = false;
    setWidth(360);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: desktop, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
    vi.mocked(instagramApi.getContent).mockImplementation(async filters => ({
        items: Array.from({ length: filters.pageSize ?? 24 }, (_, i) => item(i)),
        page: 0,
        pageSize: filters.pageSize ?? 24,
        totalItems: 40,
        topics: [{ value: 'WNETRZE', label: 'Detailing wnętrza', count: 40 }],
    }));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const renderTab = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <InspirationTab onMakeSimilar={vi.fn()} />
            </QueryClientProvider>
        </ThemeProvider>,
    );
};

describe('InspirationTab na telefonie', () => {
    it('pyta o 8 postów, a „Otwórz" to ikona z pełną nazwą dla czytnika', async () => {
        renderTab();

        expect((await screen.findAllByRole('button', { name: /Zrób podobny/ }))).toHaveLength(8);
        expect(instagramApi.getContent).toHaveBeenCalledWith(expect.objectContaining({ page: 0, pageSize: 8 }));
        expect(screen.getAllByRole('link', { name: 'Otwórz post @lustro_detailing_wilanow na Instagramie' }).length)
            .toBeGreaterThanOrEqual(8);
        expect(screen.queryByText('Otwórz')).toBeNull();
        expect(screen.getByRole('button', { name: 'Wszystkie' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Pokaż więcej' })).toBeTruthy();
    });

    it('komputer pyta o 24 posty jak wcześniej', async () => {
        desktop = true;
        setWidth(1280);
        renderTab();

        expect((await screen.findAllByRole('button', { name: /Zrób podobny/ }))).toHaveLength(24);
        expect(instagramApi.getContent).toHaveBeenCalledTimes(1);
        expect(instagramApi.getContent).toHaveBeenCalledWith(expect.objectContaining({ page: 0, pageSize: 24 }));
        expect(screen.getByRole('button', { name: 'Każdy format' })).toBeTruthy();
        expect(screen.getAllByText('Otwórz')).toHaveLength(24);
    });
});
