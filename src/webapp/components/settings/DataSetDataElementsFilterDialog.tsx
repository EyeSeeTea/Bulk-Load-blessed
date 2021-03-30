import React from "react";
import _ from "lodash";
import { ConfirmationDialog, MultiSelector } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";

import i18n from "../../../locales";
import { Select, SelectOption } from "../select/Select";
import { SettingsFieldsProps } from "./SettingsFields";
import { useAppContext } from "../../contexts/app-context";
import { DataForm } from "../../../domain/entities/DataForm";
import { NamedRef } from "../../../domain/entities/ReferenceObject";
import {
    DataElementDisaggregatedId,
    getDataElementDisaggregatedId,
} from "../../../domain/entities/DataElementDisaggregated";
import {
    getMultiSelectorDataElementOptions as getDataElementOptions,
    getDataElementItems,
    DataElementOption,
    getDataElementDisaggregatedFromItem,
} from "./DataElementItem";
import Settings from "../../logic/settings";

export interface DataSetDataElementsFilterDialogProps extends SettingsFieldsProps {
    title: string;
    onClose: () => void;
}

export function DataSetDataElementsFilterDialog(props: DataSetDataElementsFilterDialogProps): React.ReactElement {
    const { title, onClose, settings, onChange } = props;
    const { d2, compositionRoot } = useAppContext();
    const classes = useStyles();

    const [dataSets, setDataSets] = React.useState<DataForm[]>([]);
    const [dataSet, setDataSet] = React.useState<DataForm>();

    React.useEffect(() => {
        compositionRoot.templates.list().then(({ dataSets }) => {
            setDataSets(dataSets);
        });
    }, [compositionRoot]);

    const selectDataSet = React.useCallback(
        ({ value }: SelectOption) => {
            setDataSet(dataSets.find(dataSet => dataSet.id === value));
        },
        [dataSets]
    );

    const dataSetsOptions = React.useMemo(() => getSelectOptionsFromNamedRefs(dataSets), [dataSets]);
    const dataElementItems = React.useMemo(() => getDataElementItems(dataSet), [dataSet]);
    const dataElementsOptions = React.useMemo(() => getDataElementOptions(dataElementItems), [dataElementItems]);
    const selectedIds = getSelectedIds(settings, dataSet, dataElementsOptions);

    const updateSelection = React.useCallback(
        (newSelectedIds: DataElementDisaggregatedId[]) => {
            const newSettings = settings.setDataSetDataElementsFilterFromSelection({
                dataSet,
                dataElementsDisaggregated: dataElementItems.map(getDataElementDisaggregatedFromItem),
                prevSelectedIds: selectedIds,
                newSelectedIds,
            });
            onChange(newSettings);
        },
        [selectedIds, dataSet, settings, dataElementItems, onChange]
    );

    return (
        <ConfirmationDialog
            isOpen={true}
            title={title}
            maxWidth="lg"
            fullWidth={true}
            onCancel={onClose}
            cancelText={i18n.t("Close")}
        >
            <div className={classes.row}>
                <Select
                    placeholder={i18n.t("Data set")}
                    options={dataSetsOptions}
                    onChange={selectDataSet}
                    value={dataSet?.id ?? ""}
                />
            </div>

            <div className={classes.row}>
                <MultiSelector
                    d2={d2}
                    height={300}
                    onChange={updateSelection}
                    options={dataElementsOptions}
                    selected={selectedIds}
                />
            </div>
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    row: { width: "100%", marginBottom: "2em" },
});

function getSelectOptionsFromNamedRefs<Model extends NamedRef>(models: Model[]): SelectOption[] {
    return models.map(({ id, name }) => ({ value: id, label: name }));
}

function getSelectedIds(settings: Settings, dataSet: DataForm | undefined, dataElementsOptions: DataElementOption[]) {
    if (!dataSet) return [];

    const allOptionIds = dataElementsOptions.map(option => option.value);

    const excludedIds: string[] = dataSet
        ? (settings.dataSetDataElementsFilter[dataSet.id] || []).map(getDataElementDisaggregatedId)
        : [];

    return _.difference(allOptionIds, excludedIds);
}
