import { Moment } from "moment";
import { DataForm, DataFormType } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { AggregatedPackage, EventsPackage } from "../entities/DhisDataPackage";
import { ImportSummary } from "../entities/ImportSummary";
import { Locale } from "../entities/Locale";
import { OrgUnit } from "../entities/OrgUnit";
import { Id } from "../entities/ReferenceObject";

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
    deleteAggregatedData(dataPackage: DataPackage): Promise<ImportSummary>;
    importDataPackage(dataPackage: DataPackage): Promise<ImportSummary>;
    convertDataPackage(dataPackage: DataPackage): EventsPackage | AggregatedPackage;
}
