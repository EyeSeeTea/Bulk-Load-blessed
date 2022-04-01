import React, { useCallback, useEffect, useMemo, useState } from "react";
import _ from "lodash";
import { ConfirmationDialog, MultiSelector } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";

import { Id, NamedRef } from "../../../domain/entities/ReferenceObject";
import { Template } from "../../../domain/entities/Template";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { getSelectOptionsFromNamedRefs, modelToSelectOption } from "../../utils/refs";
import { Select, SelectOption } from "../select/Select";
import { SettingsFieldsProps } from "./SettingsFields";

export interface ModuleTemplateDialogProps extends SettingsFieldsProps {
    title: string;
    onClose: () => void;
}

export function DataFormTemplateAssignDialog(props: ModuleTemplateDialogProps): React.ReactElement {
    const { title, onClose, settings, onChange } = props;
    const { d2, compositionRoot } = useAppContext();
    const classes = useStyles();

    const [dataForms, setDataForms] = useState<NamedRef[]>([]);
    const [selectedDataForm, setSelectedDataForm] = useState<NamedRef>();
    const [templates, setTemplates] = useState<NamedRef[]>([]);

    useEffect(() => {
        compositionRoot.templates.list().then(({ dataSets, programs }) => {
            const metadata = _.concat(dataSets, programs);
            setDataForms(metadata);
        });
    }, [compositionRoot]);

    useEffect(() => {
        compositionRoot.templates.getCustom().then(setTemplates);
    }, [compositionRoot]);

    const selectItem = useCallback(
        ({ value }: SelectOption) => {
            setSelectedDataForm(dataForms.find(item => item.id === value));
        },
        [dataForms]
    );

    const itemOptions = useMemo(() => getSelectOptionsFromNamedRefs(dataForms), [dataForms]);
    const templatesOptions = useMemo(() => modelToSelectOption(templates), [templates]);
    const templateIdsSelected: Id[] = settings.getTemplateIdsForDataForm(selectedDataForm);

    const updateSelection = useCallback(
        (newSelectedIds: string[]) => {
            if (selectedDataForm) {
                const newSettings = settings.updateDataFormTemplateRelationship(selectedDataForm, newSelectedIds);
                onChange(newSettings);
            }
        },
        [selectedDataForm, settings, onChange]
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
                    placeholder={i18n.t("Dataset/Program")}
                    options={itemOptions}
                    onChange={selectItem}
                    value={selectedDataForm?.id ?? ""}
                />
            </div>

            {selectedDataForm && (
                <div className={classes.row}>
                    <MultiSelector
                        d2={d2}
                        searchFilterLabel={i18n.t("Search templates")}
                        height={300}
                        onChange={updateSelection}
                        options={templatesOptions}
                        selected={templateIdsSelected}
                        ordered={false}
                    />
                </div>
            )}
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    row: { width: "100%", marginBottom: "2em" },
});
