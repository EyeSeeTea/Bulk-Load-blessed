import { GetArrayInnerType } from "../../types/utils";
import { DataElementDisaggregated } from "./DataElementDisaggregated";
import { Id, NamedRef } from "./ReferenceObject";

const models = ["dataSet", "program"] as const;
export type Model = GetArrayInnerType<typeof models>;
export type Models = Record<Model, boolean>;
type DataSetId = Id;

export type OrgUnitSelectionSetting = "generation" | "import" | "both";
export type DuplicateToleranceUnit = "day" | "week" | "month" | "year";
export type DuplicateExclusion = Record<Id, Id[]>;
export type DataSetDataElementsFilter = Record<DataSetId, DataElementDisaggregated[]>;

export interface AppSettings {
    models: Record<Model, boolean>;
    permissionsForGeneration: NamedRef[];
    permissionsForSettings: NamedRef[];
    permissionsForImport: NamedRef[];
    allPermissionsForGeneration: boolean;
    allPermissionsForSettings: boolean;
    allPermissionsForImport: boolean;
    orgUnitSelection: OrgUnitSelectionSetting;
    duplicateEnabled: boolean;
    duplicateExclusion: DuplicateExclusion;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
    dataSetDataElementsFilter: DataSetDataElementsFilter;
}
