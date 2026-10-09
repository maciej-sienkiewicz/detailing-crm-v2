// @vitest-environment jsdom
//
// Archiwum zadań: zadanie odłożone przez system (wykonane, statusu nikt nie ruszył
// przez 48 h) nie może wyglądać jak czyjeś usunięcie bez nazwiska.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { ArchivedTask } from '../types';
import { TaskArchiveModal } from './TaskArchiveModal';

const base: ArchivedTask = {
  id: 't1',
  title: 'Zamówić folię PPF',
  meta: null,
  done: true,
  createdAt: '2026-10-01T08:00:00Z',
  createdByUserName: 'Anna Nowak',
  completedAt: '2026-10-05T10:00:00Z',
  completedByUserName: 'Jan Kowalski',
  deletedAt: '2026-10-07T10:20:00Z',
  deletedByUserName: null,
};

let items: ArchivedTask[] = [];
vi.mock('../hooks/useTaskArchive', () => ({
  useTaskArchive: () => ({ items, pagination: undefined, isLoading: false, isError: false }),
}));

const renderArchive = () =>
  render(
    <ThemeProvider theme={theme}>
      <TaskArchiveModal isOpen onClose={vi.fn()} />
    </ThemeProvider>,
  );

describe('TaskArchiveModal', () => {
  it('zadanie zarchiwizowane przez system: bez „Usunięte", z informacją o 48 h', () => {
    items = [{ ...base, archivedAutomatically: true }];
    renderArchive();

    expect(screen.getByText('Zarchiwizowane automatycznie')).toBeInTheDocument();
    expect(screen.getByText('48 h po wykonaniu')).toBeInTheDocument();
    expect(screen.queryByText('Usunięte')).not.toBeInTheDocument();
    // Kto wykonał - zostaje do wglądu.
    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
  });

  it('zadanie usunięte ręcznie zostaje „Usunięte" z nazwiskiem', () => {
    items = [{ ...base, done: false, completedAt: null, completedByUserName: null, deletedByUserName: 'Anna Nowak' }];
    renderArchive();

    expect(screen.getByText('Usunięte')).toBeInTheDocument();
    expect(screen.queryByText('Zarchiwizowane automatycznie')).not.toBeInTheDocument();
  });
});
