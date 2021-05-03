import _ from "lodash";
import { MigrationParams } from ".";
import {
    DataSetDataElementsFilter,
    DuplicateExclusion,
    DuplicateToleranceUnit,
    Model,
    OrgUnitSelectionSetting,
} from "../../../domain/entities/AppSettings";
import { Debug } from "../../../domain/entities/Debug";
import { NamedRef } from "../../../domain/entities/ReferenceObject";
import { D2Api } from "../../../types/d2-api";
import { AppStorage, Migration } from "../client/types";

interface BaseAppSettings {
    models: Record<Model, boolean>;
    orgUnitSelection: OrgUnitSelectionSetting;
    duplicateEnabled: boolean;
    duplicateExclusion: DuplicateExclusion;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
    dataSetDataElementsFilter: DataSetDataElementsFilter;
}

interface OldAppSettings extends BaseAppSettings {
    permissionsForGeneration: string[];
    permissionsForSettings: string[];
    permissionsForImport: string[];
}

interface NewAppSettings extends BaseAppSettings {
    permissionsForGeneration: NamedRef[];
    permissionsForSettings: NamedRef[];
    permissionsForImport: NamedRef[];
    allPermissionsForGeneration: boolean;
    allPermissionsForSettings: boolean;
    allPermissionsForImport: boolean;
}

const defaultSettings: OldAppSettings = {
    models: {
        dataSet: true,
        program: true,
    },
    permissionsForGeneration: [],
    permissionsForSettings: [],
    permissionsForImport: [],
    orgUnitSelection: "both",
    duplicateEnabled: true,
    duplicateExclusion: {},
    duplicateTolerance: 1,
    duplicateToleranceUnit: "day",
    dataSetDataElementsFilter: {},
};

const mapSharingSettings = async (api: D2Api, ids: string[] | undefined): Promise<NamedRef[]> => {
    const query = { filter: { id: { in: ids } }, fields: { id: true, name: true } };
    const { users, userGroups } = await api.metadata.get({ users: query, userGroups: query }).getData();
    const lookup = [...users, ...userGroups];

    return _.compact(ids)
        .filter(id => id !== "ALL")
        .map(id => ({
            id,
            name: lookup.find(user => user.id === id)?.name ?? "Unknown user",
        }));
};

export async function migrate(storage: AppStorage, _debug: Debug, params: MigrationParams): Promise<void> {
    const settings = await storage.getOrCreate<Partial<OldAppSettings>>("BULK_LOAD_SETTINGS", defaultSettings);
    const { d2Api: api } = params;

    const newSettings = {
        ...settings,
        permissionsForGeneration: await mapSharingSettings(api, settings.permissionsForGeneration),
        permissionsForSettings: await mapSharingSettings(api, settings.permissionsForSettings),
        permissionsForImport: await mapSharingSettings(api, settings.permissionsForImport),
        allPermissionsForGeneration: settings.permissionsForGeneration?.includes("ALL"),
        allPermissionsForSettings: settings.permissionsForSettings?.includes("ALL"),
        allPermissionsForImport: settings.permissionsForImport?.includes("ALL"),
    };

    await storage.save<Partial<NewAppSettings>>("BULK_LOAD_SETTINGS", newSettings);
}

const migration: Migration<MigrationParams> = { name: "Update settings permissions", migrate };

export default migration;
