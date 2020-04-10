import { Id } from "./ReferenceObject";

export interface DataValue {
    dataElement: Id;
    period: string;
    orgUnit: Id;
    value: string;
    comment?: string;
    categoryOptionCombo?: Id;
    attributeOptionCombo?: Id;
}

export interface AggregatedPackage {
    dataValues: DataValue[];
}
