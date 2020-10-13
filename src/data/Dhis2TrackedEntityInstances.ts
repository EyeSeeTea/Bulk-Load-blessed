import _ from "lodash";
import { D2Api, Id, Ref } from "../types/d2-api";
import { runPromises } from "../utils/promises";
import { TrackedEntityInstance, Program } from "../domain/entities/TrackedEntityInstance";

export interface GetOptions {
    api: D2Api;
    program: Ref;
    orgUnits: Ref[];
    pageSize: number;
}

export async function getTrackedEntityInstances(
    options: GetOptions
): Promise<TrackedEntityInstance[]> {
    const { api, orgUnits, pageSize } = options;

    if (_.isEmpty(orgUnits)) return [];

    const { objects: apiPrograms } = await api.models.programs
        .get({
            fields: {
                id: true,
                programTrackedEntityAttributes: {
                    trackedEntityAttribute: { id: true, name: true },
                },
            },
            filter: { id: { eq: options.program.id } },
        })
        .getData();
    const apiProgram = apiPrograms[0];
    if (!apiProgram) return [];

    const program: Program = {
        id: apiProgram.id,
        attributes: apiProgram.programTrackedEntityAttributes.map(
            ({ trackedEntityAttribute }) => trackedEntityAttribute
        ),
    };

    const teiData = await runPromises(
        orgUnits.map(orgUnit => async () => {
            const { pager } = await getTeisFromApi(api, program, orgUnit, 1, 0);
            return { orgUnit, total: pager.total };
        })
    );

    const teis$ = _.flatMap(teiData, ({ orgUnit, total }) => {
        const lastPage = Math.ceil(total / pageSize);
        const pages = _.range(1, lastPage + 1);
        return pages.map(page => () => getTeisForOrgUnit(api, program, orgUnit, page, pageSize));
    });

    return _.flatten(await runPromises(teis$));
}

// Private

type TrackedEntityInstancesRequest = {
    program: Id;
    ou: Id;
    ouMode?: "SELECTED" | "CHILDREN" | "DESCENDANTS" | "ACCESSIBLE" | "CAPTURE" | "ALL";
    order?: string;
    pageSize?: number;
    page?: number;
    totalPages: true;
    fields: string;
};

interface TrackedEntityInstancesResponse {
    pager: {
        page: number;
        total: number;
        pageSize: number;
        pageCount: number;
    };
    trackedEntityInstances: TrackedEntityInstanceApi[];
}

interface TrackedEntityInstanceApi {
    trackedEntityInstance: Id;
    inactive: boolean;
    orgUnit: Id;
    attributes: AttributeApi[];
    enrollments: EnrollmentApi[];
}

interface AttributeApi {
    attribute: Id;
    valueType: string;
    value: string;
}

interface EnrollmentApi {
    program: Id;
    orgUnit: Id;
    enrollmentDate: string;
}

async function getTeisFromApi(
    api: D2Api,
    program: Program,
    orgUnit: Ref,
    page: number,
    pageSize: number
): Promise<TrackedEntityInstancesResponse> {
    const query: TrackedEntityInstancesRequest = {
        ou: orgUnit.id,
        ouMode: "SELECTED",
        order: "created:asc",
        program: program.id,
        pageSize,
        page,
        totalPages: true,
        fields: "trackedEntityInstance,inactive,orgUnit,attributes,enrollments",
    };

    console.log("GET /trackedEntityInstances", query.page);
    const teiResponse = await api.get("/trackedEntityInstances", query).getData();
    return teiResponse as TrackedEntityInstancesResponse;
}

async function getTeisForOrgUnit(
    api: D2Api,
    program: Program,
    orgUnit: Ref,
    page: number,
    pageSize: number
): Promise<TrackedEntityInstance[]> {
    const { trackedEntityInstances } = (await getTeisFromApi(
        api,
        program,
        orgUnit,
        page,
        pageSize
    )) as TrackedEntityInstancesResponse;

    return trackedEntityInstances.map(tei => buildTei(program, orgUnit, tei));
}

function buildTei(
    program: Program,
    orgUnit: Ref,
    teiApi: TrackedEntityInstanceApi
): TrackedEntityInstance {
    return {
        program,
        id: teiApi.trackedEntityInstance,
        orgUnit: { id: teiApi.orgUnit },
        disabled: teiApi.inactive,
        enrollment: teiApi.enrollments
            .filter(e => e.program === program.id && orgUnit.id === e.orgUnit)
            .map(enrollmentApi => ({
                date: enrollmentApi.enrollmentDate,
            }))[0],
        attributeValues: teiApi.attributes.map(attrApi => ({
            id: attrApi.attribute,
            valueType: attrApi.valueType,
            value: attrApi.value,
        })),
    };
}
