export interface ProgramEvent {
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
    dataValues: ProgramEventDataValue[];
}

export interface ProgramEventDataValue {
    dataElement: string;
    value: string | number;
}

export interface EventsPackage {
    events: ProgramEvent[];
}

export interface Program {
    id: string;
    name: string;
}
