// src/modules/auth/index.ts
export { LoginView } from './views/LoginView';
export { SignupView } from './views/SignupView';
export { ForgotPasswordView } from './views/ForgotPasswordView';
export { ResetPasswordView } from './views/ResetPasswordView';
export { useLogin, useSignup, useLogout } from './hooks/useAuth';
export type { LoginCredentials, SignupCredentials, AuthResponse } from './types';