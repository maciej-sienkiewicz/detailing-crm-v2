import { Panel, PanelBody, PanelHead, SectionTitle, Segmented, type SegmentedOption } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import { usePostingPlan } from '../../hooks/useAccounts';
import { Loading, Muted } from './accountsStyles';

/**
 * Plan publikacji: ile postów w tygodniu studio chce dawać. Z niego Przegląd liczy
 * „Posty w październiku: 3 z 8" i przypomina o publikacji, gdy studio jest za planem.
 *
 * 1-7, bo tak publikuje studio detailingowe; plan ustawiony wyżej (do 21) dostaje
 * własną opcję, zamiast zniknąć z przełącznika.
 */
const COMMON = ['1', '2', '3', '4', '5', '6', '7'];

export const PostingPlanPanel = () => {
    const { query, save } = usePostingPlan();
    // Przełącznik reaguje od razu - zapis trwa chwilę, a cofnięty klawisz wygląda jak błąd.
    const goal = save.isPending && save.variables ? save.variables.weeklyPostGoal : query.data?.weeklyPostGoal;
    const values = goal && !COMMON.includes(String(goal)) ? [...COMMON, String(goal)] : COMMON;
    const options: SegmentedOption<string>[] = values.map(value => ({ value, label: value }));

    return (
        <Panel aria-label="Plan publikacji">
            <PanelHead>
                <SectionTitle
                    count={goal ? `${goal} ${pluralPl(goal, 'post', 'posty', 'postów')} w tygodniu` : undefined}
                >
                    Plan publikacji
                </SectionTitle>
            </PanelHead>
            <PanelBody>
                {query.isLoading || goal === undefined ? (
                    <Loading>Wczytuję…</Loading>
                ) : (
                    <>
                        <Segmented
                            label="Posty w tygodniu"
                            size="sm"
                            block
                            options={options}
                            value={String(goal)}
                            onChange={value => save.mutate({ weeklyPostGoal: Number(value) })}
                        />
                        <Muted style={{ marginTop: 8 }}>
                            {save.isError ? 'Nie udało się zapisać planu.' : 'Przegląd pilnuje tego planu co tydzień.'}
                        </Muted>
                    </>
                )}
            </PanelBody>
        </Panel>
    );
};
