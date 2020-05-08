import { Moment } from "moment";
import { DataForm, DataFormType } from "../entities/DataForm";
import { DataPackage } from "../entities/DataPackage";
import { OrgUnit } from "../entities/OrgUnit";
import { Id } from "../entities/ReferenceObject";

export interface GetDataPackageParams {
    type: DataFormType;
    id: Id;
    orgUnits: Id[];
    startDate?: Moment;
    endDate?: Moment;
}

export interface InstanceRepository {
    getUserOrgUnits(): Promise<OrgUnit[]>;
    getDataForms(type: DataFormType, ids?: string[]): Promise<DataForm[]>;
    getDataFormOrgUnits(type: DataFormType, id: string): Promise<OrgUnit[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage[]>;
}
