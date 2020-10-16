import _ from "lodash";
import { D2Api, Id, Ref } from "../types/d2-api";
import { runPromises } from "../utils/promises";
import {
    TrackedEntityInstance,
    Program,
    AttributeValue,
    Enrollment,
    isRelationshipValid,
    updateTeiIds,
} from "../domain/entities/TrackedEntityInstance";
import { Relationship } from "../domain/entities/Relationship";
import { Data } from "../domain/entities/DataPackage";
import { getUid } from "./dhis2-uid";

export interface GetOptions {
    api: D2Api;
    program: Ref;
    orgUnits: Ref[];
    pageSize?: number;
}

export async function getTrackedEntityInstances(
    options: GetOptions
): Promise<TrackedEntityInstance[]> {
    const { api, orgUnits, pageSize = 500 } = options;
    if (_.isEmpty(orgUnits)) return [];

    const {
        objects: [apiProgram],
    } = await api.models.programs
        .get({
            fields: {
                id: true,
                trackedEntityType: { id: true },
                programTrackedEntityAttributes: {
                    trackedEntityAttribute: {
                        id: true,
                        name: true,
                        valueType: true,
                        optionSet: { id: true, options: { id: true, code: true } },
                    },
                },
            },
            filter: { id: { eq: options.program.id } },
        })
        .getData();

    if (!apiProgram) return [];

    const program: Program = {
        id: apiProgram.id,
        trackedEntityType: { id: apiProgram.trackedEntityType.id },
        attributes: apiProgram.programTrackedEntityAttributes.map(
            ({ trackedEntityAttribute }) => trackedEntityAttribute
        ),
    };

    // Get TEIs for first page on every org unit
    const teisFirstPageData = await runPromises(
        orgUnits.map(orgUnit => async () => {
            const apiOptions = { api, program, orgUnit, page: 1, pageSize };
            const { pager, trackedEntityInstances } = await getTeisFromApi(apiOptions);
            return { orgUnit, trackedEntityInstances, total: pager.total };
        })
    );

    // Get TEIs in other pages using the pager information from the previous requests
    const teisInOtherPages$ = _.flatMap(teisFirstPageData, ({ orgUnit, total }) => {
        const lastPage = Math.ceil(total / pageSize);
        const pages = _.range(2, lastPage + 1);
        return pages.map(page => async () => {
            const res = await getTeisFromApi({ api, program, orgUnit, page, pageSize });
            return res.trackedEntityInstances;
        });
    });

    // Join all TEIs
    const teisInFirstPages = _.flatMap(teisFirstPageData, data => data.trackedEntityInstances);
    const teisInOtherPages = _.flatten(await runPromises(teisInOtherPages$));

    return _(teisInFirstPages)
        .concat(teisInOtherPages)
        .map(tei => buildTei(program, tei))
        .value();
}

export async function updateTrackedEntityInstances(
    api: D2Api,
    trackedEntityInstances: TrackedEntityInstance[],
    dataEntries: Data[]
): Promise<void> {
    const teis = updateTeiIds(trackedEntityInstances);
    const teisWithChanges = await getTeisWithChanges(api, teis);
    const apiTeis = teisWithChanges.map(tei => getApiTeiToUpload(tei));
    const apiEvents = getApiEvents(teis, dataEntries);

    console.log(teisWithChanges.map(tei => tei.id));

    const teiResponses = await runPromises(
        apiTeis.map(apiTei => () =>
            api.post("/trackedEntityInstances", { strategy: "CREATE_AND_UPDATE" }, apiTei).getData()
        )
    );

    const eventsResponse = await api
        .post("/events", { strategy: "CREATE_AND_UPDATE" }, { events: apiEvents })
        .getData();

    console.log(teiResponses, eventsResponse);
    // TODO: Check response
}

// Private

async function getTeisWithChanges(
    api: D2Api,
    teis: TrackedEntityInstance[]
): Promise<TrackedEntityInstance[]> {
    const programId = _(teis)
        .map(tei => tei.program.id)
        .uniq()
        .compact()
        .first();
    if (!programId) throw new Error("Cannot get program from TEIs");

    const orgUnitIDs = _(teis)
        .map(tei => tei.orgUnit.id)
        .uniq()
        .value();

    const existingTeis = await getTrackedEntityInstances({
        api,
        program: { id: programId },
        orgUnits: orgUnitIDs.map(id => ({ id })),
    });

    const existingTeisById = _.keyBy(existingTeis, tei => tei.id);
    const teisWithChanges = teis.filter(tei => !_.isEqual(tei, existingTeisById[tei.id]));
    return teisWithChanges;
}

function getApiEvents(teis: TrackedEntityInstance[], dataEntries: Data[]): EventApi[] {
    const programByTei: Record<Id, Id> = _(teis)
        .map(tei => [tei.id, tei.program.id] as const)
        .fromPairs()
        .value();

    return _(dataEntries)
        .map(data => {
            if (!data.trackedEntityInstance) {
                console.log(`Data without trackedEntityInstance: ${data}`);
                return null;
            }

            const teiId = getUid(data.trackedEntityInstance);
            const program = programByTei[teiId];

            if (!program) {
                console.error(`Program not found for TEI ${teiId}`);
                return null;
            }

            if (!data.programStage) {
                console.error(`Data without programStage ${data}`);
                return null;
            }

            const dataValues: DataValueApi[] = _(data.dataValues)
                .flatMap(dataValue => _.pick(dataValue, ["dataElement", "value"]))
                .value();

            const eventSelector: EventSelector = {
                trackedEntityInstance: { id: teiId },
                program: { id: program },
                orgUnit: { id: data.orgUnit },
                eventDate: data.period,
            };

            const eventApi: EventApi = {
                event: getEventId(data.id, eventSelector),
                trackedEntityInstance: teiId,
                program: program,
                orgUnit: data.orgUnit,
                eventDate: data.period,
                status: "COMPLETED" as const,
                programStage: data.programStage,
                dataValues,
            };

            return eventApi;
        })
        .compact()
        .value();
}

interface EventSelector {
    trackedEntityInstance: Ref;
    program: Ref;
    orgUnit: Ref;
    eventDate: string;
}

function getEventId(eventId: Id | undefined, eventSelector: EventSelector) {
    const s = eventSelector;
    const key = [s.trackedEntityInstance.id, s.program.id, s.orgUnit.id, s.eventDate].join("-");
    return eventId || getUid(key);
}

function getApiTeiToUpload(tei: TrackedEntityInstance): TrackedEntityInstanceApiUpload {
    const { program, orgUnit, enrollment, relationships } = tei;

    return {
        trackedEntityInstance: tei.id,
        trackedEntityType: program.trackedEntityType.id,
        orgUnit: orgUnit.id,
        attributes: tei.attributeValues.map(av => ({
            attribute: av.attribute.id,
            value: av.value,
        })),
        enrollments:
            enrollment && enrollment.enrollmentDate
                ? [
                      {
                          orgUnit: orgUnit.id,
                          program: program.id,
                          enrollmentDate: enrollment.enrollmentDate,
                          incidentDate: enrollment.incidentDate || enrollment.enrollmentDate,
                      },
                  ]
                : [],
        relationships: _(relationships)
            .filter(isRelationshipValid)
            .uniqBy(rel => rel.id)
            .map(rel => ({
                relationship: rel.id,
                relationshipName: rel.typeName,
                relationshipType: rel.typeId,
                from: { trackedEntityInstance: { trackedEntityInstance: rel.fromId } },
                to: { trackedEntityInstance: { trackedEntityInstance: rel.toId } },
            }))
            .value(),
    };
}

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
    relationships: RelationshipApi[];
}

interface TrackedEntityInstanceApiUpload {
    trackedEntityInstance: Id;
    trackedEntityType: Id;
    orgUnit: Id;
    attributes: AttributeApiUpload[];
    enrollments: EnrollmentApi[];
    relationships: RelationshipApi[];
}

interface AttributeApiUpload {
    attribute: Id;
    value: string;
}

interface RelationshipApi {
    relationship: Id;
    relationshipType: Id;
    relationshipName: string;
    from: RelationshipItemApi;
    to: RelationshipItemApi;
}

interface RelationshipItemApi {
    trackedEntityInstance?: {
        trackedEntityInstance: Id;
    };
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
    incidentDate: string;
    events?: EventApi[];
}

type EventStatusApi = "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULED" | "OVERDUE" | "SKIPPED";

interface EventApi {
    event?: Id;
    orgUnit: Id;
    program: Id;
    programStage: Id;
    eventDate: string;
    status: EventStatusApi;
    trackedEntityInstance: Id;
    dataValues: DataValueApi[];
}

interface DataValueApi {
    dataElement: Id;
    value: string | number;
}

async function getTeisFromApi(options: {
    api: D2Api;
    program: Program;
    orgUnit: Ref;
    page: number;
    pageSize: number;
}): Promise<TrackedEntityInstancesResponse> {
    const { api, program, orgUnit, page, pageSize } = options;
    const fields: Array<keyof TrackedEntityInstanceApi> = [
        "trackedEntityInstance",
        "inactive",
        "orgUnit",
        "attributes",
        "enrollments",
        "relationships",
    ];
    const query: TrackedEntityInstancesRequest = {
        ou: orgUnit.id,
        ouMode: "SELECTED",
        order: "created:asc",
        program: program.id,
        pageSize,
        page,
        totalPages: true,
        fields: fields.join(","),
    };

    /*
    console.debug(
        "GET /trackedEntityInstances",
        _.pick(query, ["program", "ou", "pageSize", "page"])
    );
    */
    const teiResponse = await api.get("/trackedEntityInstances", query).getData();
    return teiResponse as TrackedEntityInstancesResponse;
}

function buildTei(program: Program, teiApi: TrackedEntityInstanceApi): TrackedEntityInstance {
    const orgUnit = { id: teiApi.orgUnit };
    const attributesById = _.keyBy(program.attributes, attribute => attribute.id);

    const enrollment: Enrollment | undefined = _(teiApi.enrollments)
        .filter(e => e.program === program.id && orgUnit.id === e.orgUnit)
        .map(enrollmentApi => ({
            enrollmentDate: enrollmentApi.enrollmentDate,
            incidentDate: enrollmentApi.incidentDate,
        }))
        .first();

    const attributeValues: AttributeValue[] = teiApi.attributes.map(
        (attrApi): AttributeValue => {
            const optionSet = attributesById[attrApi.attribute]?.optionSet;
            const option =
                optionSet && optionSet.options.find(option => option.code === attrApi.value);

            return {
                attribute: {
                    id: attrApi.attribute,
                    valueType: attrApi.valueType,
                    ...(optionSet ? { optionSet } : {}),
                },
                value: attrApi.value,
                ...(option ? { optionId: option.id } : {}),
            };
        }
    );

    const relationships: Relationship[] = _(teiApi.relationships)
        .map(relApi =>
            relApi.from.trackedEntityInstance && relApi.to.trackedEntityInstance
                ? {
                      id: relApi.relationship,
                      typeId: relApi.relationshipType,
                      typeName: relApi.relationshipName,
                      fromId: relApi.from.trackedEntityInstance.trackedEntityInstance,
                      toId: relApi.to.trackedEntityInstance.trackedEntityInstance,
                  }
                : null
        )
        .compact()
        .value();

    return {
        program,
        id: teiApi.trackedEntityInstance,
        orgUnit: { id: teiApi.orgUnit },
        disabled: teiApi.inactive || false,
        enrollment,
        attributeValues,
        relationships,
    };
}
