import { Moment } from "moment";
import { DataForm, DataFormType, DataFormMainType } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { Locale } from "../entities/Locale";
import { OrgUnit } from "../entities/OrgUnit";
import { Id, Ref } from "../entities/ReferenceObject";

export interface InstanceRepository {
    getUserOrgUnits(): Promise<OrgUnit[]>;
    getDataForms(type: DataFormMainType, ids?: string[]): Promise<DataForm[]>;
    getDataFormOrgUnits(type: DataFormType, id: string): Promise<OrgUnit[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage>;
    getLocales(): Promise<Locale[]>;
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
