import { ConfirmationDialog, MultiSelector } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import _ from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DataForm } from "../../../domain/entities/DataForm";
import { NamedRef } from "../../../domain/entities/ReferenceObject";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import Settings from "../../logic/settings";
import { getMultiSelectorOptionsFromNamedRefs, getSelectOptionsFromNamedRefs } from "../../utils/refs";
import { Select, SelectOption } from "../select/Select";
import { SettingsFieldsProps } from "./SettingsFields";

export interface ProgramStageFilterDialogProps extends SettingsFieldsProps {
    title: string;
    onClose: () => void;
}

export function ProgramStageFilterDialog(props: ProgramStageFilterDialogProps): React.ReactElement {
    const { title, onClose, settings, onChange } = props;
    const { d2, compositionRoot } = useAppContext();
    const classes = useStyles();

    const [programStages, setProgramStages] = useState<ProgramStage[]>([]);
    const [programStage, setProgramStage] = useState<ProgramStage>();

    useEffect(() => {
        compositionRoot.templates.list().then(({ programs }) => {
            const programStages = getProgramStages(programs);
            setProgramStages(programStages);
        });
    }, [compositionRoot]);

    const selectProgram = useCallback(
        ({ value }: SelectOption) => {
            setProgramStage(programStages.find(program => program.id === value));
        },
        [programStages]
    );

    const programStageOptions = useMemo(() => getSelectOptionsFromNamedRefs(programStages), [programStages]);
    const dataElementItems = useMemo(() => getDataElementItems(programStage), [programStage]);
    const dataElementsOptions = useMemo(() => getMultiSelectorOptionsFromNamedRefs(dataElementItems), [
        dataElementItems,
    ]);
    const selectedIds = getSelectedIds(settings, programStage);

    const updateSelection = useCallback(
        (newSelectedIds: string[]) => {
            if (!programStage) return;

            const dataElementsExcluded = _.difference(
                programStage.dataElements.map(({ id }) => id),
                newSelectedIds
            ).map(id => ({ id }));

            const attributesIncluded = newSelectedIds
                .filter(id => programStage.attributes.find(e => e.id === id))
                .map(id => ({ id }));

            onChange(
                settings.setProgramStageFilterFromSelection({
                    programStage: programStage.id,
                    dataElementsExcluded,
                    attributesIncluded,
                })
            );
        },
        [programStage, settings, onChange]
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
                    placeholder={i18n.t("Program")}
                    options={programStageOptions}
                    onChange={selectProgram}
                    value={programStage?.id ?? ""}
                />
            </div>

            <div className={classes.row}>
                <MultiSelector
                    d2={d2 as object}
                    searchFilterLabel={i18n.t("Search data elements or attributes")}
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

interface ProgramStage {
    id: string;
    name: string;
    dataElements: NamedRef[];
    attributes: NamedRef[];
}

function getProgramStages(programs: DataForm[]): ProgramStage[] {
    return _.flatMap(programs, ({ name: programName, sections, teiAttributes = [] }) =>
        sections.map(({ id, name, dataElements }) => ({
            id,
            name: programName === name ? programName : `${programName} - ${name}`,
            dataElements: dataElements.map(({ id, name }) => ({ id, name })),
            attributes: teiAttributes,
        }))
    );
}

function getSelectedIds(settings: Settings, programStage: ProgramStage | undefined) {
    if (!programStage) return [];

    const programStageFilter = settings.programStageFilter[programStage.id];
    const includedAttributes = programStageFilter?.attributesIncluded ?? [];
    const excludedDataElements = programStageFilter?.dataElementsExcluded ?? [];

    const selectedAttributes = includedAttributes.map(({ id }) => id);
    const selectedDataElements = _.difference(
        programStage.dataElements.map(({ id }) => id),
        excludedDataElements.map(({ id }) => id)
    );

    return [...selectedDataElements, ...selectedAttributes];
}

function getDataElementItems(stage: ProgramStage | undefined): NamedRef[] {
    const dataElements = stage?.dataElements.map(({ id, name }) => ({ id, name: `[Data element] ${name}` })) ?? [];
    const attributes = stage?.attributes.map(({ id, name }) => ({ id, name: `[Attribute] ${name}` })) ?? [];

    return _.compact([...dataElements, ...attributes]);
}
