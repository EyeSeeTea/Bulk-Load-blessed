import React from "react";
import { DataForm, DataFormType } from "../../domain/entities/DataForm";
import { Id } from "../../domain/entities/ReferenceObject";
import { Maybe } from "../../types/utils";
import { useAppContext } from "../contexts/app-context";
import { getSelectOptionsFromNamedRefs } from "../utils/refs";
import { SelectOption } from "../components/select/Select";

export function useDataForms(options: { type?: DataFormType } = {}) {
    const { type } = options;

    const { compositionRoot } = useAppContext();
    const [dataForms, setDataForms] = React.useState<DataForm[]>();

    React.useEffect(() => {
        compositionRoot.templates.get().then(setDataForms);
    }, [compositionRoot]);

    const dataFormsFiltered = React.useMemo(() => {
        return dataForms ? dataForms.filter(df => !type || df.type === type) : undefined;
    }, [dataForms, type]);

    return dataFormsFiltered;
}

export function useDataFormsSelector(options: { initialSelectionId?: Id; type?: DataFormType } = {}) {
    const { initialSelectionId } = options;
    const [selected, setSelected] = React.useState<Maybe<DataForm>>();
    const dataForms = useDataForms(options);

    React.useEffect(() => {
        if (!dataForms || !initialSelectionId) return;
        const initialSelected = dataForms.find(df => df.id === initialSelectionId);
        if (initialSelected) setSelected(initialSelected);
    }, [dataForms, initialSelectionId]);

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
