import { D2Api, Id, Ref, D2Constant, PartialPersistedModel } from "d2-api";
import _ from "lodash";
import i18n from "../locales";
import { generateUid } from "d2/uid";

const models = ["dataSet", "program"] as const;

const privateFields = ["api", "currentUser", "userGroups"] as const;

const publicFields = [
    "models",
    "userGroupsForGeneration",
    "userGroupsForSettings",
    "showOrgUnitsOnGeneration",
] as const;

const allFields = [...privateFields, ...publicFields];

type GetArrayInnerType<T extends readonly any[]> = T[number];
export type Model = GetArrayInnerType<typeof models>;

type Models = Record<Model, boolean>;
type Options = Pick<Settings, GetArrayInnerType<typeof allFields>>;
type PublicOption = Pick<Options, GetArrayInnerType<typeof publicFields>>;

export type Field = keyof PublicOption;

interface UserGroup {
    id: string;
    name: string;
    displayName: string;
}

interface PersistedData {
    models: Models;
    userGroupForGeneration: string[];
    userGroupForSettings: string[];
    showOrgUnitsOnGeneration: boolean;
}

interface CurrentUser {
    userGroups: Ref[];
    authorities: Set<string>;
}

type OkOrError = { status: true } | { status: false; error: string };

export default class Settings {
    public api: D2Api;
    public currentUser: CurrentUser;
    public models: Models;
    public userGroups: UserGroup[];
    public userGroupsForGeneration: UserGroup[];
    public userGroupsForSettings: UserGroup[];
    public showOrgUnitsOnGeneration: boolean;

    static constantCode = "BULK_LOAD_SETTINGS";

    static defaultData = {
        models: { dataSet: true, program: false },
        userGroupsForGeneration: ["HMIS Officers"],
        userGroupsForSettings: [],
        showOrgUnitsOnGeneration: false,
    };

    constructor(options: Options) {
        this.api = options.api;
        this.currentUser = options.currentUser;
        this.models = options.models;
        this.userGroups = options.userGroups;
        this.userGroupsForGeneration = options.userGroupsForGeneration;
        this.userGroupsForSettings = options.userGroupsForSettings;
        this.showOrgUnitsOnGeneration = options.showOrgUnitsOnGeneration;
    }

    static async build(api: D2Api): Promise<Settings> {
        const authorities = await api.get<string[]>("/me/authorization").getData();

        const d2CurrentUser = await api.currentUser
            .get({ fields: { userGroups: { id: true } } })
            .getData();

        const currentUser: CurrentUser = {
            ...d2CurrentUser,
            authorities: new Set(authorities),
        };

        const { userGroups, constants } = await api.metadata
            .get({
                userGroups: {
                    fields: { id: true, name: true, displayName: true },
                },
                constants: {
                    fields: { id: true, description: true },
                    filter: { code: { eq: this.constantCode } },
                },
            })
            .getData();

        const settingsConstant = _(constants).get(0, null);
        const data: Partial<PersistedData> = settingsConstant
            ? JSON.parse(settingsConstant.description)
            : {};

        const userGroupsForGeneration = getUserGroupsWithSettingEnabled(
            userGroups,
            data.userGroupForGeneration,
            Settings.defaultData.userGroupsForGeneration
        );

        const userGroupsForSettings = getUserGroupsWithSettingEnabled(
            userGroups,
            data.userGroupForSettings,
            Settings.defaultData.userGroupsForSettings
        );

        return new Settings({
            api,
            currentUser,
            userGroups: userGroups,
            models: data.models || Settings.defaultData.models,
            userGroupsForGeneration,
            userGroupsForSettings,
            showOrgUnitsOnGeneration:
                data.showOrgUnitsOnGeneration || Settings.defaultData.showOrgUnitsOnGeneration,
        });
    }

    validate(): OkOrError {
        const isSomeModelEnabled = _(this.models).values().some();
        return isSomeModelEnabled
            ? { status: true }
            : { status: false, error: i18n.t("Select at least one model") };
    }

    async save(): Promise<OkOrError> {
        const {
            api,
            models,
            userGroupsForGeneration,
            userGroupsForSettings,
            showOrgUnitsOnGeneration,
        } = this;
        const validation = this.validate();
        if (!validation.status) return validation;

        const { constants } = await api.metadata
            .get({
                constants: {
                    fields: { id: true },
                    filter: { code: { eq: Settings.constantCode } },
                },
            })
            .getData();

        const settingsConstant = _(constants).get(0, null);
        const data: PersistedData = {
            models,
            userGroupForGeneration: userGroupsForGeneration.map(ug => ug.id),
            userGroupForSettings: userGroupsForSettings.map(ug => ug.id),
            showOrgUnitsOnGeneration,
        };
        const newSettingsConstant: PartialPersistedModel<D2Constant> = {
            id: settingsConstant ? settingsConstant.id : generateUid(),
            code: Settings.constantCode,
            name: "Bulk Load Settings",
            description: JSON.stringify(data, null, 2),
        };

        const response = await api.metadata.post({ constants: [newSettingsConstant] }).getData();

        if (response.status === "OK") {
            return { status: true };
        } else {
            return { status: false, error: JSON.stringify(response.typeReports, null, 2) };
        }
    }

    private updateOptions(newOptions: Partial<Options>): Settings {
        return new Settings({ ..._.pick(this, allFields), ...newOptions });
    }

    update(options: Partial<PublicOption>): Settings {
        const currentOptions = _.pick(this, allFields);
        return new Settings({ ...currentOptions, ...options });
    }

    setModel(model: Model, value: boolean) {
        return this.updateOptions({ models: { ...this.models, [model]: value } });
    }

    setUserGroupsForGenerationFromIds(userGroupIds: Id[]) {
        return this.updateOptions({
            userGroupsForGeneration: this.getUserGroupsFromIds(userGroupIds),
        });
    }

    setUserGroupsForSettingsFromIds(userGroupIds: Id[]) {
        return this.updateOptions({
            userGroupsForSettings: this.getUserGroupsFromIds(userGroupIds),
        });
    }

    isModelEnabled(key: Model) {
        return this.models[key];
    }

    isTemplateGenerationVisible() {
        return this.hasCurrentUserAnyGroup(this.userGroupsForGeneration);
    }

    areSettingsVisibleForCurrentUser(): boolean {
        const { authorities } = this.currentUser;
        return authorities.has("ALL") || this.hasCurrentUserAnyGroup(this.userGroupsForSettings);
    }

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }

    private getUserGroupsFromIds(userGroupIds: Id[]): UserGroup[] {
        return _(this.userGroups)
            .keyBy(userGroup => userGroup.id)
            .at(userGroupIds)
            .compact()
            .value();
    }

    private hasCurrentUserAnyGroup(userGroups: UserGroup[]): boolean {
        return !_(this.currentUser.userGroups)
            .intersectionBy(userGroups, userGroup => userGroup.id)
            .isEmpty();
    }
}

function getUserGroupsWithSettingEnabled(
    allUserGroups: UserGroup[],
    ids: Id[] | undefined,
    defaultNames: string[]
) {
    return allUserGroups.filter(userGroup =>
        ids ? ids.includes(userGroup.id) : defaultNames.includes(userGroup.name)
    );
}
