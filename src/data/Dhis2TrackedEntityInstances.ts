import _ from "lodash";
import { generateUid } from "d2/uid";

import { DataPackageData } from "../domain/entities/DataPackage";
import {
    AttributeValue,
    Enrollment,
    Program,
    TrackedEntityInstance,
} from "../domain/entities/TrackedEntityInstance";
import { D2Api, Id, Ref } from "../types/d2-api";
import { getUid } from "./dhis2-uid";
import { emptyImportSummary } from "../domain/entities/ImportSummary";
import { postEvents } from "./Dhis2Events";
import { Event } from "../domain/entities/DhisDataPackage";
import { parseDate } from "../domain/helpers/ExcelReader";
import { SynchronizationResult } from "../domain/entities/SynchronizationResult";
import { ImportPostResponse, postImport } from "./Dhis2Import";
import {
    DataValueApi,
    TrackedEntityInstanceApiUpload,
    TrackedEntityInstancesResponse,
    TrackedEntityInstanceApi,
    TrackedEntityInstancesRequest,
} from "./TrackedEntityInstanceTypes";
import {
    getApiRelationships,
    fromApiRelationships,
    RelationshipMetadata,
    getTrackerProgramMetadata,
} from "./Dhis2RelationshipTypes";
import i18n from "../locales";

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

    const metadata = await getTrackerProgramMetadata(program, api);

    // Avoid 414-uri-too-large by spliting orgUnit in chunks
    const orgUnitsList = _.chunk(orgUnits, 250);

    // Get TEIs for the first page:
    const apiTeis: TrackedEntityInstanceApi[] = [];

    for (const orgUnits of orgUnitsList) {
        // Limit response size by requesting paginated TEIs
        for (let page = 1; ; page++) {
            const apiOptions = { api, program, orgUnits, page, pageSize };
            const { pager, trackedEntityInstances } = await getTeisFromApi(apiOptions);
            apiTeis.push(...trackedEntityInstances);
            if (pager.pageCount <= page) break;
        }
    }

    return apiTeis.map(tei => buildTei(metadata, program, tei));
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

    const orgUnitIds = _.uniq(teis.map(tei => tei.orgUnit.id));

    const existingTeis = await getTrackedEntityInstances({
        api,
        program: { id: programId },
        orgUnits: orgUnitIds.map(id => ({ id })),
    });

    const program = await getProgram(api, programId);
    if (!program) throw new Error(`Program not found: ${programId}`);

    const apiEvents = await getApiEvents(api, teis, dataEntries, metadata, teiSeed);
    const [preTeis, postTeis] = await splitTeis(api, teis);
    const options = { api, program, metadata, existingTeis };

    return runSequentialPromisesOnSuccess([
        () => uploadTeis({ ...options, teis: preTeis, title: i18n.t("Create/update") }),
        () => uploadTeis({ ...options, teis: postTeis, title: i18n.t("Relationships") }),
        () => postEvents(api, apiEvents),
    ]);
}

async function runSequentialPromisesOnSuccess(
    fns: Array<() => Promise<SynchronizationResult | undefined>>
): Promise<SynchronizationResult[]> {
    const output: SynchronizationResult[] = [];
    for (const fn of fns) {
        const res = await fn();
        if (res) output.push(res);
        if (res && res.status !== "SUCCESS") break;
    }
    return output;
}

// Private

/* A TEI cannot be posted if it includes relationships to other TEIs which are not created 
    yet (creation of TEIS is sequential). So let's split pre/post TEI's so they can be
    posted separatedly.
*/
async function splitTeis(
    api: D2Api,
    teis: TrackedEntityInstance[]
): Promise<[TrackedEntityInstance[], TrackedEntityInstance[]]> {
    const existingTeis = await getExistingTeis(api);
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
    title: string;
}): Promise<SynchronizationResult | undefined> {
    const { api, program, metadata, teis, existingTeis, title } = options;

    if (_.isEmpty(teis)) return undefined;

    const apiTeis = teis.map(tei => getApiTeiToUpload(program, metadata, tei, existingTeis));
    const model = i18n.t("Tracked Entity Instance");

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
            title: `${model} - ${title}`,
            model: model,
            splitStatsList: false,
        }
    );
}

interface Metadata {
    options: Array<{ id: Id; code: string }>;
}

/* Get metadata required to map attribute values for option sets */
async function getMetadata(api: D2Api): Promise<Metadata> {
    return api.metadata.get({ options: { fields: { id: true, code: true } } }).getData();
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
        .get({ dataElements: { fields: { id: true, valueType: true } } })
        .getData();

    const valueTypeByDataElementId = _(dataElements)
        .map(de => [de.id, de.valueType])
        .fromPairs()
        .value();

    return _(dataEntries)
        .map((data): Event | null => {
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
                        let value: string;

                        if (
                            valueType === "DATE" &&
                            typeof dataValue.value === "string" &&
                            dataValue.value.match(/^\d+$/)
                        ) {
                            value = parseDate(parseInt(dataValue.value)).toString();
                        } else {
                            value = getValue(dataValue, optionById);
                        }
                        return {
                            dataElement: dataValue.dataElement,
                            value,
                        };
                    }
                )
                .value();

            return {
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
    const optionById = _.keyBy(metadata.options, option => option.id);

    const existingTei = existingTeis.find(tei_ => tei_.id === tei.id);
    const apiRelationships = getApiRelationships(existingTei, relationships);

    const enrollmentId =
        existingTei?.enrollment?.id || getUid([tei.id, orgUnit.id, program.id].join("-"));

    return {
        trackedEntityInstance: tei.id,
        trackedEntityType: program.trackedEntityType.id,
        orgUnit: orgUnit.id,
        attributes: tei.attributeValues.map(av => ({
            attribute: av.attribute.id,
            value: getValue(av, optionById),
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

interface TeiIdsResponse {
    trackedEntityInstances: Ref[];
}

async function getExistingTeis(api: D2Api): Promise<Ref[]> {
    const query: TrackedEntityInstancesRequest = {
        ouMode: "CAPTURE",
        pageSize: 1e6,
        totalPages: true,
        fields: "trackedEntityInstance~rename(id)",
    };

    const teiResponse = await api.get("/trackedEntityInstances", query).getData();
    const { trackedEntityInstances } = teiResponse as TeiIdsResponse;
    return trackedEntityInstances;
}
async function getTeisFromApi(options: {
    api: D2Api;
    program: Program;
    orgUnits: Ref[];
    page: number;
    pageSize: number;
}): Promise<TrackedEntityInstancesResponse> {
    const { api, program, orgUnits, page, pageSize } = options;
    const fields: Array<keyof TrackedEntityInstanceApi> = [
        "trackedEntityInstance",
        "inactive",
        "orgUnit",
        "attributes",
        "enrollments",
        "relationships",
    ];
    const query: TrackedEntityInstancesRequest = {
        ou: orgUnits.map(ou => ou.id).join(";"),
        ouMode: "SELECTED",
        order: "created:asc",
        program: program.id,
        pageSize,
        page,
        totalPages: true,
        fields: fields.join(","),
    };

    const teiResponse = await api.get("/trackedEntityInstances", query).getData();
    return teiResponse as TrackedEntityInstancesResponse;
}

function buildTei(
    metadata: RelationshipMetadata,
    program: Program,
    teiApi: TrackedEntityInstanceApi
): TrackedEntityInstance {
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

    return {
        program: { id: program.id },
        id: teiApi.trackedEntityInstance,
        orgUnit: { id: teiApi.orgUnit },
        disabled: teiApi.inactive || false,
        enrollment,
        attributeValues,
        relationships: fromApiRelationships(metadata, teiApi),
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

function getValue(
    dataValue: { optionId?: string; value: DataValueApi["value"] },
    optionById: Record<Id, { id: Id; code: string } | undefined>
): string {
    if (dataValue.optionId) {
        return optionById[dataValue.optionId]?.code || dataValue.optionId;
    } else {
        return dataValue.value.toString();
    }
}
