import { D2Api, Id, Ref } from "d2-api";
import _ from "lodash";
import { CompositionRoot } from "../../CompositionRoot";
import { AppSettings, OrgUnitSelectionSetting } from "../../domain/entities/AppSettings";
import i18n from "../../locales";

const models = ["dataSet", "program"] as const;

const privateFields = ["api", "currentUser", "userGroups"] as const;

const publicFields = [
    "models",
    "userGroupsForGeneration",
    "userGroupsForSettings",
    "orgUnitSelection",
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
    public orgUnitSelection: OrgUnitSelectionSetting;

    static constantCode = "BULK_LOAD_SETTINGS";

    constructor(options: Options) {
        this.api = options.api;
        this.currentUser = options.currentUser;
        this.models = options.models;
        this.userGroups = options.userGroups;
        this.userGroupsForGeneration = options.userGroupsForGeneration;
        this.userGroupsForSettings = options.userGroupsForSettings;
        this.orgUnitSelection = options.orgUnitSelection;
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

        const { userGroups } = await api.metadata
            .get({
                userGroups: {
                    fields: { id: true, name: true, displayName: true },
                },
            })
            .getData();

        const defaultSettings = CompositionRoot.attach().settings.getDefault.execute();

        const defaultData = {
            models: { dataSet: true, program: true },
            userGroupsForGeneration: [],
            userGroupsForSettings: [],
            orgUnitSelection: "both",
            ...defaultSettings,
        };

        const data = await CompositionRoot.attach().settings.read.execute<Partial<AppSettings>>(
            Settings.constantCode,
            defaultData
        );

        const userGroupsForGeneration = getUserGroupsWithSettingEnabled(
            userGroups,
            data.userGroupsForGeneration,
            defaultData.userGroupsForGeneration
        );

        const userGroupsForSettings = getUserGroupsWithSettingEnabled(
            userGroups,
            data.userGroupsForSettings,
            defaultData.userGroupsForSettings
        );

        return new Settings({
            api,
            currentUser,
            userGroups: userGroups,
            models: data.models ?? defaultData.models,
            userGroupsForGeneration,
            userGroupsForSettings,
            orgUnitSelection: data.orgUnitSelection ?? defaultData.orgUnitSelection,
        });
    }

    validate(): OkOrError {
        const isSomeModelEnabled = _(this.models).values().some();
        return isSomeModelEnabled
            ? { status: true }
            : { status: false, error: i18n.t("Select at least one model") };
    }

    async save(): Promise<OkOrError> {
        const { models, userGroupsForGeneration, userGroupsForSettings, orgUnitSelection } = this;
        const validation = this.validate();
        if (!validation.status) return validation;

        const data: AppSettings = {
            models,
            userGroupsForGeneration: userGroupsForGeneration.map(ug => ug.id),
            userGroupsForSettings: userGroupsForSettings.map(ug => ug.id),
            orgUnitSelection,
        };

        try {
            await CompositionRoot.attach().settings.write.execute<AppSettings>(
                Settings.constantCode,
                data
            );
            return { status: true };
        } catch (error) {
            return { status: false, error };
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
