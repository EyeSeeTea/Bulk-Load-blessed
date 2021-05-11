import _ from "lodash";
import { CompositionRoot } from "../../CompositionRoot";
import {
    AppSettings,
    DataSetDataElementsFilter,
    DuplicateExclusion,
    DuplicateToleranceUnit,
    Model,
    Models,
    OrgUnitSelectionSetting,
    ProgramStageFilter,
} from "../../domain/entities/AppSettings";
import {
    DataElementDisaggregated,
    DataElementDisaggregatedId,
    getDataElementDisaggregatedById,
    getDataElementDisaggregatedId,
} from "../../domain/entities/DataElementDisaggregated";
import { DataForm } from "../../domain/entities/DataForm";
import { Id, NamedRef } from "../../domain/entities/ReferenceObject";
import i18n from "../../locales";
import { D2Api, Ref } from "../../types/d2-api";
import { GetArrayInnerType } from "../../types/utils";

const privateFields = ["currentUser"] as const;

const publicFields = [
    "models",
    "permissions",
    "orgUnitSelection",
    "duplicateEnabled",
    "duplicateExclusion",
    "duplicateTolerance",
    "duplicateToleranceUnit",
    "dataSetDataElementsFilter",
    "programStageFilter",
] as const;

const allFields = [...privateFields, ...publicFields];

type Options = Pick<Settings, GetArrayInnerType<typeof allFields>>;
type PublicOption = Pick<Options, GetArrayInnerType<typeof publicFields>>;

export type PermissionSetting = "generation" | "settings" | "import";
export type PermissionType = "user" | "userGroup";

interface CurrentUser extends Ref {
    userGroups: Ref[];
    authorities: Set<string>;
}

type OkOrError = { status: true } | { status: false; error: string };

type PermissionValue =
    | { type: "all" }
    | {
          type: "sharing";
          users: NamedRef[];
          groups: NamedRef[];
          unknown: NamedRef[];
      };

type Permissions = {
    [setting in PermissionSetting]: PermissionValue;
};

export default class Settings {
    public currentUser: CurrentUser;
    public permissions: Permissions;
    public models: Models;
    public orgUnitSelection: OrgUnitSelectionSetting;
    public duplicateEnabled: boolean;
    public duplicateExclusion: DuplicateExclusion;
    public duplicateTolerance: number;
    public duplicateToleranceUnit: DuplicateToleranceUnit;
    public dataSetDataElementsFilter: DataSetDataElementsFilter;
    public programStageFilter: ProgramStageFilter;

    static constantCode = "BULK_LOAD_SETTINGS";

    constructor(options: Options) {
        this.currentUser = options.currentUser;
        this.permissions = options.permissions;
        this.models = options.models;
        this.orgUnitSelection = options.orgUnitSelection;
        this.duplicateEnabled = options.duplicateEnabled;
        this.duplicateExclusion = options.duplicateExclusion;
        this.duplicateTolerance = options.duplicateTolerance;
        this.duplicateToleranceUnit = options.duplicateToleranceUnit;
        this.dataSetDataElementsFilter = options.dataSetDataElementsFilter;
        this.programStageFilter = options.programStageFilter;
    }

    static async build(api: D2Api, compositionRoot: CompositionRoot): Promise<Settings> {
        const authorities = await api.get<string[]>("/me/authorization").getData();

        const d2CurrentUser = await api.currentUser.get({ fields: { id: true, userGroups: { id: true } } }).getData();
        const currentUser: CurrentUser = { ...d2CurrentUser, authorities: new Set(authorities) };
        const isUserAdmin = currentUser.authorities.has("ALL");

        const defaultSettings = compositionRoot.settings.getDefault();
        const data = await compositionRoot.settings.read<Partial<AppSettings>>(Settings.constantCode, defaultSettings);

        const buildPermission = async (prop: PermissionSetting): Promise<PermissionValue> => {
            const permissionKey = mapPermissionSettingToConfig(prop);
            const allKey = mapPermissionSettingToAllConfig(prop);

            const isAllEnabled = data[allKey] ?? defaultSettings[allKey];
            if (isAllEnabled) return { type: "all" };

            const storedValues = data[permissionKey] ?? [];
            const defaultValues = defaultSettings[permissionKey] ?? [];
            const allValues = [...storedValues, ...defaultValues];

            const query = {
                fields: { id: true, name: true },
                filter: { id: { in: allValues.map(({ id }) => id) } },
            };

            const { users, userGroups: groups } = await api.metadata.get({ userGroups: query, users: query }).getData();

            const unknown = isUserAdmin ? [] : _.differenceBy(allValues, users, groups, "id");

            return { type: "sharing", users, groups, unknown };
        };

        const permissions = {
            generation: await buildPermission("generation"),
            import: await buildPermission("import"),
            settings: await buildPermission("settings"),
        };

        return new Settings({
            currentUser,
            permissions,
            models: data.models ?? defaultSettings.models,
            orgUnitSelection: data.orgUnitSelection ?? defaultSettings.orgUnitSelection,
            duplicateEnabled: data.duplicateEnabled ?? true,
            duplicateExclusion: data.duplicateExclusion ?? defaultSettings.duplicateExclusion,
            duplicateTolerance: data.duplicateTolerance ?? defaultSettings.duplicateTolerance,
            duplicateToleranceUnit: data.duplicateToleranceUnit ?? defaultSettings.duplicateToleranceUnit,
            dataSetDataElementsFilter: data.dataSetDataElementsFilter ?? defaultSettings.dataSetDataElementsFilter,
            programStageFilter: data.programStageFilter ?? defaultSettings.programStageFilter,
        });
    }

    validate(): OkOrError {
        const isSomeModelEnabled = _(this.models).values().some();
        return isSomeModelEnabled ? { status: true } : { status: false, error: i18n.t("Select at least one model") };
    }

    async save(compositionRoot: CompositionRoot): Promise<OkOrError> {
        const {
            models,
            permissions,
            orgUnitSelection,
            duplicateEnabled,
            duplicateExclusion,
            duplicateTolerance,
            duplicateToleranceUnit,
            dataSetDataElementsFilter,
            programStageFilter,
        } = this;
        const validation = this.validate();
        if (!validation.status) return validation;

        const buildPermissions = (setting: PermissionSetting): NamedRef[] => {
            const permission = permissions[setting];
            if (!permission || permission.type !== "sharing") return [];

            return [...permission.users, ...permission.groups, ...permission.unknown];
        };

        const data: AppSettings = {
            models,
            permissionsForGeneration: buildPermissions("generation"),
            permissionsForSettings: buildPermissions("settings"),
            permissionsForImport: buildPermissions("import"),
            allPermissionsForSettings: permissions.settings.type === "all",
            allPermissionsForGeneration: permissions.generation.type === "all",
            allPermissionsForImport: permissions.import.type === "all",
            orgUnitSelection,
            duplicateEnabled,
            duplicateExclusion,
            duplicateTolerance,
            duplicateToleranceUnit,
            dataSetDataElementsFilter,
            programStageFilter,
        };

        try {
            await compositionRoot.settings.write<AppSettings>(Settings.constantCode, data);
            return { status: true };
        } catch (error) {
            return { status: false, error: error.message || "Unknown" };
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

    getPermissions(setting: PermissionSetting, type: PermissionType): NamedRef[] {
        const permission = this.permissions[setting];
        if (!permission || permission.type !== "sharing") return [];

        return permission[getPermissionField(type)];
    }

    setPermissions(setting: PermissionSetting, type: PermissionType, collection: NamedRef[]): Settings {
        const permission = this.permissions[setting];
        const field = getPermissionField(type);
        const existing: PermissionValue =
            !permission || permission.type !== "sharing"
                ? { type: "sharing", users: [], groups: [], unknown: [] }
                : permission;

        return this.updateOptions({
            permissions: {
                ...this.permissions,
                [setting]: {
                    ...existing,
                    [field]: collection,
                },
            },
        });
    }

    hasAllPermission(setting: PermissionSetting): boolean {
        return this.permissions[setting].type === "all";
    }

    setAllPermission(setting: PermissionSetting, value: boolean): Settings {
        const permission = value ? { type: "all" } : { type: "sharing", users: [], groups: [], unknown: [] };
        return this.updateOptions({ permissions: { ...this.permissions, [setting]: permission } });
    }

    setDuplicateEnabled(duplicateEnabled: boolean): Settings {
        return this.updateOptions({ duplicateEnabled });
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

    setDataSetDataElementsFilter(dataSetDataElementsFilter: DataSetDataElementsFilter): Settings {
        return this.updateOptions({ dataSetDataElementsFilter });
    }

    setProgramStageFilter(programStageFilter: ProgramStageFilter): Settings {
        return this.updateOptions({ programStageFilter });
    }

    setDataSetDataElementsFilterFromSelection(options: {
        dataSet: DataForm | undefined;
        dataElementsDisaggregated: DataElementDisaggregated[];
        prevSelectedIds: DataElementDisaggregatedId[];
        newSelectedIds: DataElementDisaggregatedId[];
    }): Settings {
        const { dataSet, dataElementsDisaggregated, prevSelectedIds, newSelectedIds } = options;
        if (!dataSet) return this;

        const newSelected = newSelectedIds.map(getDataElementDisaggregatedById);
        const prevSelected = prevSelectedIds.map(getDataElementDisaggregatedById);
        const disaggregatedById = _.groupBy(dataElementsDisaggregated, de => de.id);
        const added = _.differenceBy(newSelected, prevSelected, getDataElementDisaggregatedId);
        const removed = _.differenceBy(prevSelected, newSelected, getDataElementDisaggregatedId);

        const relatedDisaggregatedToAddForMainElements = _.flatMap(added, de =>
            de.categoryOptionComboId ? [] : _(disaggregatedById).get(de.id, [])
        );
        const relatedDisagregatedToRemove = _.flatMap(removed, de =>
            de.categoryOptionComboId
                ? (disaggregatedById[de.id] || []).filter(de => !de.categoryOptionComboId)
                : _.get(disaggregatedById, de.id, [])
        );

        const newSelectedWithAutomaticLogic = _(newSelected)
            .concat(relatedDisaggregatedToAddForMainElements)
            .differenceBy(relatedDisagregatedToRemove, getDataElementDisaggregatedId)
            .value();

        const newFilterValue = _(dataElementsDisaggregated)
            .differenceBy(newSelectedWithAutomaticLogic, getDataElementDisaggregatedId)
            .uniqBy(getDataElementDisaggregatedId)
            .value();

        const newFilter = { ...this.dataSetDataElementsFilter, [dataSet.id]: newFilterValue };

        return this.setDataSetDataElementsFilter(newFilter);
    }

    allModelsEnabled() {
        return _.every(this.models, Boolean);
    }

    isModelEnabled(key: Model) {
        return this.models[key];
    }

    isBlankPageVisibleForCurrentUser() {
        return !this.isImportDataVisibleForCurrentUser() && !this.isTemplateGenerationVisible();
    }

    isTemplateGenerationVisible() {
        const permission = this.permissions.generation;
        if (permission.type === "all") return true;

        const hasGroupAccess = this.findCurrentUser(permission.groups);
        const hasUserAccess = this.findCurrentUser(permission.users);
        return hasGroupAccess || hasUserAccess;
    }

    areSettingsVisibleForCurrentUser(): boolean {
        const permission = this.permissions.settings;
        if (permission.type === "all") return true;

        const { authorities } = this.currentUser;
        const isUserAdmin = authorities.has("ALL");

        const hasGroupAccess = this.findCurrentUser(permission.groups);
        const hasUserAccess = this.findCurrentUser(permission.users);
        return isUserAdmin || hasGroupAccess || hasUserAccess;
    }

    isImportDataVisibleForCurrentUser(): boolean {
        const permission = this.permissions.import;
        if (permission.type === "all") return true;

        const hasGroupAccess = this.findCurrentUser(permission.groups);
        const hasUserAccess = this.findCurrentUser(permission.users);
        return hasGroupAccess || hasUserAccess;
    }

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }

    private findCurrentUser(collection: NamedRef[]): boolean {
        return !_([this.currentUser, ...this.currentUser.userGroups])
            .intersectionBy(collection, "id")
            .isEmpty();
    }
}

function getPermissionField(kind: "user" | "userGroup"): "users" | "groups" {
    if (kind === "user") {
        return "users";
    } else if (kind === "userGroup") {
        return "groups";
    } else {
        throw new Error("Unsupported field");
    }
}

function mapPermissionSettingToConfig(prop: PermissionSetting) {
    switch (prop) {
        case "generation":
            return "permissionsForGeneration";
        case "import":
            return "permissionsForImport";
        case "settings":
            return "permissionsForSettings";
        default:
            throw new Error(`Unknown type ${prop} to map as permission setting`);
    }
}

function mapPermissionSettingToAllConfig(prop: PermissionSetting) {
    switch (prop) {
        case "generation":
            return "allPermissionsForGeneration";
        case "import":
            return "allPermissionsForImport";
        case "settings":
            return "allPermissionsForSettings";
        default:
            throw new Error(`Unknown type ${prop} to map as all permission setting`);
    }
}
