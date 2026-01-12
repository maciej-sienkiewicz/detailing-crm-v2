// src/modules/auth/index.ts
export { LoginView } from './views/LoginView';
export { SignupView } from './views/SignupView';
export { useLogin, useSignup, useLogout } from './hooks/useAuth';
export type { LoginCredentials, SignupCredentials, AuthResponse } from './types';