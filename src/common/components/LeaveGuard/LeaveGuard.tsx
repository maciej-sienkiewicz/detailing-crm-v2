// src/common/components/LeaveGuard/LeaveGuard.tsx
//
// Pytanie przed wyjściem z niezapisanego procesu (np. przyjęcia pojazdu) przez menu,
// link albo „wstecz". Działa tylko pod routerem danych (createBrowserRouter) - w testach
// renderowanych w MemoryRouterze po prostu się nie pokazuje, zamiast wywracać widok.

import { useContext } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';

interface Props {
    /** Czy wyjście ma zostać zatrzymane pytaniem. */
    when: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    /** Wołane, gdy człowiek potwierdzi wyjście - zanim router przejdzie dalej. */
    onLeave?: () => void;
}

const BlockingGuard = ({ when, title, message, confirmText, cancelText, onLeave }: Props) => {
    const blocker = useBlocker(({ currentLocation, nextLocation }) =>
        when && currentLocation.pathname !== nextLocation.pathname);

    return (
        <ConfirmationModal
            isOpen={blocker.state === 'blocked'}
            title={title}
            message={message}
            variant="danger"
            confirmText={confirmText}
            cancelText={cancelText}
            onConfirm={() => {
                onLeave?.();
                blocker.proceed?.();
            }}
            onCancel={() => blocker.reset?.()}
        />
    );
};

export const LeaveGuard = (props: Props) => {
    const dataRouter = useContext(UNSAFE_DataRouterContext);
    return dataRouter ? <BlockingGuard {...props} /> : null;
};
