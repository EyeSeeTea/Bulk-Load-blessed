import _ from "lodash";
import moment from "moment";
import { DataForm, DataFormPeriod, DataFormType } from "../domain/entities/DataForm";
import { DataPackage, TrackerProgramPackage } from "../domain/entities/DataPackage";
import {
    AggregatedDataValue,
    EventsPackage,
    AggregatedPackage,
    Event,
} from "../domain/entities/DhisDataPackage";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { ImportSummary } from "../domain/entities/ImportSummary";
import { Locale } from "../domain/entities/Locale";
import { OrgUnit } from "../domain/entities/OrgUnit";
import {
    GetDataFormsParams,
    GetDataPackageParams,
    InstanceRepository,
} from "../domain/repositories/InstanceRepository";
import {
    D2Api,
    D2ApiDefault,
    DataValueSetsGetResponse,
    DataValueSetsPostResponse,
    Id,
    Pager,
} from "../types/d2-api";
import { cache } from "../utils/cache";
import { timeout } from "../utils/promises";
import { promiseMap } from "../webapp/utils/promises";
import {
    getTrackedEntityInstances,
    updateTrackedEntityInstances,
    getProgram,
} from "./Dhis2TrackedEntityInstances";
import { Program } from "../domain/entities/TrackedEntityInstance";
import { postEvents } from "./Dhis2Events";

interface PagedEventsApiResponse extends EventsPackage {
    pager: Pager;
}

export class InstanceDhisRepository implements InstanceRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance, mockApi?: D2Api) {
        this.api = mockApi ?? new D2ApiDefault({ baseUrl: url });
    }

    public async getDataForms({
        type = ["dataSets", "programs"],
        ids,
    }: GetDataFormsParams = {}): Promise<DataForm[]> {
        const dataSets = type.includes("dataSets") ? await this.getDataSets(ids) : [];
        const programs = type.includes("programs") ? await this.getPrograms(ids) : [];

        return [...dataSets, ...programs];
    }

    @cache()
    private async getDataSets(ids?: string[]): Promise<DataForm[]> {
        const { objects } = await this.api.models.dataSets
            .get({
                paging: false,
                fields: {
                    id: true,
                    displayName: true,
                    name: true,
                    attributeValues: { value: true, attribute: { code: true } },
                    dataSetElements: { dataElement: { id: true, formName: true, name: true } },
                    periodType: true,
                    access: true,
                },
                filter: {
                    id: ids ? { in: ids } : undefined,
                },
            })
            .getData();

        return objects.map(
            ({ displayName, name, access, periodType, dataSetElements, ...rest }) => ({
                ...rest,
                type: "dataSets",
                name: displayName ?? name,
                periodType: periodType as DataFormPeriod,
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                readAccess: access.data?.read,
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                writeAccess: access.data?.write,
                dataElements: dataSetElements
                    .map(({ dataElement }) => dataElement)
                    .map(({ formName, name, ...rest }) => ({
                        ...rest,
                        name: formName ?? name,
                    })),
            })
        );
    }

    @cache()
    private async getPrograms(ids?: string[]): Promise<DataForm[]> {
        const { objects } = await this.api.models.programs
            .get({
                paging: false,
                fields: {
                    id: true,
                    displayName: true,
                    name: true,
                    attributeValues: { value: true, attribute: { code: true } },
                    programStages: {
                        programStageDataElements: {
                            dataElement: { id: true, formName: true, name: true },
                        },
                    },
                    access: true,
                    programType: true,
                },
                filter: {
                    id: ids ? { in: ids } : undefined,
                },
            })
            .getData();

        return objects.map(
            ({ displayName, name, access, programStages, programType, ...rest }) => ({
                ...rest,
                type: programType === "WITH_REGISTRATION" ? "trackerPrograms" : "programs",
                name: displayName ?? name,
                periodType: "Daily",
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                readAccess: access.data?.read,
                //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
                writeAccess: access.data?.write,
                dataElements: programStages
                    .flatMap(({ programStageDataElements }) =>
                        programStageDataElements.map(({ dataElement }) => dataElement)
                    )
                    .map(({ formName, name, ...rest }) => ({ ...rest, name: formName ?? name })),
            })
        );
    }

    @cache()
    public async getDataFormOrgUnits(type: DataFormType, id: string): Promise<OrgUnit[]> {
        const params = {
            paging: false,
            fields: {
                organisationUnits: { id: true, name: true, level: true, path: true },
            },
            filter: {
                id: { eq: id },
            },
        } as const;

        const { objects } = await (type === "dataSets"
            ? this.api.models.dataSets.get(params).getData()
            : this.api.models.programs.get(params).getData());

        return _(objects)
            .map(({ organisationUnits }) => organisationUnits)
            .flatten()
            .value();
    }

    @cache()
    public async getUserOrgUnits(): Promise<OrgUnit[]> {
        const { objects } = await this.api.models.organisationUnits
            .get({
                userOnly: true,
                fields: { id: true, displayName: true, level: true, path: true },
            })
            .getData();
        return objects.map(({ displayName, ...rest }) => ({ ...rest, name: displayName }));
    }

    @cache()
    public async getLocales(): Promise<Locale[]> {
        const locales = await this.api.get<Locale[]>("/locales/dbLocales").getData();
        return locales;
    }

    @cache()
    public async getDefaultIds(): Promise<string[]> {
        const response = (await this.api
            .get("/metadata", {
                filter: "code:eq:default",
                fields: "id",
            })
            .getData()) as {
            [key: string]: { id: string }[];
        };

        return _(response)
            .omit(["system"])
            .values()
            .flatten()
            .map(({ id }) => id)
            .value();
    }

    public async deleteAggregatedData(dataPackage: DataPackage): Promise<ImportSummary> {
        return this.importAggregatedData("DELETE", dataPackage);
    }

    public async importDataPackage(dataPackage: DataPackage): Promise<ImportSummary> {
        switch (dataPackage.type) {
            case "dataSets":
                return this.importAggregatedData("CREATE_AND_UPDATE", dataPackage);
            case "programs":
                return this.importEventsData(dataPackage);
            case "trackerPrograms":
                return this.importTrackerData(dataPackage);
            default:
                throw new Error(`Unsupported type for data package`);
        }
    }

    public async getDataPackage(params: GetDataPackageParams): Promise<DataPackage> {
        switch (params.type) {
            case "dataSets":
                return this.getDataSetPackage(params);
            case "programs":
                return this.getProgramPackage(params);
            case "trackerPrograms":
                return this.getTrackerProgramPackage(params);
            default:
                throw new Error(`Unsupported type ${params.type} for data package`);
        }
    }

    public async getProgram(programId: Id): Promise<Program | undefined> {
        return getProgram(this.api, programId);
    }

    /* Private */

    private async getTrackerProgramPackage(params: GetDataPackageParams): Promise<DataPackage> {
        const { api } = this;
        const dataPackage = await this.getProgramPackage(params);
        const orgUnits = params.orgUnits.map(id => ({ id }));
        const program = { id: params.id };
        const trackedEntityInstances = await getTrackedEntityInstances({ api, program, orgUnits });

        return {
            type: "trackerPrograms",
            trackedEntityInstances,
            dataEntries: dataPackage.dataEntries,
        };
    }

    public convertDataPackage(dataPackage: DataPackage): EventsPackage | AggregatedPackage {
        switch (dataPackage.type) {
            case "dataSets":
                return { dataValues: this.buildAggregatedPayload(dataPackage) };
            case "programs":
                return { events: this.buildEventsPayload(dataPackage) };
            default:
                throw new Error(`Unsupported type ${dataPackage.type} to convert data package`);
        }
    }

    /* Private */

    private buildAggregatedPayload(dataPackage: DataPackage): AggregatedDataValue[] {
        return _.flatMap(dataPackage.dataEntries, ({ orgUnit, period, attribute, dataValues }) =>
            dataValues.map(({ dataElement, category, value, comment }) => ({
                orgUnit,
                period,
                attributeOptionCombo: attribute,
                dataElement,
                categoryOptionCombo: category,
                value: String(value),
                comment,
            }))
        );
    }

    private buildEventsPayload(dataPackage: DataPackage): Event[] {
        return dataPackage.dataEntries.map(
            ({ id, orgUnit, period, attribute, dataValues, dataForm }) => ({
                event: id,
                program: dataForm,
                status: "COMPLETED",
                orgUnit,
                eventDate: period,
                attributeOptionCombo: attribute,
                dataValues: dataValues,
            })
        );
    }

    private async importAggregatedData(
        importStrategy: "CREATE" | "UPDATE" | "CREATE_AND_UPDATE" | "DELETE",
        dataPackage: DataPackage
    ): Promise<ImportSummary> {
        const dataValues = this.buildAggregatedPayload(dataPackage);

        const {
            response: { id, jobType },
        } = ((await this.api.dataValues
            .postSet({ importStrategy, async: true }, { dataValues })
            .getData()) as unknown) as AsyncDataValueSetResponse;

        const checkTask = async () => {
            const [{ completed }] =
                (await this.api
                    .get<{ message: string; completed: boolean }[]>(
                        `/system/tasks/${jobType}/${id}`
                    )
                    .getData()) ?? [];

            return !completed;
        };

        do {
            await timeout(1500);
        } while (await checkTask());

        const importSummary = await this.api
            .get<DataValueSetsPostResponse | null>(`/system/taskSummaries/${jobType}/${id}`)
            .getData();

        if (!importSummary) {
            const [{ message }] =
                (await this.api
                    .get<{ message: string; completed: boolean }[]>(
                        `/system/tasks/${jobType}/${id}`
                    )
                    .getData()) ?? [];

            return {
                status: "ERROR",
                description: message,
                stats: { created: 0, deleted: 0, updated: 0, ignored: 0 },
                errors: [],
            };
        }

        const { status, description, conflicts, importCount } = importSummary;
        const { imported: created, deleted, updated, ignored } = importCount;
        const errors = conflicts?.map(({ object, value }) => `[${object}] ${value}`) ?? [];

        return {
            status,
            description,
            stats: { created, deleted, updated, ignored },
            errors,
        };
    }

    private async importEventsData(dataPackage: DataPackage): Promise<ImportSummary> {
        const events = this.buildEventsPayload(dataPackage);
        return postEvents(this.api, events);
    }

    private async importTrackerData(dataPackage: TrackerProgramPackage): Promise<ImportSummary> {
        const { trackedEntityInstances, dataEntries } = dataPackage;
        return updateTrackedEntityInstances(this.api, trackedEntityInstances, dataEntries);
    }

    private async getDataSetPackage({
        id,
        orgUnits,
        periods = [],
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage> {
        const defaultIds = await this.getDefaultIds();
        const metadata = await this.api.get<MetadataPackage>(`/dataSets/${id}/metadata`).getData();
        const response = await promiseMap(_.chunk(orgUnits, 200), async orgUnit => {
            const query = (period?: string[]): Promise<DataValueSetsGetResponse> =>
                this.api.dataValues
                    .getSet({
                        dataSet: [id],
                        orgUnit,
                        period,
                        startDate: startDate?.format("YYYY-MM-DD"),
                        endDate: endDate?.format("YYYY-MM-DD"),
                    })
                    .getData();

            return periods.length > 0
                ? await promiseMap(_.chunk(periods, 200), query)
                : [await query()];
        });

        return {
            type: "dataSets",
            dataEntries: _(response)
                .flatten()
                .flatMap(({ dataValues = [] }) => dataValues)
                .groupBy(({ period, orgUnit, attributeOptionCombo }) =>
                    [period, orgUnit, attributeOptionCombo].join("-")
                )
                .map((dataValues, key) => {
                    const [period, orgUnit, attribute] = key.split("-");
                    return {
                        type: "aggregated" as const,
                        dataForm: id,
                        orgUnit,
                        period,
                        attribute: defaultIds.includes(attribute) ? undefined : attribute,
                        dataValues: dataValues.map(
                            ({ dataElement, categoryOptionCombo, value, comment }) => ({
                                dataElement,
                                category: defaultIds.includes(categoryOptionCombo)
                                    ? undefined
                                    : categoryOptionCombo,
                                value: this.formatDataValue(
                                    dataElement,
                                    value,
                                    metadata,
                                    translateCodes
                                ),
                                comment,
                            })
                        ),
                    };
                })
                .value(),
        };
    }

    private async getProgramPackage({
        id,
        orgUnits,
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage> {
        const metadata = await this.api.get<MetadataPackage>(`/programs/${id}/metadata`).getData();
        const categoryComboId: string = _.find(metadata.programs, { id })?.categoryCombo.id;
        const categoryOptions = this.buildProgramAttributeOptions(metadata, categoryComboId);
        if (categoryOptions.length === 0) {
            throw new Error(`Could not find category options for the program ${id}`);
        }

        const getEvents = (
            orgUnit: Id,
            categoryOptionId: Id,
            page: number
        ): Promise<PagedEventsApiResponse> => {
            // DHIS2 bug if we do not provide CC and COs, endpoint only works with ALL authority
            return this.api
                .get<PagedEventsApiResponse>("/events", {
                    program: id,
                    orgUnit,
                    paging: true,
                    totalPages: true,
                    page,
                    pageSize: 250,
                    attributeCc: categoryComboId,
                    attributeCos: categoryOptionId,
                    startDate: startDate?.format("YYYY-MM-DD"),
                    endDate: endDate?.format("YYYY-MM-DD"),
                    cache: Math.random(),
                })
                .getData();
        };

        const events: Event[] = [];

        for (const orgUnit of orgUnits) {
            for (const categoryOptionId of categoryOptions) {
                const { events, pager } = await getEvents(orgUnit, categoryOptionId, 1);
                events.push(...events);

                await promiseMap(_.range(2, pager.pageCount + 1), async page => {
                    const { events } = await getEvents(orgUnit, categoryOptionId, page);
                    events.push(...events);
                });
            }
        }

        return {
            type: "programs",
            dataEntries: _(events)
                .map(
                    ({
                        event,
                        orgUnit,
                        eventDate,
                        attributeOptionCombo,
                        coordinate,
                        dataValues,
                        trackedEntityInstance,
                        programStage,
                    }) => ({
                        id: event,
                        dataForm: id,
                        orgUnit,
                        period: moment(eventDate).format("YYYY-MM-DD"),
                        attribute: attributeOptionCombo,
                        coordinate,
                        trackedEntityInstance,
                        programStage,
                        dataValues: dataValues.map(({ dataElement, value }) => ({
                            dataElement,
                            value: this.formatDataValue(
                                dataElement,
                                value,
                                metadata,
                                translateCodes
                            ),
                        })),
                    })
                )
                .value(),
        };
    }

    private formatDataValue(
        dataElement: string,
        value: string | number | boolean,
        metadata: MetadataPackage,
        translateCodes: boolean
    ): string | number | boolean {
        const optionSet = _.find(metadata.dataElements, { id: dataElement })?.optionSet?.id;
        if (!translateCodes || !optionSet) return value;

        // Format options from CODE to UID
        const options = _.filter(metadata.options, { optionSet: { id: optionSet } });
        const optionValue = options.find(({ code }) => code === value);
        return optionValue?.id ?? value;
    }

    private buildProgramAttributeOptions(
        metadata: MetadataPackage,
        categoryComboId?: string
    ): string[] {
        if (!categoryComboId) return [];

        // Get all the categories assigned to the categoryCombo of the program
        const categoryCombo = _.find(metadata?.categoryCombos, { id: categoryComboId });
        const categoryIds: string[] = _.compact(
            categoryCombo?.categories?.map(({ id }: MetadataItem) => id)
        );

        // Get all the category options for each category on the categoryCombo
        const categories = _.compact(categoryIds.map(id => _.find(metadata?.categories, { id })));
        const categoryOptions: MetadataItem[] = _(categories)
            .map(({ categoryOptions }: MetadataItem) =>
                categoryOptions.map(({ id }: MetadataItem) =>
                    _.find(metadata?.categoryOptions, { id })
                )
            )
            .flatten()
            .value();

        return categoryOptions.map(({ id }) => id);
    }
}

interface MetadataItem {
    id: string;
    code: string;
    [key: string]: any;
}

type MetadataPackage = Record<string, MetadataItem[] | undefined>;

interface AsyncDataValueSetResponse {
    httStatus: string;
    httpStatusCode: number;
    message: string;
    response: {
        created: string;
        id: string;
        jobType: string;
        name: string;
        relativeNotifierEndpoint: string;
    };
    status: string;
}
