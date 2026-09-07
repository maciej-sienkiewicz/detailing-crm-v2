// src/core/errors/AppErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorScreen, UpdatingScreen } from './ErrorScreen';
import { isChunkLoadError, recoverFromChunkError } from './chunkError';

interface Props {
    children: ReactNode;
}

interface State {
    error: unknown;
    /** Chunk padł, ale limit przeładowań jest wyczerpany - pokazujemy błąd. */
    recoveryFailed: boolean;
}

/**
 * Ostatnia linia obrony: łapie błędy renderowania POZA drzewem routera -
 * w providerach (QueryClient, Auth, Theme) i w samym `RouterProvider`.
 * `errorElement` routera ich nie widzi, więc bez tego boundary użytkownik
 * dostałby białą stronę.
 */
export class AppErrorBoundary extends Component<Props, State> {
    state: State = { error: null, recoveryFailed: false };

    static getDerivedStateFromError(error: unknown): Partial<State> {
        return { error };
    }

    componentDidCatch(error: unknown, info: ErrorInfo) {
        if (isChunkLoadError(error)) {
            if (!recoverFromChunkError()) this.setState({ recoveryFailed: true });
            return;
        }
        if (import.meta.env.DEV) console.error('[AppErrorBoundary]', error, info.componentStack);
    }

    render() {
        const { error, recoveryFailed } = this.state;
        if (!error) return this.props.children;

        if (isChunkLoadError(error)) {
            if (!recoveryFailed) return <UpdatingScreen />;
            return (
                <ErrorScreen
                    title="Nie udało się wczytać aplikacji"
                    description="Pobranie najnowszej wersji DetailBoost nie powiodło się. Sprawdź połączenie z internetem i odśwież stronę, a jeśli problem się powtarza - skontaktuj się ze wsparciem DetailBoost."
                    details={error instanceof Error ? `${error.name}: ${error.message}` : String(error)}
                />
            );
        }

        return <ErrorScreen details={error instanceof Error ? `${error.name}: ${error.message}` : String(error)} />;
    }
}
