import { Id } from "./ReferenceObject";
import { FlattenUnion } from "../../types/flatten-union";
import { DataFormType } from "./DataForm";

interface BaseDataPackage {
    type: DataFormType;
    dataForm: string;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    dataValues: DataValue[];
}

interface AggregatedDataPackage extends BaseDataPackage {
    type: "dataSets";
}

interface EventsDataPackage extends BaseDataPackage {
    type: "programs";
    id?: string;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
}

export type DataPackage = FlattenUnion<AggregatedDataPackage | EventsDataPackage>;

export interface DataValue {
    dataElement: Id;
    category?: Id;
    value: string | number | boolean;
    comment?: string;
}
