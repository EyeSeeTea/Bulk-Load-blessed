import { Moment } from "moment";
import { DataPackage } from "../entities/DataPackage";
import { DataSet } from "../entities/DataSet";
import { Program } from "../entities/Program";
import { Id } from "../entities/ReferenceObject";

export interface GetDataPackageParams {
    type: "dataSet" | "program";
    id: Id;
    orgUnits: Id[];
    startDate?: Moment;
    endDate?: Moment;
}

export interface InstanceRepository {
    getDataSets(): Promise<DataSet[]>;
    getPrograms(): Promise<Program[]>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage[]>;
}
