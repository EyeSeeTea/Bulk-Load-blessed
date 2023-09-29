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
    ProgramStagePopulateEventsForEveryTei,
    TemplatePermission,
    TemplatePermissionAccess,
    TemplatePermissions,
} from "../../domain/entities/AppSettings";
import { DataFormTemplate } from "../../domain/entities/DataFormTemplate";
import {
    DataElementDisaggregated,
    DataElementDisaggregatedId,
    getDataElementDisaggregatedById,
    getDataElementDisaggregatedId,
} from "../../domain/entities/DataElementDisaggregated";
import { Id, NamedRef } from "../../domain/entities/ReferenceObject";
import i18n from "../../locales";
import { D2Api, Ref } from "../../types/d2-api";
import { GetArrayInnerType, Maybe, OkOrError } from "../../types/utils";
import { User } from "../../domain/entities/User";

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
    "programStagePopulateEventsForEveryTei",
    "dataFormTemplate",
    "templatePermissions",
] as const;

const allFields = [...privateFields, ...publicFields];

type Options = Pick<Settings, GetArrayInnerType<typeof allFields>>;
type PublicOption = Pick<Options, GetArrayInnerType<typeof publicFields>>;

export type PermissionSetting = "generation" | "settings" | "import";
export type PermissionType = "user" | "userGroup";

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
    public currentUser: User;
    public permissions: Permissions;
    public templatePermissions: Record<Id, PermissionValue>;
    public models: Models;
    public orgUnitSelection: OrgUnitSelectionSetting;
    public duplicateEnabled: boolean;
    public duplicateExclusion: DuplicateExclusion;
    public duplicateTolerance: number;
    public duplicateToleranceUnit: DuplicateToleranceUnit;
    public dataSetDataElementsFilter: DataSetDataElementsFilter;
    public programStageFilter: ProgramStageFilter;
    public programStagePopulateEventsForEveryTei: ProgramStagePopulateEventsForEveryTei;
    public dataFormTemplate: DataFormTemplate;

    static constantCode = "BULK_LOAD_SETTINGS";

    constructor(options: Options) {
        this.currentUser = options.currentUser;
        this.permissions = options.permissions;
        this.templatePermissions = options.templatePermissions;
        this.models = options.models;
        this.orgUnitSelection = options.orgUnitSelection;
        this.duplicateEnabled = options.duplicateEnabled;
        this.duplicateExclusion = options.duplicateExclusion;
        this.duplicateTolerance = options.duplicateTolerance;
        this.duplicateToleranceUnit = options.duplicateToleranceUnit;
        this.dataSetDataElementsFilter = options.dataSetDataElementsFilter;
        this.programStageFilter = options.programStageFilter;
        this.programStagePopulateEventsForEveryTei = options.programStagePopulateEventsForEveryTei;
        this.dataFormTemplate = options.dataFormTemplate;
    }

    static async build(api: D2Api, compositionRoot: CompositionRoot): Promise<Settings> {
        const authorities = await api.get<string[]>("/me/authorization").getData();

        const d2CurrentUser = await api.currentUser
            .get({
                fields: {
                    id: true,
                    name: true,
                    userCredentials: { username: true },
                    userGroups: { id: true },
                    dataViewOrganisationUnits: {
                        id: true,
                        level: true,
                        name: true,
                        path: true,
                    },
                    organisationUnits: {
                        id: true,
                        level: true,
                        name: true,
                        path: true,
                    },
                },
            })
            .getData();
        const currentUser: User = {
            id: d2CurrentUser.id,
            name: d2CurrentUser.name,
            username: d2CurrentUser.userCredentials.username,
            authorities: new Set(authorities),
            userGroups: d2CurrentUser.userGroups,
            orgUnits: d2CurrentUser.organisationUnits,
            orgUnitsView: d2CurrentUser.dataViewOrganisationUnits,
        };
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

        const buildTemplatesPermission = (
            templatePermissions: Maybe<TemplatePermissions>
        ): Record<Id, PermissionValue> => {
            return _.mapValues(templatePermissions || {}, (permissionsForTemplate): PermissionValue => {
                if (permissionsForTemplate.all) return { type: "all" };

                const storedValues = permissionsForTemplate.accesses;
                const allValues = storedValues;
                const users = permissionsForTemplate.accesses.filter(access => access.type === "user");
                const groups = permissionsForTemplate.accesses.filter(access => access.type === "userGroup");
                const unknown = isUserAdmin ? [] : _.differenceBy(allValues, users, groups, "id");

                return { type: "sharing", users, groups, unknown };
            });
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
            programStagePopulateEventsForEveryTei:
                data.programStagePopulateEventsForEveryTei ?? defaultSettings.programStagePopulateEventsForEveryTei,
            dataFormTemplate: data.dataFormTemplate ?? defaultSettings.dataFormTemplate,
            templatePermissions: buildTemplatesPermission(data.templatePermissions),
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
            programStagePopulateEventsForEveryTei,
            dataFormTemplate,
        } = this;
        const validation = this.validate();
        if (!validation.status) return validation;

        const buildPermissions = (setting: PermissionSetting): NamedRef[] => {
            const permission = permissions[setting];
            if (!permission || permission.type !== "sharing") return [];

            return [...permission.users, ...permission.groups, ...permission.unknown];
        };

        const buildTemplatePermissions = (): TemplatePermissions => {
            const addType = (refs: NamedRef[], type: TemplatePermissionAccess["type"]): TemplatePermissionAccess[] =>
                refs.map(ref => ({ ...ref, type }));

            return _.mapValues(this.templatePermissions, (permission): TemplatePermission => {
                if (!permission || permission.type !== "sharing") return { accesses: [], all: true };

                const accesses = _.concat(
                    addType(permission.users, "user"),
                    addType(permission.groups, "userGroup"),
                    addType(permission.unknown, "unknown")
                );

                return { accesses, all: false };
            });
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
            programStagePopulateEventsForEveryTei,
            dataFormTemplate,
            templatePermissions: buildTemplatePermissions(),
        };

        try {
            await compositionRoot.settings.write<AppSettings>(Settings.constantCode, data);
            return { status: true };
        } catch (error: any) {
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

    getTemplatePermissions(templateId: Id, type: PermissionType): TemplatePermissionAccess[] {
        const permission = this.templatePermissions[templateId];
        if (!permission || permission.type !== "sharing") return [];

        return permission[getPermissionField(type)].map(obj => ({ ...obj, type }));
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

    setTemplatePermissions(templateId: Id, type: PermissionType, collection: TemplatePermissionAccess[]): Settings {
        const permission = this.templatePermissions[templateId];
        const field = getPermissionField(type);
        const existing: PermissionValue =
            !permission || permission.type !== "sharing"
                ? { type: "sharing", users: [], groups: [], unknown: [] }
                : permission;

        return this.updateOptions({
            templatePermissions: {
                ...this.templatePermissions,
                [templateId]: { ...existing, [field]: collection },
            },
        });
    }

    hasAllPermission(setting: PermissionSetting): boolean {
        return this.permissions[setting].type === "all";
    }

    hasAllPermissionForTemplate(templateId: string): boolean {
        const permissionsForTemplate = this.templatePermissions[templateId];
        return !permissionsForTemplate || this.templatePermissions[templateId]?.type === "all";
    }

    setAllPermission(setting: PermissionSetting, value: boolean): Settings {
        const permission = value ? { type: "all" } : { type: "sharing", users: [], groups: [], unknown: [] };
        return this.updateOptions({ permissions: { ...this.permissions, [setting]: permission } });
    }

    setTemplateAllPermission(templateId: Id, value: boolean): Settings {
        const permission: PermissionValue = value
            ? { type: "all" }
            : { type: "sharing", users: [], groups: [], unknown: [] };

        return this.updateOptions({
            templatePermissions: { ...this.templatePermissions, [templateId]: permission },
        });
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

    setDataSetDataElementsFilterFromSelection(options: {
        dataSet: string;
        dataElementsDisaggregated: DataElementDisaggregated[];
        prevSelectedIds: DataElementDisaggregatedId[];
        newSelectedIds: DataElementDisaggregatedId[];
    }): Settings {
        const { dataSet, dataElementsDisaggregated, prevSelectedIds, newSelectedIds } = options;

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

        return this.updateOptions({
            dataSetDataElementsFilter: {
                ...this.dataSetDataElementsFilter,
                [dataSet]: newFilterValue,
            },
        });
    }

    setProgramStageFilterFromSelection(options: {
        programStage: string;
        dataElementsExcluded: Ref[];
        attributesIncluded: Ref[];
        externalDataElementsIncluded: Ref[];
    }): Settings {
        const { programStage, dataElementsExcluded, attributesIncluded, externalDataElementsIncluded } = options;
        return this.updateOptions({
            programStageFilter: {
                ...this.programStageFilter,
                [programStage]: { dataElementsExcluded, attributesIncluded, externalDataElementsIncluded },
            },
        });
    }

    setPopulateEventsForEveryTei(options: { programStage: string; populateEventsForEveryTei: boolean }): Settings {
        const { programStage, populateEventsForEveryTei } = options;

        return this.updateOptions({
            programStagePopulateEventsForEveryTei: {
                ...this.programStagePopulateEventsForEveryTei,
                [programStage]: populateEventsForEveryTei,
            },
        });
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
        return this.hasPermissions(this.permissions.generation);
    }

    areSettingsVisibleForCurrentUser(): boolean {
        return this.hasPermissions(this.permissions.settings);
    }

    isImportDataVisibleForCurrentUser(): boolean {
        return this.hasPermissions(this.permissions.import);
    }

    isDataFormVisibleForCurrentUser(dataFormId: Id): boolean {
        const permission = this.templatePermissions[dataFormId];
        return !permission || this.hasPermissions(permission);
    }

    getModelsInfo(): Array<{ key: Model; name: string; value: boolean }> {
        return [
            { key: "dataSet", name: i18n.t("Data set"), value: this.models.dataSet },
            { key: "program", name: i18n.t("Program"), value: this.models.program },
        ];
    }

    getTemplateIdsForDataForm(dataForm: Maybe<Ref>): Id[] | undefined {
        const { relationships } = this.dataFormTemplate;
        const hasRelationships = dataForm && dataForm.id in relationships;

        if (dataForm && hasRelationships) {
            const relationshipsForDataForm = relationships[dataForm.id] || [];
            return relationshipsForDataForm.map(r => r.templateId);
        } else {
            return undefined;
        }
    }

    updateDataFormTemplateRelationship(dataForm: Ref, templateIds: Id[]): Settings {
        const newValue: DataFormTemplate = {
            relationships: {
                ...this.dataFormTemplate.relationships,
                [dataForm.id]: templateIds.map(id => ({ templateId: id })),
            },
        };

        return this.update({ dataFormTemplate: newValue });
    }

    private hasPermissions(permission: PermissionValue): boolean {
        if (permission.type === "all") return true;

        const hasGroupAccess = this.findCurrentUser(permission.groups);
        const hasUserAccess = this.findCurrentUser(permission.users);
        const hasUnknownAccess = this.findCurrentUser(permission.unknown);
        return hasGroupAccess || hasUserAccess || hasUnknownAccess;
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
    }
}
