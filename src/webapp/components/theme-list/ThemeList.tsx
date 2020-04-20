import { Icon, IconButton, Tooltip } from "@material-ui/core";
import {
    ConfirmationDialog,
    ObjectsTable,
    TableAction,
    TableColumn,
    useSnackbar,
} from "d2-ui-components";
import React, { useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { promiseMap } from "../../utils/common";
import ThemeEditDialog from "./ThemeEditDialog";

interface WarningDialog {
    title?: string;
    description?: string;
    action?: () => void;
}

export interface ThemeDetail {
    id: string;
    name: string;
    header: string;
    footer: string;
    title: string;
    subtitle: string;
    logo: unknown;
}

export default function ThemeList() {
    const snackbar = useSnackbar();

    const [themes, setThemes] = useState<Theme[]>([]);
    const rows = buildThemeDetails(themes);
    const [themeEdit, setThemeEdit] = useState<{ type: "edit" | "new"; theme?: Theme }>();
    const [warningDialog, setWarningDialog] = useState<WarningDialog | null>(null);
    const [reloadKey, setReloadKey] = useState(Math.random());

    useEffect(() => {
        CompositionRoot.getInstance().themes.list.execute().then(setThemes);
    }, [reloadKey]);

    const newTheme = () => {
        setThemeEdit({ type: "new" });
    };

    const cancelThemeEdit = () => {
        setThemeEdit(undefined);
    };

    const saveTheme = async (theme: Theme) => {
        try {
            await CompositionRoot.getInstance().themes.save.execute(theme);
            cancelThemeEdit();
            setReloadKey(Math.random());
        } catch (error) {
            snackbar.error(i18n.t("An error ocurred while saving theme"));
        }
    };

    const editTheme = (ids: string[]) => {
        const theme = themes.find(row => row.id === ids[0]);
        if (theme) setThemeEdit({ type: "edit", theme });
    };

    const deleteThemes = (ids: string[]) => {
        const deleteAction = async () => {
            await promiseMap(ids, id => {
                return CompositionRoot.getInstance().themes.delete.execute(id);
            });
            setReloadKey(Math.random());
        };

        setWarningDialog({
            title: i18n.t("Delete {{count}} themes", { count: ids.length }),
            description: i18n.t("Are you sure you want to remove selected themes"),
            action: deleteAction,
        });
    };

    const closeWarningDialog = () => setWarningDialog(null);

    const columns: TableColumn<ThemeDetail>[] = [
        { name: "name", text: i18n.t("Name") },
        { name: "logo", text: i18n.t("Logo") },
        { name: "header", text: i18n.t("Header") },
        { name: "footer", text: i18n.t("Footer") },
        { name: "title", text: i18n.t("Title") },
        { name: "subtitle", text: i18n.t("Subtitle") },
    ];

    const actions: TableAction<ThemeDetail>[] = [
        {
            name: "edit",
            text: i18n.t("Edit"),
            primary: true,
            onClick: editTheme,
            icon: <Icon>edit</Icon>,
        },
        {
            name: "delete",
            text: i18n.t("Delete"),
            multiple: true,
            onClick: deleteThemes,
            icon: <Icon>delete</Icon>,
        },
    ];

    return (
        <React.Fragment>
            {!!warningDialog && (
                <ConfirmationDialog
                    isOpen={true}
                    title={warningDialog.title}
                    description={warningDialog.description}
                    saveText={i18n.t("Ok")}
                    onSave={() => {
                        if (warningDialog.action) warningDialog.action();
                        setWarningDialog(null);
                    }}
                    onCancel={closeWarningDialog}
                />
            )}

            {!!themeEdit && (
                <ThemeEditDialog
                    type={themeEdit.type}
                    theme={themeEdit.theme}
                    onSave={saveTheme}
                    onCancel={cancelThemeEdit}
                />
            )}

            <ObjectsTable<ThemeDetail>
                rows={rows}
                columns={columns}
                actions={actions}
                filterComponents={
                    <Tooltip title={i18n.t("Add")}>
                        <IconButton onClick={newTheme}>
                            <Icon>add</Icon>
                        </IconButton>
                    </Tooltip>
                }
            />
        </React.Fragment>
    );
}

function buildThemeDetails(themes: Theme[]): ThemeDetail[] {
    return themes.map(({ id, name, sections }) => ({
        id,
        name,
        header: sections?.header?.text ?? "-",
        footer: sections?.footer?.text ?? "-",
        title: sections?.title?.text ?? "-",
        subtitle: sections?.subtitle?.text ?? "-",
        logo: null,
    }));
}
