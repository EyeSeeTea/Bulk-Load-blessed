import { Grid, makeStyles, TextField, Typography } from "@material-ui/core";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import i18n from "../../../locales";
import { toBase64 } from "../../../utils/files";
import { Select } from "../select/Select";
import { CustomTemplate } from "../../../domain/entities/Template";
import React from "react";
import { useDataForms } from "./settings.hooks";
import {
    CustomTemplateProgramViewModel,
    CustomTemplateProgramViewModelActions,
} from "./templates/CustomTemplateProgramViewModel";

export interface CustomTemplateEditDialogProps {
    action: CustomTemplateAction;
    onSave: (template: CustomTemplate) => void;
    onCancel: () => void;
}

export type CustomTemplateAction = { type: "new" } | { type: "edit"; template: CustomTemplate };

export function CustomTemplateEditDialog(props: CustomTemplateEditDialogProps) {
    const { action, onSave, onCancel } = props;
    const classes = useStyles();

    const getInitialTemplate = (): CustomTemplateProgramViewModel =>
        props.action.type === "edit"
            ? CustomTemplateProgramViewModelActions.fromTemplate(props.action.template)
            : CustomTemplateProgramViewModelActions.build();

    const [template, setTemplate] = useState(getInitialTemplate);

    const dataForms = useDataForms({ initialSelectionId: template.dataFormId || undefined });

    const onDrop = useCallback(async ([file]: File[]) => {
        if (!file) return;
        const src = await toBase64(file);
        console.debug(src);
        //updateTemplate(theme => theme.updatePicture("logo", { name: file.name, src }));
    }, []);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: "image/jpeg, image/png",
    });

    const title = action.type === "edit" ? i18n.t("Edit custom template") : i18n.t("New custom template");

    const save = React.useCallback(() => {
        onSave(template as unknown as CustomTemplate);
    }, [onSave, template]);

    function setFieldFromEvent(field: keyof CustomTemplateProgramViewModel) {
        return (ev: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            setTemplate(prevTemplate =>
                CustomTemplateProgramViewModelActions.update(prevTemplate, field, ev.target.value)
            );
        };
    }

    return (
        <ConfirmationDialog
            isOpen={true}
            title={title}
            onSave={save}
            onCancel={onCancel}
            maxWidth={"lg"}
            fullWidth={true}
        >
            <Group>
                <TextField
                    className={classes.text}
                    label={i18n.t("Template Code")}
                    required={true}
                    fullWidth={true}
                    value={template.code || ""}
                    disabled={action.type === "edit"}
                    onChange={setFieldFromEvent("code")}
                />

                <TextField
                    className={classes.text}
                    label={i18n.t("Template Name")}
                    required={true}
                    fullWidth={true}
                    value={template.name || ""}
                    onChange={setFieldFromEvent("name")}
                />

                <TextField
                    className={classes.text}
                    label={i18n.t("Template Description")}
                    required={false}
                    fullWidth={true}
                    value={template.description || ""}
                    onChange={setFieldFromEvent("description")}
                />

                <Select
                    placeholder={i18n.t("Program/Dataset")}
                    options={dataForms.options}
                    value={dataForms.selected?.id}
                    onChange={dataForms.setSelected}
                />
            </Group>

            <Group title={i18n.t("Data Source Configuration")}>
                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <TextField
                            className={classes.text}
                            label={i18n.t("Event UID - Sheet")}
                            fullWidth={true}
                            value={template.eventIdSheet}
                            onChange={setFieldFromEvent("eventIdSheet")}
                        />
                    </Grid>

                    <Grid item xs={6}>
                        <TextField
                            className={classes.text}
                            label={i18n.t("Event UID - Column")}
                            fullWidth={true}
                            value={template.eventIdColumn}
                            onChange={setFieldFromEvent("eventIdColumn")}
                        />
                    </Grid>
                </Grid>
            </Group>

            <Group title={i18n.t("Styles")}></Group>

            <Group title={i18n.t("File")}>
                <div {...getRootProps({ className: classes.dropzone })}>
                    <input {...getInputProps()} />

                    {"template.xlsx" ?? <p>{i18n.t("Drag and drop template file")}</p>}
                </div>
            </Group>
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    group: { marginBottom: 25, marginLeft: 0 },
    text: { marginTop: 10, marginBottom: 10 },
    colorOptions: { marginTop: 12, marginBottom: 0, display: "flex" },
    colorOptionsPicker: { width: "20%", marginRight: 30 },
    dropzone: {
        flex: 1,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: 20,
        margin: 8,
        borderWidth: 2,
        borderRadius: 2,
        borderColor: "#c8c8c8",
        borderStyle: "dashed",
        backgroundColor: "#f0f0f0",
        cursor: "pointer",
    },
});

const Group: React.FC<{ title?: string }> = props => {
    const { title, children } = props;
    const classes = useStyles();

    return (
        <div className={classes.group}>
            {title && <Typography variant="h6">{title}</Typography>}
            {children}
        </div>
    );
};
