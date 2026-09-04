// src/modules/comms/hooks/useLeadStatusChange.tsx
// Zmiana statusu leada w jednym miejscu - razem z jedynym wyjątkiem od reguły
// „jedno kliknięcie, jeden status": przegrana wymaga powodu.
//
// Ten wyjątek żyje tu, a nie w każdym wywołującym, bo wywołujących jest już
// trzech (tabela leadów, okno szczegółów, chmurka edycji komórki), a pytanie
// o powód musi w każdym z nich wyglądać i działać tak samo.
import { useState } from 'react';
import { useToast } from '@/common/components/Toast';
import { LeadLostReasonDialog } from '../components/LeadLostReasonDialog';
import { useChangeLeadStatus } from './useLeads';
import type { LeadStatus } from '../types';

export interface LeadStatusChange {
    /** Przestaw status; „przegrany" najpierw zapyta o powód. */
    requestStatus: (leadId: string, status: LeadStatus) => void;
    /** Otwórz samo pytanie o powód - dla wywołujących, którzy już wiedzą, że to przegrana. */
    requestLost: (leadId: string) => void;
    isPending: boolean;
    /** Okno powodu przegranej - wstaw je w drzewo, inaczej pytanie nigdy nie padnie. */
    lostDialog: React.ReactNode;
}

export function useLeadStatusChange(): LeadStatusChange {
    const [lostDialogFor, setLostDialogFor] = useState<string | null>(null);
    const changeStatus = useChangeLeadStatus();
    const { showError } = useToast();

    const requestStatus = (leadId: string, status: LeadStatus) => {
        if (status === 'LOST') {
            setLostDialogFor(leadId);
            return;
        }
        changeStatus.mutate(
            { leadId, status },
            {
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    showError('Nie udało się zmienić statusu', message);
                },
            }
        );
    };

    return {
        requestStatus,
        requestLost: setLostDialogFor,
        isPending: changeStatus.isPending,
        lostDialog: lostDialogFor ? (
            <LeadLostReasonDialog
                // Remount na każde otwarcie zeruje wybór bez efektu synchronizującego stan.
                key={lostDialogFor}
                leadId={lostDialogFor}
                onClose={() => setLostDialogFor(null)}
            />
        ) : null,
    };
}
