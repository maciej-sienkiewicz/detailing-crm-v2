import { pl } from './pl';
import type { TranslationKeys } from './types';

export type { TranslationKeys } from './types';

type SupportedLocale = 'pl';

const translations: Record<SupportedLocale, TranslationKeys> = {
    pl,
};

const currentLocale: SupportedLocale = 'pl';

export const t = translations[currentLocale];

export const getTranslation = (locale: SupportedLocale = 'pl'): TranslationKeys => {
    return translations[locale];
};

export const interpolate = (text: string, params: Record<string, string>): string => {
    return Object.entries(params).reduce((result, [key, value]) => {
        return result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }, text);
};