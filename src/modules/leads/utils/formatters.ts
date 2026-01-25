// src/modules/leads/utils/formatters.ts

/**
 * Format a value in grosze to PLN currency string
 * @param valueInGrosze - Value in grosze (cents), e.g., 250000 = 2500.00 PLN
 * @returns Formatted string, e.g., "2 500 PLN"
 */
export function formatCurrency(valueInGrosze: number): string {
  // Convert grosze to PLN
  const valueInPLN = valueInGrosze / 100;

  // Format with space as thousand separator (Polish convention)
  const formatted = valueInPLN.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${formatted} PLN`;
}

/**
 * Parse a PLN currency string back to grosze
 * Handles various input formats like "2500", "2 500", "2500.00", "2,500.00"
 * @param value - String value to parse
 * @returns Value in grosze, or 0 if invalid
 */
export function parseCurrencyToGrosze(value: string): number {
  if (!value || value.trim() === '') return 0;

  // Remove PLN suffix and trim
  let cleaned = value.replace(/PLN/gi, '').trim();

  // Replace space separators and comma decimal separator
  cleaned = cleaned.replace(/\s/g, ''); // Remove spaces
  cleaned = cleaned.replace(/,/g, '.'); // Convert comma to dot for parsing

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) return 0;

  // Convert PLN to grosze (multiply by 100)
  // Use Math.round to avoid floating-point precision issues
  return Math.round(parsed * 100);
}

/**
 * Format a phone number to Polish format
 * @param phone - Raw phone number
 * @returns Formatted string, e.g., "+48 123 456 789"
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with 48 (no +), add +
  if (cleaned.startsWith('48') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // If it doesn't start with +48, assume Polish number
  if (!cleaned.startsWith('+')) {
    cleaned = '+48' + cleaned;
  }

  // Format: +48 XXX XXX XXX
  if (cleaned.startsWith('+48') && cleaned.length >= 12) {
    const countryCode = cleaned.slice(0, 3);
    const rest = cleaned.slice(3);
    const parts = rest.match(/.{1,3}/g) || [];
    return `${countryCode} ${parts.join(' ')}`;
  }

  // Return original if can't format
  return phone;
}

/**
 * Truncate an email address for display
 * @param email - Full email address
 * @param maxLength - Maximum length before truncation
 * @returns Truncated email with ellipsis, or original if short enough
 */
export function truncateEmail(email: string, maxLength: number = 25): string {
  if (!email || email.length <= maxLength) return email;

  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    // Not a valid email, just truncate
    return email.slice(0, maxLength - 3) + '...';
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  // If domain is too long, truncate it
  if (domain.length > maxLength / 2) {
    const truncatedDomain = domain.slice(0, Math.floor(maxLength / 2) - 3) + '...';
    const availableForLocal = maxLength - truncatedDomain.length;
    const truncatedLocal =
      localPart.length > availableForLocal
        ? localPart.slice(0, availableForLocal - 3) + '...'
        : localPart;
    return truncatedLocal + truncatedDomain;
  }

  // Truncate local part
  const availableForLocal = maxLength - domain.length;
  if (localPart.length > availableForLocal) {
    return localPart.slice(0, availableForLocal - 3) + '...' + domain;
  }

  return email;
}

/**
 * Format contact identifier based on whether it looks like a phone or email
 * @param contact - Contact identifier
 * @returns Formatted contact string
 */
export function formatContactIdentifier(contact: string): string {
  if (!contact) return '';

  // Check if it's an email (contains @)
  if (contact.includes('@')) {
    return truncateEmail(contact);
  }

  // Assume it's a phone number
  return formatPhoneNumber(contact);
}

/**
 * Check if a string is likely a phone number
 */
export function isPhoneNumber(value: string): boolean {
  // Remove spaces and check if it's mostly digits with optional +
  const cleaned = value.replace(/\s/g, '');
  return /^[+]?\d{7,15}$/.test(cleaned);
}

/**
 * Check if a string is likely an email address
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Format a date to Polish locale
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date with time to Polish locale
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "5 min ago", "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;

  return formatDate(dateString);
}
