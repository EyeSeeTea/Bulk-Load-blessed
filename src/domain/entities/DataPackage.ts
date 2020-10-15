import { Id } from "./ReferenceObject";
import { FlattenUnion } from "../../types/flatten-union";

interface BaseDataPackage {
    type: DataPackageType;
    dataForm: string;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    dataValues: DataValue[];
}

interface AggregatedDataPackage extends BaseDataPackage {
    type: "aggregated";
}

interface EventsDataPackage extends BaseDataPackage {
    type: "events";
    id?: string;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
}

export type DataPackageType = "aggregated" | "events";
export type DataPackage = FlattenUnion<AggregatedDataPackage | EventsDataPackage>;

export interface DataValue {
    dataElement: Id;
    category?: Id;
    value: string | number | boolean;
    comment?: string;
}
