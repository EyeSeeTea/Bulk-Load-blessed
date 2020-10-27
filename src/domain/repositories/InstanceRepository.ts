import { Moment } from "moment";
import { DataForm, DataFormType } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { AggregatedPackage, EventsPackage } from "../entities/DhisDataPackage";
import { Locale } from "../entities/Locale";
import { OrgUnit } from "../entities/OrgUnit";
import { Id, NamedRef } from "../entities/ReferenceObject";
import { Program, TrackedEntityInstance } from "../entities/TrackedEntityInstance";
import { SynchronizationResult } from "../entities/SynchronizationResult";

export interface GetDataPackageParams {
    type: DataFormType;
    id: Id;
    orgUnits: Id[];
    periods?: Id[];
    startDate?: Moment;
    endDate?: Moment;
    translateCodes?: boolean;
}

export interface GetDataFormsParams {
    ids?: string[];
    type?: Array<"dataSets" | "programs">;
}

export interface InstanceRepository {
    getUserOrgUnits(): Promise<OrgUnit[]>;
    getDataForms(options?: GetDataFormsParams): Promise<DataForm[]>;
    getDataFormOrgUnits(type: DataFormType, id: string): Promise<OrgUnit[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage>;
    getLocales(): Promise<Locale[]>;
    getDefaultIds(): Promise<string[]>;
    deleteAggregatedData(dataPackage: DataPackage): Promise<SynchronizationResult>;
    importDataPackage(dataPackage: DataPackage): Promise<SynchronizationResult[]>;
    getProgram(programId: Id): Promise<Program | undefined>;
    convertDataPackage(dataPackage: DataPackage): EventsPackage | AggregatedPackage;
    getBuilderMetadata(teis: TrackedEntityInstance[]): Promise<BuilderMetadata>;
}

export interface BuilderMetadata {
    orgUnits: Record<Id, NamedRef>;
    options: Record<Id, NamedRef & { code: string }>;
    categoryOptionCombos: Record<Id, NamedRef>;
}

export const emptyBuilderMetadata: BuilderMetadata = {
    orgUnits: {},
    options: {},
    categoryOptionCombos: {},
};
