import type { RehearsalFinding } from '../types';

/**
 * Próba generalna zgłaszała problemy tak, jak je widzi kod: `sms-too-long ("5 segmentów")`.
 * To jest dokładnie to, na co skarży się biznes - właściciel studia nie wie, co to
 * "sms-too-long" ani co ma z tym zrobić. Ta funkcja tłumaczy każdą regułę backendu
 * (RenderedMessageValidator.kt) na jedno zdanie: co jest nie tak i co poprawić.
 *
 * Nieznana reguła (nowa, jeszcze nieopisana tutaj) nie znika po cichu - wraca jako
 * `rule: detail`, żeby ktoś zauważył brakujący przypadek zamiast dostać pustkę.
 */

const numberIn = (detail: string): number | null => {
  const match = /(\d+)/.exec(detail);
  return match ? Number(match[1]) : null;
};

const placeholderIn = (detail: string): string | null => {
  const match = /\{\{\s*([a-z0-9_]+)\s*\}\}/i.exec(detail);
  return match ? match[1] : null;
};

export function describeFinding(finding: RehearsalFinding): string {
  const { rule, detail } = finding;

  switch (rule) {
    case 'sms-too-long': {
      const segments = numberIn(detail);
      return `Wiadomość jest za długa${segments ? ` (zajęłaby ${segments} SMS-y)` : ''} - skróć treść, żeby zmieściła się w maksymalnie 3 SMS-ach.`;
    }
    case 'sms-long': {
      const segments = numberIn(detail);
      return `Wiadomość jest dość długa${segments ? ` (zajęłaby ${segments} SMS-y)` : ''} - warto ją skrócić, żeby ograniczyć koszt wysyłki.`;
    }
    case 'body-empty':
      return 'Treść wiadomości jest pusta - nic by nie zostało wysłane. Uzupełnij szablon.';
    case 'subject-empty':
      return 'Temat e-maila jest pusty. Uzupełnij szablon.';
    case 'subject-multiline':
      return 'Temat e-maila zawiera znak nowej linii, czego nie da się wysłać - popraw temat, żeby zmieścił się w jednej linii.';
    case 'subject-long': {
      const chars = numberIn(detail);
      return `Temat e-maila jest długi${chars ? ` (${chars} znaków)` : ''} - część skrzynek pocztowych obetnie go w podglądzie. Skróć temat.`;
    }
    case 'body-suspiciously-short': {
      const chars = numberIn(detail);
      return `Treść e-maila jest bardzo krótka${chars ? ` (${chars} znaków)` : ''} - sprawdź, czy szablon nie jest niekompletny.`;
    }
    case 'html-in-sms':
    case 'html-in-plaintext-email':
      return `W treści jest fragment kodu HTML („${detail}”), który klient zobaczyłby dosłownie - usuń go z szablonu.`;
    case 'placeholder-with-diacritics':
      return `Zmienna „${detail}” zawiera polskie litery, a nazwy zmiennych ich nie mają - sprawdź pisownię (np. {{imie}} zamiast {{imię}}).`;
    case 'orphan-braces':
      return `W treści są niesparowane nawiasy klamrowe („${detail}”) - sprawdź, czy każda zmienna wygląda dokładnie tak: {{nazwa}}.`;
    case 'template-leftover':
      return `W treści został fragment, który wygląda na resztkę kodu („${detail}”) - usuń go z szablonu.`;
    case 'value-missing': {
      const placeholder = placeholderIn(detail);
      return placeholder
        ? `Zmienna {{${placeholder}}} nie pojawia się w wysłanej wiadomości, mimo że powinna - sprawdź, czy nie zniknęła z treści szablonu.`
        : `Jedna ze zmiennych nie pojawia się w wysłanej wiadomości (${detail}) - sprawdź treść szablonu.`;
    }
    case 'required-empty':
      return `Zmienna ${detail} jest pusta, a wiadomość bez niej nie może pójść - sprawdź dane klienta albo treść szablonu.`;
    case 'link-format':
      return `Link „${detail}” wygląda na niepoprawny - powinien zaczynać się od https:// i nie zawierać spacji.`;
    case 'date-without-year':
      return 'W treści nie ma pełnej daty z rokiem (np. 15.09.2026) - klient może źle odczytać, o który dzień chodzi.';
    case 'whitespace':
      return 'W treści są zbędne spacje (podwójne albo na początku/końcu) - popraw wygląd wiadomości.';
    case 'template-empty':
      return detail || 'Szablon jest pusty - nic by nie zostało wysłane.';
    default:
      return detail ? `${rule}: ${detail}` : rule;
  }
}
