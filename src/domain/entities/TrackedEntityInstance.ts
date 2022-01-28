import _ from "lodash";
import { Id, Ref } from "./ReferenceObject";
import { Relationship } from "./Relationship";

export interface TrackedEntityInstance {
    program: Ref;
    id: Id;
    orgUnit: Ref;
    disabled: boolean;
    attributeValues: AttributeValue[];
    enrollment: Enrollment | undefined;
    relationships: Relationship[];
    geometry: Geometry;
}

export type Coordinates = { latitude: number; longitude: number };

export type Geometry =
    | { type: "none" }
    | { type: "point"; coordinates: Coordinates }
    | { type: "polygon"; coordinatesList: Coordinates[] };

export function getGeometryAsString(geometry: Geometry): string {
    switch (geometry.type) {
        case "none":
            return "";
        case "point": {
            const { longitude, latitude } = geometry.coordinates;
            return `[${longitude}, ${latitude}]`;
        }
        case "polygon": {
            const items = geometry.coordinatesList.map(
                coordinates => `[${coordinates.longitude}, ${coordinates.latitude}]`
            );
            return `[${items.join(", ")}]`;
        }
    }
}

export interface Enrollment {
    id?: Id;
    enrollmentDate: string;
    incidentDate: string;
}

export interface AttributeValue {
    attribute: Attribute;
    value: string;
    optionId?: Id;
}

export interface Program {
    id: Id;
    trackedEntityType: Ref;
    attributes: Attribute[];
}

export interface Attribute {
    id: Id;
    optionSet?: { id: Id; options: Array<{ id: string; code: string }> };
}

export function getRelationships(trackedEntityInstances: TrackedEntityInstance[]): Relationship[] {
    return _(trackedEntityInstances)
        .flatMap(tei => tei.relationships)
        .uniqWith(_.isEqual)
        .value();
}

export function isRelationshipValid(relationship: Relationship): boolean {
    return !!(
        relationship &&
        (relationship.typeId || relationship.typeName) &&
        relationship.fromId &&
        relationship.toId
    );
}
