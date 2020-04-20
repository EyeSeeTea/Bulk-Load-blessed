import { makeStyles, TextField, Typography } from "@material-ui/core";
import { ConfirmationDialog, MultiSelector } from "d2-ui-components";
import React, { useEffect, useState, ChangeEvent } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme, ThemeableSections } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/api-context";

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
    const { d2 } = useAppContext(); // FIXME: Remove d2 required by MultiSelector (GroupEditor)
    const classes = useStyles();

    const [theme, updateTheme] = useState<Theme>(editTheme ?? new Theme());
    const [allTemplates, setAllTemplates] = useState<{ value: string; text: string }[]>([]);

    const title = type === "edit" ? i18n.t("Edit theme") : i18n.t("New theme");

    useEffect(() => {
        const templates = CompositionRoot.getInstance().templates.list.execute();
        setAllTemplates(templates.map(({ value, label }) => ({ value, text: label })));
    }, []);

    const updateName = (event: ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        updateTheme(theme => theme.setName(name));
    };

    const updateSection = (field: ThemeableSections) => {
        return (event: ChangeEvent<HTMLInputElement>) => {
            const text = event.target.value;
            updateTheme(theme => theme.updateSection(field, { text }));
        };
    };

    const updateTemplates = (templates: string[]) => {
        updateTheme(theme => theme.setTemplates(templates));
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
                    value={theme.sections?.header?.text ?? ""}
                    onChange={updateSection("header")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Footer text")}
                    fullWidth={true}
                    value={theme.sections?.footer?.text ?? ""}
                    onChange={updateSection("footer")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Title text")}
                    fullWidth={true}
                    value={theme.sections?.title?.text ?? ""}
                    onChange={updateSection("title")}
                />
                <TextField
                    className={classes.text}
                    label={i18n.t("Subtitle text")}
                    fullWidth={true}
                    value={theme.sections?.subtitle?.text ?? ""}
                    onChange={updateSection("subtitle")}
                />
            </div>

            <div className={classes.group}>
                <Typography variant="h6">{i18n.t("Templates")}</Typography>
                <MultiSelector
                    d2={d2}
                    ordered={false}
                    height={200}
                    onChange={updateTemplates}
                    options={allTemplates}
                    selected={theme.templates}
                />
            </div>
        </ConfirmationDialog>
    );
}

const useStyles = makeStyles({
    group: { marginBottom: 35, marginLeft: 0 },
    text: { marginTop: 8 },
});
