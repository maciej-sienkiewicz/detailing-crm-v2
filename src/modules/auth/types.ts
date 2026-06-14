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
    firstName?: string;
    lastName?: string;
    role: string;
    subscriptionStatus: string;
    trialDaysRemaining: number;
    mobileToken?: string | null;
}

export interface CheckAuthResponse {
    success: boolean;
    message?: string | null;
    redirectUrl?: string | null;
    user: User | null;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message: string;
}

export interface ValidateResetTokenResponse {
    valid: boolean;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
    confirmPassword: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message: string;
}

export interface ResetPasswordError {
    error: string;
    message: string;
    timestamp: string;
}

export interface DemoAccountResponse {
    success: boolean;
    message: string;
    expiresAt: string;
    auth: {
        success: boolean;
        message: string | null;
        redirectUrl: string | null;
        user: {
            userId: string;
            studioId: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            subscriptionStatus: string;
            daysRemaining: number | null;
            mobileToken: string | null;
        } | null;
    };
}