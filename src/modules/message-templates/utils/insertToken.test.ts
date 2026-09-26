import { describe, expect, it } from 'vitest';
import { insertToken } from './insertToken';

describe('insertToken', () => {
  it('inserts at the caret, not at the end', () => {
    expect(insertToken('Dzień dobry, !', '{{imie}}', 13, 13)).toEqual({ text: 'Dzień dobry, {{imie}}!', caret: 21 });
  });

  it('replaces the selected text', () => {
    expect(insertToken('Cześć Jan, auto gotowe', '{{imie}}', 6, 9)).toEqual({ text: 'Cześć {{imie}}, auto gotowe', caret: 14 });
  });

  it('appends when the field never had a caret', () => {
    expect(insertToken('Hej ', '{{imie}}', null, null)).toEqual({ text: 'Hej {{imie}}', caret: 12 });
  });

  it('clamps a stale caret beyond the text', () => {
    expect(insertToken('abc', 'X', 10, 10)).toEqual({ text: 'abcX', caret: 4 });
  });
});
