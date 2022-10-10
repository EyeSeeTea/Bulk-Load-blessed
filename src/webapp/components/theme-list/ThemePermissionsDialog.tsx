import { ConfirmationDialog, ShareUpdate, Sharing } from "@eyeseetea/d2-ui-components";
import { useCallback } from "react";
import i18n from "../../../locales";
import { useAppContext } from "../../contexts/app-context";
import { Id } from "../../../domain/entities/ReferenceObject";
import { Theme } from "../../../domain/entities/Theme";
import _ from "lodash";

export interface ThemePermissionsDialogProps {
    themeId: Id;
    onClose: () => void;
    rows: Theme[];
    onChange: (rows: Theme[]) => void;
}

export function ThemePermissionsDialog(props: ThemePermissionsDialogProps) {
    const { themeId, onClose, rows: themes, onChange } = props;
    const { compositionRoot } = useAppContext();

    const search = useCallback((query: string) => compositionRoot.users.search(query), [compositionRoot]);

    const buildMetaObject = useCallback(
        (id: Id) => {
            const buildSharing = () => {
                const theme = themes.find(theme => theme.id === id);
                return {
                    users: theme?.sharing?.users,
                    userGroups: theme?.sharing?.userGroups,
                    external: theme?.sharing?.external,
                    public: theme?.sharing?.public,
                };
            };

            const sharing = buildSharing();

            return {
                meta: {
                    allowPublicAccess: true,
                    allowExternalAccess: false,
                },
                object: {
                    id: "",
                    displayName: i18n.t("Access to Themes"),
                    externalAccess: sharing.external,
                    publicAccess: sharing.public,
                    userAccesses: sharing.users,
                    userGroupAccesses: sharing.userGroups,
                },
            };
        },
        [themes]
    );

    const onUpdateSharingOptions = useCallback(() => {
        return async ({
            userAccesses: users,
            userGroupAccesses: userGroups,
            publicAccess: publicSharing,
            externalAccess: external,
        }: ShareUpdate) => {
            const newThemes = themes.map((theme): Theme => {
                if (theme.id !== themeId) {
                    return theme;
                } else {
                    const newTheme = theme.updateSharing({
                        external: external ?? false,
                        public: publicSharing ?? "r-------",
                        users: users ?? [],
                        userGroups: userGroups ?? [],
                    });
                    compositionRoot.themes
                        .save(newTheme)
                        .then(errors =>
                            errors.length === 0
                                ? onChange(_.uniqBy([theme, ...themes], "id"))
                                : console.error(errors.join("\n"))
                        );
                    return newTheme;
                }
            });
            onChange(newThemes);
        };
    }, [themes, onChange, themeId, compositionRoot.themes]);

    return (
        <ConfirmationDialog isOpen={true} fullWidth={true} onCancel={onClose} cancelText={i18n.t("Close")}>
            <Sharing
                meta={buildMetaObject(themeId)}
                showOptions={{
                    dataSharing: true,
                    publicSharing: true,
                    externalSharing: true,
                    permissionPicker: true,
                }}
                onSearch={search}
                onChange={onUpdateSharingOptions()}
            />
        </ConfirmationDialog>
    );
}
