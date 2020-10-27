import { makeStyles } from "@material-ui/core";
import { ConfirmationDialog, MultiSelector } from "d2-ui-components";
import React, { useEffect, useState, useCallback } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { DataForm } from "../../../domain/entities/DataForm";
import { NamedRef } from "../../../domain/entities/ReferenceObject";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/api-context";
import { Select, SelectOption } from "../select/Select";
import { SettingsFieldsProps } from "./SettingsFields";
import _ from "lodash";

interface DataElementsFilterDialogProps extends SettingsFieldsProps {
    onClose: () => void;
}

export default function DataElementsFilterDialog({
    onClose,
    settings,
    onChange,
}: DataElementsFilterDialogProps) {
    const { d2 } = useAppContext();
    const classes = useStyles();

    const [programs, setPrograms] = useState<DataForm[]>([]);
    const [selectedProgram, selectProgram] = useState<DataForm>();

    useEffect(() => {
        CompositionRoot.attach()
            .templates.list()
            .then(({ programs }) => setPrograms(programs));
    }, []);

    const onChangeSelect = useCallback(
        ({ value }: SelectOption) => {
            selectProgram(programs.find(({ id }) => id === value));
        },
        [programs]
    );

    const onChangeExclude = useCallback(
        (ids: string[]) => {
            if (selectedProgram) {
                const exclusions = _.difference(
                    selectedProgram.dataElements.map(({ id }) => id),
                    ids
                );
                onChange(settings.setDuplicateExclusions(selectedProgram.id, exclusions));
            }
        },
        [onChange, selectedProgram, settings]
    );

    const excluded = selectedProgram ? settings.duplicateExclusion[selectedProgram.id] : [];
    const selection = _.difference(
        selectedProgram?.dataElements.map(({ id }) => id),
        excluded
    );

    return (
        <ConfirmationDialog
            isOpen={true}
            title={i18n.t("Data elements used for duplication assessment")}
            maxWidth="lg"
            fullWidth={true}
            onCancel={onClose}
            cancelText={i18n.t("Close")}
        >
            <div className={classes.row}>
                <Select
                    placeholder={i18n.t("Program")}
                    options={modelToSelectOption(programs)}
                    onChange={onChangeSelect}
                    value={selectedProgram?.id ?? ""}
                />
            </div>

            <div className={classes.row}>
                <MultiSelector
                    d2={d2}
                    height={300}
                    onChange={onChangeExclude}
                    options={modelToSelectOption(selectedProgram?.dataElements)}
                    selected={selection}
                />
            </div>
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    row: {
        width: "100%",
        marginBottom: "2em",
    },
});

function modelToSelectOption<T extends NamedRef>(array?: T[]) {
    return (
        array?.map(({ id, name }) => ({
            value: id,
            label: name,
            text: name,
        })) ?? []
    );
}
