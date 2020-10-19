import _ from "lodash";
import { CompositionRoot } from "../../CompositionRoot";
import {
    AppSettings,
    DuplicateExclusion,
    DuplicateToleranceUnit,
    Model,
    Models,
    OrgUnitSelectionSetting,
} from "../../domain/entities/AppSettings";
import { Id } from "../../domain/entities/ReferenceObject";
import i18n from "../../locales";
import { D2Api, Ref } from "../../types/d2-api";
import { GetArrayInnerType } from "../../types/utils";

const privateFields = ["currentUser"] as const;

const publicFields = [
    "models",
    "userPermissionsForGeneration",
    "userGroupPermissionsForGeneration",
    "userPermissionsForSettings",
    "userGroupPermissionsForSettings",
    "orgUnitSelection",
    "duplicateExclusion",
    "duplicateTolerance",
    "duplicateToleranceUnit",
] as const;

const allFields = [...privateFields, ...publicFields];

type Options = Pick<Settings, GetArrayInnerType<typeof allFields>>;
type PublicOption = Pick<Options, GetArrayInnerType<typeof publicFields>>;

export type PermissionSetting = "generation" | "settings";
export type PermissionType = "user" | "userGroup";

interface NamedObject {
    id: string;
    displayName: string;
}

interface CurrentUser extends Ref {
    userGroups: Ref[];
    authorities: Set<string>;
}

type OkOrError = { status: true } | { status: false; error: string };

export default class Settings {
    public currentUser: CurrentUser;
    public models: Models;
    public userPermissionsForGeneration: NamedObject[];
    public userGroupPermissionsForGeneration: NamedObject[];
    public userPermissionsForSettings: NamedObject[];
    public userGroupPermissionsForSettings: NamedObject[];
    public orgUnitSelection: OrgUnitSelectionSetting;
    public duplicateExclusion: DuplicateExclusion;
    public duplicateTolerance: number;
    public duplicateToleranceUnit: DuplicateToleranceUnit;

    static constantCode = "BULK_LOAD_SETTINGS";

    constructor(options: Options) {
        this.currentUser = options.currentUser;
        this.models = options.models;
        this.userPermissionsForGeneration = options.userPermissionsForGeneration;
        this.userGroupPermissionsForGeneration = options.userGroupPermissionsForGeneration;
        this.userPermissionsForSettings = options.userPermissionsForSettings;
        this.userGroupPermissionsForSettings = options.userGroupPermissionsForSettings;
        this.orgUnitSelection = options.orgUnitSelection;
        this.duplicateExclusion = options.duplicateExclusion;
        this.duplicateTolerance = options.duplicateTolerance;
        this.duplicateToleranceUnit = options.duplicateToleranceUnit;
    }

    static async build(api: D2Api): Promise<Settings> {
        const authorities = await api.get<string[]>("/me/authorization").getData();

        const d2CurrentUser = await api.currentUser
            .get({ fields: { id: true, userGroups: { id: true } } })
            .getData();

        const currentUser: CurrentUser = {
            ...d2CurrentUser,
            authorities: new Set(authorities),
        };

        const defaultSettings = CompositionRoot.attach().settings.getDefault();
        const data = await CompositionRoot.attach().settings.read<Partial<AppSettings>>(
            Settings.constantCode,
            defaultSettings
        );

        const query = (prop: "permissionsForGeneration" | "permissionsForSettings") => {
            const storedValues = data[prop] ?? [];
            const defaultValues = defaultSettings[prop] ?? [];

            return {
                fields: { id: true, displayName: true },
                filter: { id: { in: [...storedValues, ...defaultValues] } },
            };
        };

        const {
            users: userPermissionsForGeneration,
            userGroups: userGroupPermissionsForGeneration,
        } = await api.metadata
            .get({
                userGroups: query("permissionsForGeneration"),
                users: query("permissionsForGeneration"),
            })
            .getData();

        const {
            users: userPermissionsForSettings,
            userGroups: userGroupPermissionsForSettings,
        } = await api.metadata
            .get({
                userGroups: query("permissionsForSettings"),
                users: query("permissionsForSettings"),
            })
            .getData();

        return new Settings({
            currentUser,
            models: data.models ?? defaultSettings.models,
            userPermissionsForGeneration,
            userGroupPermissionsForGeneration,
            userPermissionsForSettings,
            userGroupPermissionsForSettings,
            orgUnitSelection: data.orgUnitSelection ?? defaultSettings.orgUnitSelection,
            duplicateExclusion: data.duplicateExclusion ?? defaultSettings.duplicateExclusion,
            duplicateTolerance: data.duplicateTolerance ?? defaultSettings.duplicateTolerance,
            duplicateToleranceUnit:
                data.duplicateToleranceUnit ?? defaultSettings.duplicateToleranceUnit,
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
            models,
            userPermissionsForGeneration,
            userGroupPermissionsForGeneration,
            userPermissionsForSettings,
            userGroupPermissionsForSettings,
            orgUnitSelection,
            duplicateExclusion,
            duplicateTolerance,
            duplicateToleranceUnit,
        } = this;
        const validation = this.validate();
        if (!validation.status) return validation;

        const permissionsForGeneration = [
            ...userPermissionsForGeneration,
            ...userGroupPermissionsForGeneration,
        ].map(ug => ug.id);

        const permissionsForSettings = [
            ...userPermissionsForSettings,
            ...userGroupPermissionsForSettings,
        ].map(ug => ug.id);

        const data: AppSettings = {
            models,
            permissionsForGeneration,
            permissionsForSettings,
            orgUnitSelection,
            duplicateExclusion,
            duplicateTolerance,
            duplicateToleranceUnit,
        };

        try {
            await CompositionRoot.attach().settings.write<AppSettings>(Settings.constantCode, data);
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

    getPermissions(setting: PermissionSetting, type: PermissionType): NamedObject[] {
        return this[this.getPermissionField(setting, type)];
    }

    setPermissions(
        setting: PermissionSetting,
        type: PermissionType,
        collection: NamedObject[]
    ): Settings {
        return this.updateOptions({
            [this.getPermissionField(setting, type)]: collection,
        });
    }

    setDuplicateExclusions(program: Id, exclusions: Id[]): Settings {
        const duplicateExclusion = _.transform(
            {
                ...this.duplicateExclusion,
                [program]: exclusions,
            },
            (result, value, key) => {
                // Clean-up empty arrays from exclusions
                if (value.length > 0) result[key] = value;
            },
            {} as DuplicateExclusion
        );

        return this.updateOptions({ duplicateExclusion });
    }

    allModelsEnabled() {
        return _.every(this.models, Boolean);
    }

    isModelEnabled(key: Model) {
        return this.models[key];
    }

    isTemplateGenerationVisible() {
        const hasGroupAccess = this.findCurrentUser(this.userGroupPermissionsForGeneration);
        const hasUserAccess = this.findCurrentUser(this.userPermissionsForGeneration);

        return hasGroupAccess || hasUserAccess;
    }

    areSettingsVisibleForCurrentUser(): boolean {
        const { authorities } = this.currentUser;
        const isUserAdmin = authorities.has("ALL");
        const hasGroupAccess = this.findCurrentUser(this.userGroupPermissionsForSettings);
        const hasUserAccess = this.findCurrentUser(this.userPermissionsForSettings);

        return isUserAdmin || hasGroupAccess || hasUserAccess;
    }

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }

    private getPermissionField(setting: PermissionSetting, kind: "user" | "userGroup") {
        if (setting === "generation" && kind === "user") {
            return "userPermissionsForGeneration";
        } else if (setting === "generation" && kind === "userGroup") {
            return "userGroupPermissionsForGeneration";
        } else if (setting === "settings" && kind === "user") {
            return "userPermissionsForSettings";
        } else if (setting === "settings" && kind === "userGroup") {
            return "userGroupPermissionsForSettings";
        } else {
            throw new Error("Unsupported field");
        }
    }

    private findCurrentUser(collection: NamedObject[]): boolean {
        return !_([this.currentUser, ...this.currentUser.userGroups])
            .intersectionBy(collection, userGroup => userGroup.id)
            .isEmpty();
    }
}
