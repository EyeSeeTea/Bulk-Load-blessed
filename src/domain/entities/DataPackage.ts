import { DataFormType } from "./DataForm";
import { Id } from "./ReferenceObject";
import { TrackedEntityInstance } from "./TrackedEntityInstance";

export type DataPackage = BaseDataPackage | TrackerProgramPackage;
export type DataPackageValue = string | number | boolean;

export interface BaseDataPackage {
    type: DataFormType;
    dataEntries: DataPackageData[];
}

export interface TrackerProgramPackage extends BaseDataPackage {
    type: "trackerPrograms";
    trackedEntityInstances: TrackedEntityInstance[];
}

export interface DataPackageData {
    id?: Id;
    dataForm: Id;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    trackedEntityInstance?: Id;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
    dataValues: DataPackageDataValue[];
}

export interface DataPackageDataValue {
    dataElement: Id;
    category?: Id;
    value: DataPackageValue;
    comment?: string;
}
