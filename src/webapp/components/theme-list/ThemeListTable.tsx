import {
    ConfirmationDialog,
    ObjectsTable,
    SharingRule,
    TableAction,
    TableColumn,
    TableSelection,
    TableState,
    useLoading,
    useSnackbar,
} from "@eyeseetea/d2-ui-components";
import { Button, Icon } from "@material-ui/core";
import _ from "lodash";
import React, { ReactNode, useEffect, useState } from "react";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { RouteComponentProps } from "../../pages/Router";
import { promiseMap } from "../../../utils/promises";
import { ColorScale } from "../color-scale/ColorScale";
import ThemeEditDialog from "./ThemeEditDialog";
import { ThemePermissionsDialog } from "./ThemePermissionsDialog";
import { firstOrFail } from "../../../types/utils";
import { User } from "../../../domain/entities/User";
import { Id } from "../../../types/d2-api";

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
    users: SharingRule[];
    userGroups: SharingRule[];
}

type ThemeListTableProps = Pick<RouteComponentProps, "themes" | "setThemes">;
type SettingsState = { type: "closed" } | { type: "open"; id: string };

export default function ThemeListTable({ themes, setThemes }: ThemeListTableProps) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const loading = useLoading();

    const [selection, setSelection] = useState<TableSelection[]>([]);
    const [themeEdit, setThemeEdit] = useState<{ type: "edit" | "new"; theme?: Theme }>();
    const [warningDialog, setWarningDialog] = useState<WarningDialog | null>(null);

    const [currentUser, setCurrentUser] = useState<User>();
    useEffect(() => {
        compositionRoot.users.getCurrentUser().then(user => setCurrentUser(user));
    }, [compositionRoot.users]);

    const rows = buildThemeDetails(themes);
    const usersVisibility: Record<Id, boolean> = _(rows)
        .map((themeDetail): [Id, boolean] => {
            const isCurrentUserInUsers = _(themeDetail.users).some(user => user.id === currentUser?.id);
            return [themeDetail.id, isCurrentUserInUsers];
        })
        .fromPairs()
        .value();

    const userGroupsVisibility: Record<Id, boolean> = _(rows)
        .map((themeDetail): [Id, boolean] => {
            const isCurrentUserInUserGroups =
                currentUser?.userGroups?.some(ug =>
                    _(themeDetail.userGroups).some(userGroup => ug.id === userGroup.id)
                ) ?? false;
            return [themeDetail.id, isCurrentUserInUserGroups];
        })
        .fromPairs()
        .value();

    const newRows = rows.map((item, i) => ({
        ...item,
        visible: Object.values(userGroupsVisibility)[i] || Object.values(usersVisibility)[i],
    }));
    const rowsToShow = newRows.filter(row => row.visible === true);

    const newTheme = () => {
        setThemeEdit({ type: "new" });
    };

    const closeThemeEdit = () => {
        setThemeEdit(undefined);
    };

    const saveTheme = async (theme: Theme) => {
        try {
            loading.show();
            const errors = await compositionRoot.themes.save(theme);
            if (errors.length === 0) {
                closeThemeEdit();
                setThemes(_.uniqBy([theme, ...themes], "id"));
            } else {
                snackbar.error(errors.join("\n"));
            }
        } catch (error) {
            console.error(error);
            snackbar.error(i18n.t("An error ocurred while saving theme"));
        }
        loading.hide();
    };

    const editTheme = (ids: string[]) => {
        const theme = themes.find(row => row.id === ids[0]);
        if (theme) setThemeEdit({ type: "edit", theme });
    };

    const deleteThemes = (ids: string[]) => {
        setWarningDialog({
            title: i18n.t("Delete {{count}} themes", { count: ids.length }),
            description: i18n.t("Are you sure you want to remove selected themes"),
            action: async () => {
                loading.show();
                await promiseMap(ids, id => {
                    return compositionRoot.themes.delete(id);
                });
                setSelection([]);
                setThemes(_.reject(themes, ({ id }) => ids.includes(id)));
                loading.hide();
            },
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
            name: "sharing",
            text: i18n.t("Sharing Settings"),
            onClick: selectedIds => setSettingsState({ type: "open", id: firstOrFail(selectedIds) }),
            icon: <Icon>share</Icon>,
        },
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
            onClick: deleteThemes,
            icon: <Icon>delete</Icon>,
        },
    ];

    const onTableChange = ({ selection }: TableState<ThemeDetail>) => {
        setSelection(selection);
    };

    const [settingsState, setSettingsState] = useState<SettingsState>({ type: "closed" });

    const closeSettings = React.useCallback(() => {
        setSettingsState({ type: "closed" });
    }, []);

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
                    onCancel={closeThemeEdit}
                />
            )}

            {settingsState.type === "open" && (
                <ThemePermissionsDialog
                    onClose={closeSettings}
                    rows={themes}
                    themeId={settingsState.id}
                    onChange={setThemes}
                />
            )}

            <ObjectsTable<ThemeDetail>
                rows={rowsToShow}
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
    return themes.map(({ id, name, sections, pictures, palette, sharing }) => ({
        id,
        name,
        title: sections?.title?.text ?? "-",
        subtitle: sections?.subtitle?.text ?? "-",
        logo: pictures?.logo?.src ? <img style={{ maxWidth: 150 }} src={pictures?.logo?.src} alt="logo" /> : null,
        palette,
        users: sharing?.users ?? [],
        userGroups: sharing?.userGroups ?? [],
    }));
}
