// Liczenie segmentów SMS: te same reguły co backendowy SmsSegmentCalculator
// (GSM-7: 160/153, UCS-2 przy polskich znakach: 70/67).

const GSM7 = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà' +
    '^{}\\[~]|€'
);

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7.has(ch)) return false;
  }
  return true;
}

export interface SmsMeta {
  length: number;
  encoding: 'GSM-7' | 'UCS-2';
  segments: number;
  charsPerSegment: number;
}

export function smsMeta(text: string): SmsMeta {
  const gsm = isGsm7(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments =
    text.length === 0 ? 0 : text.length <= single ? 1 : Math.ceil(text.length / multi);
  return {
    length: text.length,
    encoding: gsm ? 'GSM-7' : 'UCS-2',
    segments,
    charsPerSegment: segments <= 1 ? single : multi,
  };
}
