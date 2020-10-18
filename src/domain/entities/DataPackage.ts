import { Id } from "./ReferenceObject";
import { TrackedEntityInstance } from "./TrackedEntityInstance";

export interface BaseDataPackage {
    type: "data";
    dataEntries: Data[];
}

export interface TrackerProgramPackage {
    type: "trackerPrograms";
    trackedEntityInstances: TrackedEntityInstance[];
    dataEntries: Data[];
}
export type DataPackage = BaseDataPackage | TrackerProgramPackage;

export interface Data {
    id?: Id;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    trackedEntityInstance?: Id;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
    dataValues: DataValue[];
}

export interface DataValue {
    dataElement: Id;
    category?: Id;
    value: string | number;
    comment?: string;
}
