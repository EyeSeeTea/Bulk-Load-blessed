import _ from "lodash";
import { DataPackageData } from "../domain/entities/DataPackage";
import { Relationship } from "../domain/entities/Relationship";
import {
    AttributeValue,
    Enrollment,
    isRelationshipValid,
    Program,
    TrackedEntityInstance,
} from "../domain/entities/TrackedEntityInstance";
import { D2Api, Id, Ref } from "../types/d2-api";
import { runPromises } from "../utils/promises";
import { getUid } from "./dhis2-uid";
import { emptyImportSummary } from "../domain/entities/ImportSummary";
import { postEvents } from "./Dhis2Events";
import { Event } from "../domain/entities/DhisDataPackage";
import { parseDate } from "../domain/helpers/ExcelReader";
import { SynchronizationResult } from "../domain/entities/SynchronizationResult";
import { ImportPostResponse, postImport } from "./Dhis2Import";
import { generateUid } from "d2/uid";

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

    const program = await getProgram(api, options.program.id);
    if (!program) return [];

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

export async function getProgram(api: D2Api, id: Id): Promise<Program | undefined> {
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
            filter: { id: { eq: id } },
        })
        .getData();

    if (!apiProgram) return;

    const program: Program = {
        id: apiProgram.id,
        trackedEntityType: { id: apiProgram.trackedEntityType.id },
        attributes: apiProgram.programTrackedEntityAttributes.map(
            ({ trackedEntityAttribute }) => trackedEntityAttribute
        ),
    };

    return program;
}

export async function updateTrackedEntityInstances(
    api: D2Api,
    trackedEntityInstances: TrackedEntityInstance[],
    dataEntries: DataPackageData[]
): Promise<SynchronizationResult[]> {
    if (_.isEmpty(trackedEntityInstances)) return [emptyImportSummary];

    // Non-UID tei IDS should be deterministic within a current call, use a random seed.
    const teiSeed = generateUid();
    const metadata = await getMetadata(api);
    const teis = updateTeiIds(trackedEntityInstances, teiSeed);
    const programId = _(trackedEntityInstances)
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

    const program = await getProgram(api, programId);
    if (!program) throw new Error(`Program not found: ${programId}`);

    const apiEvents = await getApiEvents(api, teis, dataEntries, metadata, teiSeed);
    const [preTeis, postTeis] = splitTeis(teis, existingTeis);
    const options = { api, program, metadata, existingTeis };
    const teiResponsesPre = await uploadTeis({ ...options, teis: preTeis });
    const teiResponsesPost = await uploadTeis({ ...options, teis: postTeis });
    const eventsResponse = await postEvents(api, apiEvents);

    return _.compact([teiResponsesPre, teiResponsesPost, eventsResponse]);
}

// Private

/* A TEI cannot be posted if it includes relationships to other TEIs which are not created 
    yet (creation of TEIS is sequential). So let's split pre/post TEI's so they can be
    posted separatedly.
*/
function splitTeis(
    teis: TrackedEntityInstance[],
    existingTeis: TrackedEntityInstance[]
): [TrackedEntityInstance[], TrackedEntityInstance[]] {
    const existingTeiIds = new Set(existingTeis.map(tei => tei.id));

    const [validTeis, invalidTeis] = _(teis)
        .partition(tei =>
            _(tei.relationships).every(
                rel => existingTeiIds.has(rel.fromId) && existingTeiIds.has(rel.toId)
            )
        )
        .value();

    const preTeis = _.concat(
        invalidTeis.map(tei => ({ ...tei, relationships: [] })),
        validTeis
    );
    const postTeis = invalidTeis;

    return [preTeis, postTeis];
}

async function uploadTeis(options: {
    api: D2Api;
    program: Program;
    metadata: Metadata;
    teis: TrackedEntityInstance[];
    existingTeis: TrackedEntityInstance[];
}): Promise<SynchronizationResult | undefined> {
    const { api, program, metadata, teis, existingTeis } = options;

    if (_.isEmpty(teis)) return undefined;

    const apiTeis = teis.map(tei => getApiTeiToUpload(program, metadata, tei, existingTeis));

    return postImport(
        () =>
            api
                .post<ImportPostResponse>(
                    "/trackedEntityInstances",
                    { strategy: "CREATE_AND_UPDATE" },
                    { trackedEntityInstances: apiTeis }
                )
                .getData(),
        {
            title: "Tracked Entity Instances - Create/update",
            model: "Tracked Entity Instance",
            splitStatsList: false,
        }
    );
}

interface Metadata {
    options: Array<{ id: Id; code: string }>;
}

/* Get metadata required to map attribute values for option sets */
async function getMetadata(api: D2Api): Promise<Metadata> {
    return api.metadata
        .get({
            options: { fields: { id: true, code: true } },
        })
        .getData();
}

async function getApiEvents(
    api: D2Api,
    teis: TrackedEntityInstance[],
    dataEntries: DataPackageData[],
    metadata: Metadata,
    teiSeed: string
): Promise<Event[]> {
    const programByTei: Record<Id, Id> = _(teis)
        .map(tei => [tei.id, tei.program.id] as const)
        .fromPairs()
        .value();

    const optionById = _.keyBy(metadata.options, option => option.id);

    const { dataElements } = await api.metadata
        .get({
            dataElements: {
                fields: { id: true, valueType: true },
            },
        })
        .getData();

    const valueTypeByDataElementId = _(dataElements)
        .map(de => [de.id, de.valueType])
        .fromPairs()
        .value();

    return _(dataEntries)
        .map(data => {
            if (!data.trackedEntityInstance) {
                console.error(`Data without trackedEntityInstance: ${data}`);
                return null;
            }

            const teiId = getUid(data.trackedEntityInstance, teiSeed);
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
                .flatMap(
                    (dataValue): DataValueApi => {
                        // Leave dataValue.optionId as fallback so virtual IDS like true/false are used
                        const valueType = valueTypeByDataElementId[dataValue.dataElement];
                        let value: string | number | boolean;

                        if (
                            valueType === "DATE" &&
                            typeof dataValue.value === "string" &&
                            dataValue.value.match(/^\d+$/)
                        ) {
                            value = parseDate(parseInt(dataValue.value)).toString();
                        } else {
                            value = dataValue.optionId
                                ? optionById[dataValue.optionId]?.code || dataValue.optionId
                                : dataValue.value;
                        }
                        return {
                            dataElement: dataValue.dataElement,
                            value,
                        };
                    }
                )
                .value();

            const event: Event = {
                event: data.id,
                trackedEntityInstance: teiId,
                program: program,
                orgUnit: data.orgUnit,
                eventDate: data.period,
                attributeOptionCombo: data.attribute,
                status: "COMPLETED" as const,
                programStage: data.programStage,
                dataValues,
            };

            return event;
        })
        .compact()
        .value();
}

function getApiTeiToUpload(
    program: Program,
    metadata: Metadata,
    tei: TrackedEntityInstance,
    existingTeis: TrackedEntityInstance[]
): TrackedEntityInstanceApiUpload {
    const { orgUnit, enrollment, relationships } = tei;

    const existingTei = existingTeis.find(tei_ => tei_.id === tei.id);
    const optionById = _.keyBy(metadata.options, option => option.id);

    const existingRelationships = existingTei?.relationships || [];

    const apiRelationships = _(relationships)
        .concat(existingRelationships)
        .filter(isRelationshipValid)
        .uniqBy(rel => [rel.typeId, rel.fromId, rel.toId].join("-"))
        .map(rel => {
            const relationshipId =
                rel.id ||
                existingRelationships.find(
                    eRel =>
                        eRel.typeId === rel.typeId &&
                        eRel.fromId === rel.fromId &&
                        eRel.toId === rel.toId
                )?.id ||
                getUid([rel.typeId, rel.fromId, rel.toId].join("-"));

            const relApi: RelationshipApi = {
                relationship: relationshipId,
                relationshipType: rel.typeId,
                relationshipName: rel.typeName,
                from: { trackedEntityInstance: { trackedEntityInstance: rel.fromId } },
                to: { trackedEntityInstance: { trackedEntityInstance: rel.toId } },
            };
            return relApi;
        })
        .compact()
        .value();

    const enrollmentId =
        existingTei?.enrollment?.id || getUid([tei.id, orgUnit.id, program.id].join("-"));

    return {
        trackedEntityInstance: tei.id,
        trackedEntityType: program.trackedEntityType.id,
        orgUnit: orgUnit.id,
        attributes: tei.attributeValues.map(av => ({
            attribute: av.attribute.id,
            value: av.optionId ? optionById[av.optionId]?.code : av.value,
        })),
        enrollments:
            enrollment && enrollment.enrollmentDate
                ? [
                      {
                          enrollment: enrollmentId,
                          orgUnit: orgUnit.id,
                          program: program.id,
                          enrollmentDate: enrollment.enrollmentDate,
                          incidentDate: enrollment.incidentDate || enrollment.enrollmentDate,
                      },
                  ]
                : [],
        relationships: apiRelationships,
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
    enrollment: Id;
    program: Id;
    orgUnit: Id;
    enrollmentDate: string;
    incidentDate: string;
    events?: Event[];
}

interface DataValueApi {
    dataElement: Id;
    value: string | number | boolean;
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
            id: enrollmentApi.enrollment,
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
        program: { id: program.id },
        id: teiApi.trackedEntityInstance,
        orgUnit: { id: teiApi.orgUnit },
        disabled: teiApi.inactive || false,
        enrollment,
        attributeValues,
        relationships,
    };
}

export function updateTeiIds(
    trackedEntityInstances: TrackedEntityInstance[],
    teiSeed: string
): TrackedEntityInstance[] {
    return trackedEntityInstances.map(tei => ({
        ...tei,
        id: getUid(tei.id, teiSeed),
        relationships: tei.relationships.map(rel => ({
            ...rel,
            fromId: getUid(rel.fromId, teiSeed),
            toId: getUid(rel.toId, teiSeed),
        })),
    }));
}
