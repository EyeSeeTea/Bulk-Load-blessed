import { Id } from "./ReferenceObject";

export interface AggregatedDataValue {
    dataElement: Id;
    period: string;
    orgUnit: Id;
    value: string;
    comment?: string;
    categoryOptionCombo?: Id;
    attributeOptionCombo?: Id;
}

export interface AggregatedPackage {
    dataValues: AggregatedDataValue[];
}

export interface DataSet {
    id: string;
    name: string;
}
