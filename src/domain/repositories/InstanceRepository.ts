import { Moment } from "moment";
import { DataForm, DataFormType } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { Locale } from "../entities/Locale";
import { OrgUnit } from "../entities/OrgUnit";
import { Id, Ref } from "../entities/ReferenceObject";
import { TrackedEntityInstance } from "../entities/TrackedEntityInstance";

export interface InstanceRepository {
    getUserOrgUnits(): Promise<OrgUnit[]>;
    getDataForms(type: DataFormType, ids?: string[]): Promise<DataForm[]>;
    getDataFormOrgUnits(type: DataFormType, id: string): Promise<OrgUnit[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage>;
    getLocales(): Promise<Locale[]>;
    getTrackedEntityInstances(options: GetTeiOptions): Promise<TrackedEntityInstance[]>;
}

export interface GetDataPackageParams {
    type: DataFormType;
    id: Id;
    orgUnits: Id[];
    periods?: Id[];
    startDate?: Moment;
    endDate?: Moment;
    translateCodes?: boolean;
}

export interface GetTeiOptions {
    program: Ref;
    orgUnits: Ref[];
}
