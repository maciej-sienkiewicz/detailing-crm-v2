// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import * as icons from './menuIcons';

const all = Object.entries(icons).filter(([name]) => name.endsWith('Icon')) as Array<[string, ComponentType]>;

describe('menuIcons', () => {
    it('każda ikona to SVG 24×24 w kolorze tekstu, ukryte przed czytnikiem ekranu', () => {
        expect(all.length).toBe(22);
        all.forEach(([, Icon]) => {
            const { container, unmount } = render(<Icon />);
            const svg = container.querySelector('svg')!;
            expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
            expect(svg.getAttribute('aria-hidden')).toBe('true');
            expect(container.querySelector('[fill="currentColor"]')).not.toBeNull();
            unmount();
        });
    });

    it('dwie kopie tej samej ikony mają własne maski - wycięcia nie znikają w drugiej', () => {
        const { container } = render(<><icons.CalendarIcon /><icons.CalendarIcon /></>);
        const ids = [...container.querySelectorAll('mask')].map(mask => mask.id);
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
        container.querySelectorAll('g[mask]').forEach((g, i) => expect(g.getAttribute('mask')).toBe(`url(#${ids[i]})`));
    });
});
