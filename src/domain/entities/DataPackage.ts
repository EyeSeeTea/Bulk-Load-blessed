import { Id } from "./ReferenceObject";

export interface DataPackage {
    id?: Id;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
    dataValues: DataValue[];
}

export interface DataValue {
    dataElement: Id;
    category?: Id;
    value: string | number | boolean;
    comment?: string;
}
