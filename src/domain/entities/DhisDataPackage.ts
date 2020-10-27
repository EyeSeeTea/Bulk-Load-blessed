export interface EventsPackage {
    events: Event[];
}

export interface AggregatedPackage {
    dataValues: AggregatedDataValue[];
}

export interface AggregatedDataValue {
    dataElement: string;
    period: string;
    orgUnit: string;
    categoryOptionCombo?: string;
    attributeOptionCombo?: string;
    value: string;
    comment?: string;
}

export interface Event {
    event?: string;
    orgUnit: string;
    program: string;
    status: string;
    eventDate: string;
    coordinate?: {
        latitude: string;
        longitude: string;
    };
    attributeOptionCombo?: string;
    trackedEntityInstance?: string;
    programStage?: string;
    dataValues: Array<{
        dataElement: string;
        value: string | number | boolean;
    }>;
}
