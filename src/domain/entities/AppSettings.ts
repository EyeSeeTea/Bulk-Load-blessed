import { GetArrayInnerType } from "../../types/utils";
import { DataElementDisaggregated } from "./DataElementDisaggregated";
import { DataFormTemplate } from "./DataFormTemplate";
import { Id, NamedRef, Ref } from "./ReferenceObject";

const models = ["dataSet", "program"] as const;
export type Model = GetArrayInnerType<typeof models>;
export type Models = Record<Model, boolean>;

export type OrgUnitSelectionSetting = "generation" | "import" | "both";
export type DuplicateToleranceUnit = "day" | "week" | "month" | "year";
export type DuplicateExclusion = Record<Id, Id[]>;

type DataSetId = Id;
type ProgramStageId = Id;
export type DataSetDataElementsFilter = Record<DataSetId, DataElementDisaggregated[]>;
export type ProgramStageFilter = Record<
    ProgramStageId,
    { dataElementsExcluded: Ref[]; attributesIncluded: Ref[]; externalDataElementsIncluded: Ref[] }
>;
export type ProgramStagePopulateEventsForEveryTei = Record<ProgramStageId, boolean>;

export interface AppSettings {
    models: Record<Model, boolean>;
    permissionsForGeneration: NamedRef[];
    permissionsForSettings: NamedRef[];
    permissionsForImport: NamedRef[];
    permissionsForTemplates: NamedRef[];
    allPermissionsForGeneration: boolean;
    allPermissionsForSettings: boolean;
    allPermissionsForImport: boolean;
    allPermissionsForTemplates: boolean;
    orgUnitSelection: OrgUnitSelectionSetting;
    duplicateEnabled: boolean;
    duplicateExclusion: DuplicateExclusion;
    duplicateTolerance: number;
    duplicateToleranceUnit: DuplicateToleranceUnit;
    dataSetDataElementsFilter: DataSetDataElementsFilter;
    programStageFilter: ProgramStageFilter;
    programStagePopulateEventsForEveryTei: ProgramStagePopulateEventsForEveryTei;
    dataFormTemplate: DataFormTemplate;
}
