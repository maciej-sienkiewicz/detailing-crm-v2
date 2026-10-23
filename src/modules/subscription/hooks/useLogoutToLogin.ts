import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { authApi } from '@/modules/auth/api/authApi';

/**
 * Wylogowanie z ekranów, które przykrywają całą aplikację razem z menu (wybór pakietu,
 * pakiet wygasł, konto nieaktywne). Bez niego pracownik studia z wygasłym pakietem nie
 * mógł nawet przełączyć się na inne konto - jedynym wyjściem było wyczyszczenie ciasteczek.
 */
export function useLogoutToLogin() {
    const { setAuthenticated } = useAuth();
    const navigate = useNavigate();
    return useCallback(async () => {
        try {
            await authApi.logout();
        } catch {
            // Sesja i tak wygaśnie; ważne, żeby ten ekran zniknął.
        }
        setAuthenticated(false);
        navigate('/login');
    }, [setAuthenticated, navigate]);
}
