import { D2Api, Id, D2Constant, PartialPersistedModel } from "d2-api";
import _ from "lodash";
import i18n from "../locales";
import { generateUid } from "d2/uid";

const models = ["dataSet", "program"] as const;
const optionFields = ["models", "userGroups", "userGroupsForGeneration"] as const;

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

export default class Settings {
    public api: D2Api;
    public models: Models;
    public userGroups: UserGroup[];
    public userGroupsForGeneration: UserGroup[];

    static constantCode = "BULK_LOAD_SETTINGS";

    static defaultData = {
        models: { dataSet: true, program: false },
        userGroupsForGeneration: ["HMIS Officers"],
    };

    constructor(api: D2Api, options: Options) {
        this.api = api;
        this.models = options.models;
        this.userGroups = options.userGroups;
        this.userGroupsForGeneration = options.userGroupsForGeneration;
    }

    static async build(api: D2Api): Promise<Settings> {
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

        return new Settings(api, {
            userGroups: userGroups,
            models: data.models || Settings.defaultData.models,
            userGroupsForGeneration,
        });
    }

    async save() {
        const { api, models, userGroupsForGeneration } = this;

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

        return await api.metadata.post({ constants: [newSettingsConstant] }).getData();
    }

    update(newOptions: Partial<Options>): Settings {
        return new Settings(this.api, { ..._.pick(this, optionFields), ...newOptions });
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

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }
}
