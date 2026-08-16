import React from 'react';
import { RuleRow } from './RuleRow';
import {
  Empty,
  StageCaption,
  StageIndex,
  StageLabel,
  StageRow,
  Table,
  TableScroll,
  Th,
  stageAccent,
} from './primitives';
import { MESSAGES, STAGES, type MessageSpec } from '../catalog';
import type { Channel, ChannelDraft, MessageKey, TemplatesDraft } from '../types';

export interface TemplatesTableProps {
  draft: TemplatesDraft;
  matches: (spec: MessageSpec) => boolean;
  onOpen: (key: MessageKey) => void;
  onToggle: (key: MessageKey, channel: Channel) => void;
}

export const TemplatesTable: React.FC<TemplatesTableProps> = ({
  draft,
  matches,
  onOpen,
  onToggle,
}) => {
  const visible = MESSAGES.filter(matches);

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            <Th>Wiadomość</Th>
            <Th $w="132px">Kanał</Th>
            <Th $w="210px">Kiedy wychodzi</Th>
            <Th $w="44px" aria-label="Edytuj" />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <Empty>Żaden szablon nie pasuje do wyszukiwania.</Empty>
              </td>
            </tr>
          ) : (
            STAGES.map((stage, index) => {
              const rows = visible.filter(spec => spec.stage === stage.id);
              if (rows.length === 0) return null;

              const accent = stageAccent(stage.id);

              return (
                <React.Fragment key={stage.id}>
                  <StageRow $accent={accent.base} $tint={accent.tint}>
                    <td colSpan={4}>
                      <StageLabel $deep={accent.deep}>
                        <StageIndex $accent={accent.base}>{index + 1}</StageIndex>
                        {stage.title}
                        <StageCaption>· {stage.caption}</StageCaption>
                      </StageLabel>
                    </td>
                  </StageRow>

                  {rows.map(spec => (
                    <RuleRow
                      key={spec.key}
                      spec={spec}
                      accent={accent.base}
                      drafts={draft[spec.key] as Partial<Record<Channel, ChannelDraft>>}
                      onOpen={() => onOpen(spec.key)}
                      onToggle={channel => onToggle(spec.key, channel)}
                    />
                  ))}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </Table>
    </TableScroll>
  );
};
