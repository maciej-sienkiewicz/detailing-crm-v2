// @vitest-environment jsdom
//
// Na karcie wizyty (/visits/:id) menu nie podświetlało niczego, bo lista wizyt mieszka
// pod /operations. Pozycja menu musi być aktywna na wszystkich swoich ścieżkach.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { CalendarCheck, FileText } from 'lucide-react';
import { theme } from '@/common/theme';
import { SidebarMenuItem, type MenuItem } from './SidebarMenuItem';

const visits: MenuItem = { path: '/operations', label: 'Wizyty', icon: CalendarCheck, match: ['/visits', '/checkin'] };
const finance: MenuItem = { path: '/finance', label: 'Finanse', icon: FileText };

const renderAt = (url: string, item: MenuItem) => render(
    <MemoryRouter initialEntries={[url]}>
        <ThemeProvider theme={theme}>
            <SidebarMenuItem item={item} isCollapsed={false} />
        </ThemeProvider>
    </MemoryRouter>,
);

describe('SidebarMenuItem - pozycja aktywna', () => {
    afterEach(cleanup);

    it.each(['/operations', '/visits/v-1', '/checkin/new'])('Wizyty świecą na %s', url => {
        renderAt(url, visits);
        expect(screen.getByRole('link', { name: 'Wizyty' })).toHaveAttribute('aria-current', 'page');
    });

    it('nie świecą na obcej ścieżce, która tylko zaczyna się tak samo', () => {
        renderAt('/visitsettings', visits);
        expect(screen.getByRole('link', { name: 'Wizyty' })).not.toHaveAttribute('aria-current');
    });

    it('dopasowanie po całym segmencie: /finance nie zapala się na /finances', () => {
        renderAt('/finances', finance);
        expect(screen.getByRole('link', { name: 'Finanse' })).not.toHaveAttribute('aria-current');
    });
});
