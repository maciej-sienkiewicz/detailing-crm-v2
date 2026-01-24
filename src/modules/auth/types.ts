// src/modules/auth/types.ts

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface SignupCredentials {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    redirectUrl?: string;
    user?: User | null;
}

export interface AuthError {
    field?: string;
    message: string;
}

export interface PasswordStrength {
    score: 0 | 1 | 2 | 3;
    label: 'weak' | 'medium' | 'strong';
    color: string;
}

export interface User {
    userId: string;
    studioId: string;
    email: string;
    role: string;
    subscriptionStatus: string;
    trialDaysRemaining: number;
}

export interface CheckAuthResponse {
    success: boolean;
    message?: string | null;
    redirectUrl?: string | null;
    user: User | null;
}