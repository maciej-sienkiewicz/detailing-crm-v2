// src/common/components/ui
//
// Wspólne klocki widoku wizyty i zleceń zbiorczych. Zanim coś zbudujesz lokalnie
// (kolejny `ActionBtn`, `PillBtn`, `SidebarCard`), sprawdź, czy nie ma tego tutaj.
// Reguły, na których stoją (jedno wypełnienie, jedno wyniesienie, odcień = znaczenie),
// są w CLAUDE.md §2.

export { ui, touch } from './tokens';
export { Button, ButtonLabel, ButtonLink } from './Button';
export { buttonStyles } from './buttonStyles';
export type { ButtonProps, ButtonSize, ButtonVariant, ButtonStyleProps } from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { StatusPill } from './StatusPill';
export type { PillTone } from './StatusPill';
export { SummaryStrip } from './SummaryStrip';
export { Card, Panel, PanelHead, PanelActions, PanelBody } from './Surface';
export { SectionTitle } from './SectionTitle';
export { PriceButton, PriceSub } from './PriceButton';
export { FieldRow, FieldList } from './FieldRow';
export { Segmented } from './Segmented';
export type { SegmentedOption } from './Segmented';
export { SideDrawer, DrawerBody, DrawerMeta, DrawerFooterSpacer } from './SideDrawer';
export { ActionMenu, MenuItem, MenuDivider } from './ActionMenu';
export { useActionMenu } from './useActionMenu';
export type { MenuState } from './useActionMenu';
export { Notice } from './Notice';
export { ChoiceCard, ChoiceList } from './ChoiceCard';
export { StepPills } from './StepPills';
export type { StepState } from './StepPills';
