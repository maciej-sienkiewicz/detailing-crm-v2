// src/modules/auth/utils/passwordStrength.ts
import { PasswordStrength } from '../types';
import { t } from '@/common/i18n';

export const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password || password.length < 8) {
        return {
            score: 0,
            label: 'weak',
            color: '#dc2626',
        };
    }

    let score = 0;

    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 2) {
        return {
            score: 1,
            label: 'weak',
            color: '#dc2626',
        };
    }

    if (score <= 4) {
        return {
            score: 2,
            label: 'medium',
            color: '#d97706',
        };
    }

    return {
        score: 3,
        label: 'strong',
        color: '#16a34a',
    };
};

export const getPasswordStrengthLabel = (strength: PasswordStrength['label']): string => {
    return t.auth.signup.passwordStrength[strength];
};