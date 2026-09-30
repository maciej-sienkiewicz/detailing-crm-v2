// src/common/components/PageChrome/PageChromeProvider.tsx
//
// Rama, która pilnuje niezapisanych zmian: zbiera zgłoszenia sekcji (usePageDirty),
// zatrzymuje wyjście z sekcji oknem potwierdzenia, a zamknięcie karty - pytaniem
// przeglądarki. Ustawienia i Pracownicy dostarczają ją tak samo.
//
// Co jest „wyjściem z sekcji", wie tylko rama: w Ustawieniach to także zmiana `?tab=`
// i `?view=` (sekcje dzielą ścieżkę), w Pracownikach wystarczy zmiana ścieżki, bo
// każda zakładka ma własną. Stąd `leavesSection`.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBlocker, type Location } from 'react-router-dom';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { PageChromeContext, type PageChromeValue } from './pageChrome';

const pathnameChanged = (current: Location, next: Location) => current.pathname !== next.pathname;

interface Props {
    /** Kontener nagłówka, do którego sekcje wstawiają akcje (ref ustawiony przez ramę). */
    headerActions: HTMLElement | null;
    /** Czy przejście z `current` do `next` odmontowuje sekcję z edycją. Domyślnie: inna ścieżka. */
    leavesSection?: (current: Location, next: Location) => boolean;
    children: ReactNode;
}

export function PageChromeProvider({ headerActions, leavesSection = pathnameChanged, children }: Props) {
    const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(() => new Set());
    const setDirty = useCallback((id: string, dirty: boolean) => {
        setDirtyIds(prev => {
            if (prev.has(id) === dirty) return prev;
            const next = new Set(prev);
            if (dirty) next.add(id); else next.delete(id);
            return next;
        });
    }, []);
    const isDirty = dirtyIds.size > 0;

    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        isDirty && leavesSection(currentLocation, nextLocation));

    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    const value = useMemo<PageChromeValue>(() => ({ setDirty, headerActions }), [setDirty, headerActions]);

    return (
        <PageChromeContext.Provider value={value}>
            {children}
            <ConfirmationModal
                isOpen={blocker.state === 'blocked'}
                title="Porzucić niezapisane zmiany?"
                message="W tej sekcji są zmiany, których nie zapisano. Jeśli teraz wyjdziesz, przepadną."
                variant="danger"
                confirmText="Porzuć zmiany"
                cancelText="Wróć do edycji"
                onConfirm={() => {
                    setDirtyIds(new Set());
                    blocker.proceed?.();
                }}
                onCancel={() => blocker.reset?.()}
            />
        </PageChromeContext.Provider>
    );
}
