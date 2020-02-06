import { D2Api, Id, Ref, D2Constant, PartialPersistedModel } from "d2-api";
import _ from "lodash";
import i18n from "../locales";
import { generateUid } from "d2/uid";

const models = ["dataSet", "program"] as const;
const optionFields = [
    "api",
    "currentUser",
    "models",
    "userGroups",
    "userGroupsForGeneration",
] as const;

type GetArrayInnerType<T extends readonly any[]> = T[number];
export type Model = GetArrayInnerType<typeof models>;
type Models = Record<Model, boolean>;
type Options = Pick<Settings, GetArrayInnerType<typeof optionFields>>;

interface UserGroup {
    id: string;
    displayName: string;
}

interface PersistedData {
    models: Models;
    userGroupNamesForGeneration: string[];
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
    //private userGroupsByName: Record<Id, UserGroup>;

    static constantCode = "BULK_LOAD_SETTINGS";

    static defaultData = {
        models: { dataSet: true, program: false },
        userGroupsForGeneration: ["HMIS Officers"],
    };

    constructor(options: Options) {
        this.api = options.api;
        this.currentUser = options.currentUser;
        this.models = options.models;
        this.userGroups = options.userGroups;
        this.userGroupsForGeneration = options.userGroupsForGeneration;
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
        const { api, models, userGroupsForGeneration } = this;
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
        const data: PersistedData = { models, userGroupNamesForGeneration };
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

    update(newOptions: Partial<Options>): Settings {
        return new Settings({ ..._.pick(this, optionFields), ...newOptions });
    }

    setModel(model: Model, value: boolean) {
        return this.update({ models: { ...this.models, [model]: value } });
    }

    setUserGroupsForGenerationFromIds(userGroupIds: Id[]) {
        const userGroupsForGeneration = _(this.userGroups)
            .keyBy(userGroup => userGroup.id)
            .at(userGroupIds)
            .compact()
            .value();
        return this.update({ userGroupsForGeneration });
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
