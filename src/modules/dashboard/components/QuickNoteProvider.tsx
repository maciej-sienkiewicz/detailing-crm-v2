// src/modules/dashboard/components/QuickNoteProvider.tsx
//
// Okno „Nowa notatka" dostępne z KAŻDEGO widoku (skrót Z).
//
// Montowane raz w Layoucie i nasłuchujące zdarzenia z modułu skrótów, zamiast
// kontekstu przekazywanego przez pół aplikacji - nasłuch nie zmusza żadnego
// widoku po drodze do wiedzy o notatkach.
//
// Świadomie NIE używa useTasks(): ten hook ciągnie listę zadań zapytaniem, a
// prowizorka wisiałaby wtedy na każdym ekranie aplikacji. Tu potrzebna jest
// sama mutacja tworzenia; listę odświeża unieważnienie klucza, gdy panel zadań
// akurat jest zamontowany. ModalShell przy zamkniętym oknie zwraca null, więc
// dopóki nikt nie naciśnie Z, ten komponent nic nie renderuje ani nie pobiera.
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUICK_NOTE_EVENT } from '@/common/shortcuts';
import { usePermissions } from '@/core/permissions';
import { tasksApi } from '../api/tasksApi';
import { TASKS_QUERY_KEY } from '../hooks/useTasks';
import type { CreateTaskPayload } from '../types';
import { TaskModal } from './TaskModal';

export function QuickNoteProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    // Notatka to nowe zadanie (TASKS_MANAGE) - bez uprawnienia skrót nic nie otwiera,
    // zamiast okna, którego zapis serwer i tak odrzuci.
    const canCreate = usePermissions().can('TASKS_MANAGE');

    const createTask = useMutation({
        mutationFn: (payload: CreateTaskPayload) => tasksApi.create(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
    });

    useEffect(() => {
        if (!canCreate) return;
        const open = () => setIsOpen(true);
        window.addEventListener(QUICK_NOTE_EVENT, open);
        return () => window.removeEventListener(QUICK_NOTE_EVENT, open);
    }, [canCreate]);

    const handleSave = useCallback(
        async (payload: CreateTaskPayload) => {
            await createTask.mutateAsync(payload);
        },
        [createTask],
    );

    return (
        <>
            {children}
            <TaskModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={handleSave} />
        </>
    );
}
