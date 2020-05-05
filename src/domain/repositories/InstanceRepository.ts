import { Moment } from "moment";
import { DataPackage } from "../entities/DataPackage";
import { DataSet } from "../entities/DataSet";
import { OrgUnit } from "../entities/OrgUnit";
import { Program } from "../entities/Program";
import { Id } from "../entities/ReferenceObject";

export interface GetDataPackageParams {
    type: "dataSets" | "programs";
    id: Id;
    orgUnits: Id[];
    startDate?: Moment;
    endDate?: Moment;
}

export interface InstanceRepository {
    getDataSets(): Promise<DataSet[]>;
    getPrograms(): Promise<Program[]>;
    getOrgUnitRoots(): Promise<OrgUnit[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage[]>;
}
