// src/modules/activity/components/ActivityRow.test.tsx
// @vitest-environment jsdom
//
// Wiersz Aktywności. Zgłoszenia, które ten test pilnuje:
//  - nazwisko autora było widoczne dopiero po najechaniu myszą, a na telefonie wcale,
//    choć „kto to zrobił" jest pierwszym pytaniem właściciela;
//  - jedno kliknięcie „Wydaj pojazd" dawało kilka osobnych wierszy;
//  - import klientów linkował „Przejdź do klienta" na stronę 404.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ActivityItem } from '../types';
import { ActivityRow } from './ActivityRow';

vi.mock('@/modules/appointments/api/appointmentApi', () => ({
    appointmentApi: { getAppointment: vi.fn() },
}));

const item = (overrides: Partial<ActivityItem> & { id: string }): ActivityItem => ({
    occurredAt: '2026-10-17T13:40:00Z',
    actor: { type: 'EMPLOYEE', typeLabel: 'Pracownik', id: 'u1', displayName: 'Anna Wiśniewska', initials: 'AW' },
    module: { code: 'VISIT', label: 'Wizyty' },
    action: { code: 'VISIT_COMPLETED', label: 'Zakończenie wizyty' },
    severity: { code: 'HIGH', label: 'Istotne' },
    channel: { code: 'TABLET', label: 'Tablet' },
    icon: 'APPROVE',
    title: 'Zakończono wizytę - BMW X5 (KR 4K821)',
    description: null,
    summary: '',
    subject: { resource: 'VISIT', id: 'v1', label: 'BMW X5 (KR 4K821)' },
    related: [{ resource: 'CUSTOMER', id: 'c1', label: 'Tomasz Mazur' }],
    amount: null,
    changes: [],
    changeSummary: null,
    metadata: {},
    correlationId: null,
    ipAddress: null,
    ...overrides,
});

const renderRow = (ui: React.ReactElement) =>
    render(
        <ThemeProvider theme={theme}>
            <MemoryRouter>{ui}</MemoryRouter>
        </ThemeProvider>,
    );

describe('ActivityRow', () => {
    it('pokazuje autora od razu, bez najeżdżania myszą', () => {
        renderRow(<ActivityRow item={item({ id: 'a' })} />);

        expect(screen.getByText('Anna Wiśniewska')).toBeVisible();
        expect(screen.getByText('Tablet')).toBeVisible();
    });

    it('przy kliencie dopisuje „klient" zwykłym tekstem, bez inicjałów', () => {
        renderRow(<ActivityRow item={item({
            id: 'b',
            actor: { type: 'CUSTOMER', typeLabel: 'Klient', id: 'c1', displayName: 'Ewa Dąbrowska', initials: 'ED' },
            channel: { code: 'PUBLIC_LINK', label: 'Link dla klienta' },
        })} />);

        expect(screen.getByText('Ewa Dąbrowska')).toBeInTheDocument();
        expect(screen.getByText('klient')).toBeInTheDocument();
        expect(screen.queryByText('ED')).not.toBeInTheDocument();
    });

    it('chowa kroki jednego kliknięcia pod podpisem, który mówi, co jest w środku', () => {
        const steps = [
            item({ id: 's1', action: { code: 'DOCUMENT_ISSUED', label: 'Wystawienie dokumentu' }, title: 'Wystawiono dokument - PAR/2026/0418' }),
            item({ id: 's2', action: { code: 'SMS_SENT', label: 'Wysłanie SMS' }, title: 'Wysłano SMS - Podziękowanie' }),
        ];
        renderRow(<ActivityRow item={item({ id: 'main' })} steps={steps} stepsLabel="Wystawienie dokumentu i wysłanie SMS" />);

        const toggle = screen.getByRole('button', { name: 'Wystawienie dokumentu i wysłanie SMS' });
        expect(screen.queryByText('Wystawiono dokument - PAR/2026/0418')).not.toBeInTheDocument();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Wystawiono dokument - PAR/2026/0418')).toBeInTheDocument();
        expect(screen.getByText('Wysłano SMS - Podziękowanie')).toBeInTheDocument();
    });

    it('linkuje do wizyty i klienta krótkimi etykietami', () => {
        renderRow(<ActivityRow item={item({ id: 'c' })} />);

        expect(screen.getByRole('link', { name: 'Wizyta' })).toHaveAttribute('href', '/visits/v1');
        expect(screen.getByRole('link', { name: 'Klient' })).toHaveAttribute('href', '/customers/c1');
    });

    it('nie linkuje importu klientów do nieistniejącej karty klienta', () => {
        renderRow(<ActivityRow item={item({
            id: 'd',
            action: { code: 'CUSTOMERS_IMPORTED', label: 'Import klientów' },
            subject: { resource: 'CUSTOMER', id: 'import-session-1', label: null },
            related: [],
        })} />);

        expect(screen.queryByRole('link', { name: 'Klient' })).not.toBeInTheDocument();
    });
});
