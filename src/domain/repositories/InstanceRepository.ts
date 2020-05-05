import { DataSet } from "../entities/DataSet";
import { Program } from "../entities/Program";

export interface InstanceRepository {
    getDataSets(): Promise<DataSet[]>;
    getPrograms(): Promise<Program[]>;
}
