import { Id } from "../types/d2-api";

export type TrackedEntityInstancesRequest = {
    ouMode?: "SELECTED" | "CHILDREN" | "DESCENDANTS" | "ACCESSIBLE" | "CAPTURE" | "ALL";
    ou?: Id;
    program?: Id;
    trackedEntityType?: Id;
    order?: string;
    pageSize?: number;
    page?: number;
    totalPages: true;
    fields?: string;
};

export interface TrackedEntityInstancesResponse {
    pager: {
        page: number;
        total: number;
        pageSize: number;
        pageCount: number;
    };
    trackedEntityInstances: TrackedEntityInstanceApi[];
}

export interface TrackedEntityInstanceApi {
    trackedEntityInstance: Id;
    trackedEntityType: Id;
    inactive: boolean;
    orgUnit: Id;
    attributes: AttributeApi[];
    enrollments: EnrollmentApi[];
    relationships: RelationshipApi[];
}

export interface TrackedEntityInstanceApiUpload {
    trackedEntityInstance: Id;
    trackedEntityType: Id;
    orgUnit: Id;
    attributes: AttributeApiUpload[];
    enrollments: EnrollmentApi[];
    relationships: RelationshipApi[];
}

export interface AttributeApiUpload {
    attribute: Id;
    value: string;
}

export interface RelationshipApi {
    relationship: Id;
    relationshipType: Id;
    relationshipName: string;
    from: RelationshipItemApi;
    to: RelationshipItemApi;
}

export interface RelationshipItemApi {
    trackedEntityInstance?: {
        trackedEntityInstance: Id;
    };
}

export interface AttributeApi {
    attribute: Id;
    valueType: string;
    value: string;
}

export interface EnrollmentApi {
    enrollment: Id;
    program: Id;
    orgUnit: Id;
    enrollmentDate: string;
    incidentDate: string;
    events?: Event[];
}

export interface DataValueApi {
    dataElement: Id;
    value: string | number | boolean;
}
