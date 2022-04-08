import React from "react";
import { DataForm } from "../../../domain/entities/DataForm";
import { Id } from "../../../domain/entities/ReferenceObject";
import { Maybe } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import { getSelectOptionsFromNamedRefs } from "../../utils/refs";
import { SelectOption } from "../select/Select";

export function useDataForms(options: { initialSelectionId?: Id } = {}) {
    const { compositionRoot } = useAppContext();

    const [dataForms, setDataForms] = React.useState<DataForm[]>();

    const [selected, setSelected] = React.useState<Maybe<DataForm>>();

    React.useEffect(() => {
        if (!dataForms || !options.initialSelectionId) return;
        const initialSelected = dataForms.find(df => df.id === options.initialSelectionId);
        if (initialSelected) setSelected(initialSelected);
    }, [dataForms, options.initialSelectionId]);

    React.useEffect(() => {
        compositionRoot.templates.get().then(setDataForms);
    }, [compositionRoot]);

    const selectOptions = React.useMemo(() => {
        return dataForms ? getSelectOptionsFromNamedRefs(dataForms) : [];
    }, [dataForms]);

    const selectDataForm = React.useCallback(
        ({ value }: SelectOption) => {
            setSelected(dataForms?.find(item => item.id === value));
        },
        [dataForms]
    );

    return {
        objects: dataForms,
        options: selectOptions,
        selected,
        setSelected: selectDataForm,
    };
}
