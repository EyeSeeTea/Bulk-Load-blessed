import { makeStyles, TextField, Typography } from "@material-ui/core";
import { ConfirmationDialog } from "d2-ui-components";
import React, { ChangeEvent, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Theme, ThemeableSections } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { toBase64 } from "../../../utils/files";

interface ThemeEditDialogProps {
    type: "new" | "edit";
    theme?: Theme;
    onSave: (theme: Theme) => void;
    onCancel: () => void;
}

export default function ThemeEditDialog({
    type,
    theme: editTheme,
    onSave,
    onCancel,
}: ThemeEditDialogProps) {
    const classes = useStyles();
    const [theme, updateTheme] = useState<Theme>(editTheme ?? new Theme());

    const onDrop = useCallback(async ([file]: File[]) => {
        if (!file) return;
        const src = await toBase64(file);
        updateTheme(theme => theme.updatePicture("logo", { name: file.name, src }));
    }, []);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: "image/jpeg, image/png",
    });

    const title = type === "edit" ? i18n.t("Edit theme") : i18n.t("New theme");

    const updateName = (event: ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        updateTheme(theme => theme.setName(name));
    };

    const updateSection = (field: ThemeableSections) => {
        return (event: ChangeEvent<HTMLInputElement>) => {
            const text = event.target.value;
            updateTheme(theme => theme.updateSection(field, text ? { text } : undefined));
        };
    };

    const saveTheme = () => onSave(theme);

    return (
        <ConfirmationDialog
            isOpen={true}
            title={title}
            onSave={saveTheme}
            onCancel={onCancel}
            maxWidth={"lg"}
            fullWidth={true}
        >
            <div className={classes.group}>
                <TextField
                    className={classes.text}
                    label={i18n.t("Theme name")}
                    required={true}
                    fullWidth={true}
                    value={theme.name ?? ""}
                    onChange={updateName}
                />
            </div>

            <div className={classes.group}>
                <Typography variant="h6">{i18n.t("Sections")}</Typography>
                <TextField
                    className={classes.text}
                    label={i18n.t("Header text")}
                    fullWidth={true}
                    multiline={true}
                    value={theme.sections?.header?.text ?? ""}
                    onChange={updateSection("header")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Title text")}
                    fullWidth={true}
                    multiline={true}
                    value={theme.sections?.title?.text ?? ""}
                    onChange={updateSection("title")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Subtitle text")}
                    fullWidth={true}
                    multiline={true}
                    value={theme.sections?.subtitle?.text ?? ""}
                    onChange={updateSection("subtitle")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Footer text")}
                    fullWidth={true}
                    multiline={true}
                    value={theme.sections?.footer?.text ?? ""}
                    onChange={updateSection("footer")}
                />
            </div>

            <div className={classes.group}>
                <Typography variant="h6">{i18n.t("Logo")}</Typography>
                <div {...getRootProps({ className: classes.dropzone })}>
                    <input {...getInputProps()} />
                    {theme.pictures?.logo?.name ?? <p>{i18n.t("Drag and drop logo file")}</p>}
                </div>
            </div>
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    group: { marginBottom: 35, marginLeft: 0 },
    text: { marginTop: 8 },
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
