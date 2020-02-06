import { D2Api, Id, Ref, D2Constant, PartialPersistedModel } from "d2-api";
import _ from "lodash";
import i18n from "../locales";
import { generateUid } from "d2/uid";

const models = ["dataSet", "program"] as const;

const privateFields = ["api", "currentUser", "userGroups"] as const;

const publicFields = ["models", "userGroupsForGeneration", "showOrgUnitsOnGeneration"] as const;

const allFields = [...privateFields, ...publicFields];

type GetArrayInnerType<T extends readonly any[]> = T[number];
export type Model = GetArrayInnerType<typeof models>;

type Models = Record<Model, boolean>;
type Options = Pick<Settings, GetArrayInnerType<typeof allFields>>;

type PublicOption = Pick<
    Options,
    "models" | "userGroupsForGeneration" | "showOrgUnitsOnGeneration"
>;

export type Field = keyof PublicOption;

interface UserGroup {
    id: string;
    displayName: string;
}

interface PersistedData {
    models: Models;
    userGroupNamesForGeneration: string[];
    showOrgUnitsOnGeneration: boolean;
}

interface CurrentUser {
    userGroups: Ref[];
}

type OkOrError = { status: true } | { status: false; error: string };

export default class Settings {
    public api: D2Api;
    public currentUser: CurrentUser;
    public models: Models;
    public userGroups: UserGroup[];
    public userGroupsForGeneration: UserGroup[];
    public showOrgUnitsOnGeneration: boolean;

    static constantCode = "BULK_LOAD_SETTINGS";

    static defaultData = {
        models: { dataSet: true, program: false },
        userGroupsForGeneration: ["HMIS Officers"],
        showOrgUnitsOnGeneration: false,
    };

    constructor(options: Options) {
        this.api = options.api;
        this.currentUser = options.currentUser;
        this.models = options.models;
        this.userGroups = options.userGroups;
        this.userGroupsForGeneration = options.userGroupsForGeneration;
        this.showOrgUnitsOnGeneration = options.showOrgUnitsOnGeneration;
    }

    static async build(api: D2Api): Promise<Settings> {
        const currentUser = await api.currentUser
            .get({ fields: { userGroups: { id: true } } })
            .getData();
        const { userGroups, constants } = await api.metadata
            .get({
                userGroups: {
                    fields: { id: true, displayName: true },
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

        const userGroupsForGeneration = _(userGroups)
            .keyBy(userGroup => userGroup.displayName)
            .at(data.userGroupNamesForGeneration || Settings.defaultData.userGroupsForGeneration)
            .compact()
            .value();

        return new Settings({
            api,
            currentUser,
            userGroups: userGroups,
            models: data.models || Settings.defaultData.models,
            userGroupsForGeneration,
            showOrgUnitsOnGeneration:
                data.showOrgUnitsOnGeneration || Settings.defaultData.showOrgUnitsOnGeneration,
        });
    }

    validate(): OkOrError {
        const isSomeModelEnabled = _(this.models)
            .values()
            .some();
        return isSomeModelEnabled
            ? { status: true }
            : { status: false, error: i18n.t("Select at least one model") };
    }

    async save(): Promise<OkOrError> {
        const { api, models, userGroupsForGeneration, showOrgUnitsOnGeneration } = this;
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
        const userGroupNamesForGeneration = userGroupsForGeneration.map(ug => ug.displayName);
        const data: PersistedData = {
            models,
            userGroupNamesForGeneration,
            showOrgUnitsOnGeneration,
        };
        const newSettingsConstant: PartialPersistedModel<D2Constant> = {
            id: settingsConstant ? settingsConstant.id : generateUid(),
            code: Settings.constantCode,
            name: "Bulk Load Settings",
            description: JSON.stringify(data, null, 2),
        };

        const response = await api.metadata.post({ constants: [newSettingsConstant] }).getData();

        if (response.status == "OK") {
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
        const userGroupsForGeneration = _(this.userGroups)
            .keyBy(userGroup => userGroup.id)
            .at(userGroupIds)
            .compact()
            .value();
        return this.updateOptions({ userGroupsForGeneration });
    }

    isModelEnabled(key: Model) {
        return this.models[key];
    }

    isTemplateGenerationVisible() {
        return !_(this.currentUser.userGroups)
            .intersectionBy(this.userGroupsForGeneration, userGroup => userGroup.id)
            .isEmpty();
    }

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }
}
