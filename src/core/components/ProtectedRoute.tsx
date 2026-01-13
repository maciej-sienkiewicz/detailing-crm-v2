import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Przekieruj na stronę logowania jeśli użytkownik nie jest zalogowany
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Pokaż loader podczas sprawdzania autentykacji
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Ładowanie...</div>
      </div>
    );
  }

  // Jeśli nie jest zalogowany, nie renderuj niczego (przekierowanie już się dzieje)
  if (!isAuthenticated) {
    return null;
  }

  // Jeśli jest zalogowany, pokaż chroniony content
  return <>{children}</>;
}
