import { MESSAGES } from '../catalog';

/**
 * Backend rule keys ('postVisit') and rehearsal `kind` values ('SMS_POST_VISIT') are the
 * same identifier in two cases: `SMS_${SNAKE(ruleKey)}` / `EMAIL_${SNAKE(ruleKey)}`.
 */
const toSnakeUpper = (camel: string): string =>
  camel.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

const KIND_TO_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  MESSAGES.forEach(spec => {
    if (spec.sms) map[`SMS_${toSnakeUpper(spec.sms.ruleKey)}`] = spec.name;
    if (spec.email) map[`EMAIL_${toSnakeUpper(spec.email.ruleKey)}`] = spec.name;
  });
  return map;
})();

/**
 * The rehearsal report identifies a template by its backend enum name
 * (`SMS_VISIT_READY_FOR_PICKUP`) - meaningful to a developer, not to the studio reading
 * the report. This resolves it back to the same name shown on the templates screen
 * ("Pojazd gotowy do odbioru"). An unmapped kind (a marketing campaign, a future
 * message type not yet in the catalog) falls back to the raw value rather than hiding it.
 */
export const describeMessageKind = (kind: string): string => KIND_TO_NAME[kind] ?? kind;
