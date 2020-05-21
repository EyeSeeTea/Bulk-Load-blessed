import { Button, Icon } from "@material-ui/core";
import {
    ConfirmationDialog,
    ObjectsTable,
    TableAction,
    TableColumn,
    TableSelection,
    TableState,
    useSnackbar,
} from "d2-ui-components";
import React, { ReactNode, useEffect, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { promiseMap } from "../../utils/common";
import { ColorScale } from "../color-scale/ColorScale";
import ThemeEditDialog from "./ThemeEditDialog";

interface WarningDialog {
    title?: string;
    description?: string;
    action?: () => void;
}

export interface ThemeDetail {
    id: string;
    name: string;
    title: string;
    subtitle: string;
    logo: ReactNode;
    palette: string[];
}

interface ThemeListTableProps {
    onChange?: (themes: Theme[]) => void;
}

export default function ThemeListTable({ onChange }: ThemeListTableProps) {
    const snackbar = useSnackbar();

    const [themes, setThemes] = useState<Theme[]>([]);
    const [selection, setSelection] = useState<TableSelection[]>([]);
    const rows = buildThemeDetails(themes);
    const [themeEdit, setThemeEdit] = useState<{ type: "edit" | "new"; theme?: Theme }>();
    const [warningDialog, setWarningDialog] = useState<WarningDialog | null>(null);
    const [reloadKey, setReloadKey] = useState<number>();

    useEffect(() => {
        CompositionRoot.attach()
            .themes.list.execute()
            .then(themes => {
                setThemes(themes);
                if (reloadKey && onChange) onChange(themes);
            });
    }, [reloadKey, onChange]);

    const newTheme = () => {
        setThemeEdit({ type: "new" });
    };

    const cancelThemeEdit = () => {
        setThemeEdit(undefined);
    };

    const saveTheme = async (theme: Theme) => {
        try {
            const errors = await CompositionRoot.attach().themes.save.execute(theme);
            if (errors.length > 0) {
                snackbar.error(errors.join("\n"));
            } else {
                cancelThemeEdit();
                setReloadKey(Math.random());
            }
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
                return CompositionRoot.attach().themes.delete.execute(id);
            });
            setReloadKey(Math.random());
            setSelection([]);
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
        {
            name: "palette",
            text: i18n.t("Color options"),
            getValue: ({ palette }: ThemeDetail) => <ColorScale colors={palette} />,
        },
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

    const onTableChange = (state: TableState<ThemeDetail>) => {
        setSelection(state.selection);
    };

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
                selection={selection}
                onChange={onTableChange}
                filterComponents={
                    <Button variant="contained" color="primary" onClick={newTheme} disableElevation>
                        {i18n.t("Create theme")}
                    </Button>
                }
            />
        </React.Fragment>
    );
}

function buildThemeDetails(themes: Theme[]): ThemeDetail[] {
    return themes.map(({ id, name, sections, pictures, palette }) => ({
        id,
        name,
        title: sections?.title?.text ?? "-",
        subtitle: sections?.subtitle?.text ?? "-",
        logo: pictures?.logo?.src ? (
            <img style={{ maxWidth: 150 }} src={pictures?.logo?.src} alt="logo" />
        ) : null,
        palette,
    }));
}
