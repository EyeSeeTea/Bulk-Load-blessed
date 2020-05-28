import { D2Api, D2ApiDefault, DataValueSetsGetResponse } from "d2-api";
import _ from "lodash";
import moment from "moment";
import { DataForm, DataFormType } from "../domain/entities/DataForm";
import { DataPackage } from "../domain/entities/DataPackage";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { Locale } from "../domain/entities/Locale";
import { OrgUnit } from "../domain/entities/OrgUnit";
import {
    GetDataPackageParams,
    InstanceRepository,
} from "../domain/repositories/InstanceRepository";
import { promiseMap } from "../webapp/utils/promises";

export class InstanceDhisRepository implements InstanceRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance, mockApi?: D2Api) {
        this.api = mockApi ?? new D2ApiDefault({ baseUrl: url });
    }

    public async getDataForms(type: DataFormType, ids?: string[]): Promise<DataForm[]> {
        const params = {
            paging: false,
            fields: {
                id: true,
                displayName: true,
                name: true,
                attributeValues: { value: true, attribute: { code: true } },
                periodType: true,
                access: true,
            },
            filter: {
                id: ids ? { in: ids } : undefined,
                programType: type === "programs" ? { eq: "WITHOUT_REGISTRATION" } : undefined,
            },
        } as const;

        const { objects } = await (type === "dataSets"
            ? this.api.models.dataSets.get(params).getData()
            : this.api.models.programs.get(params).getData());

        return objects.map(({ displayName, name, access, ...rest }) => ({
            ...rest,
            type,
            name: displayName ?? name,
            //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
            readAccess: access.data?.read,
            //@ts-ignore https://github.com/EyeSeeTea/d2-api/issues/43
            writeAccess: access.data?.write,
        }));
    }

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

    public async getUserOrgUnits(): Promise<OrgUnit[]> {
        const { objects } = await this.api.models.organisationUnits
            .get({
                userOnly: true,
                fields: { id: true, displayName: true, level: true, path: true },
            })
            .getData();
        return objects.map(({ displayName, ...rest }) => ({ ...rest, name: displayName }));
    }

    public async getDataPackage(params: GetDataPackageParams): Promise<DataPackage[]> {
        switch (params.type) {
            case "dataSets":
                return this.getDataSetPackage(params);
            case "programs":
                return this.getProgramPackage(params);
            default:
                throw new Error(`Unsupported type ${params.type} for data package`);
        }
    }

    public async getLocales(): Promise<Locale[]> {
        const locales = await this.api.get<Locale[]>("/locales/dbLocales").getData();
        return locales;
    }

    private async getDataSetPackage({
        id,
        orgUnits,
        periods = [],
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage[]> {
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

        return _(response)
            .flatten()
            .flatMap(({ dataValues = [] }) => dataValues)
            .groupBy(({ period, orgUnit, attributeOptionCombo }) =>
                [period, orgUnit, attributeOptionCombo].join("-")
            )
            .map((dataValues, key) => {
                const [period, orgUnit, attribute] = key.split("-");
                return {
                    orgUnit,
                    period,
                    attribute,
                    dataValues: dataValues.map(
                        ({ dataElement, categoryOptionCombo, value, comment }) => ({
                            dataElement,
                            category: categoryOptionCombo,
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
            .value();
    }

    private async getProgramPackage({
        id,
        orgUnits,
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage[]> {
        const metadata = await this.api.get<MetadataPackage>(`/programs/${id}/metadata`).getData();
        const categoryComboId: string = _.find(metadata.programs, { id })?.categoryCombo.id;
        const categoryOptions = this.buildProgramAttributeOptions(metadata, categoryComboId);
        if (categoryOptions.length === 0) {
            console.error(`Could not find category options for the program ${id}`);
            return [];
        }

        try {
            const response = await promiseMap(orgUnits, async orgUnit => {
                // DHIS2 bug if we do not provide CC and COs, endpoint only works with ALL authority
                return promiseMap(categoryOptions, categoryOptionId =>
                    this.api
                        .get<EventsPackage>("/events", {
                            program: id,
                            orgUnit,
                            paging: false,
                            attributeCc: categoryComboId,
                            attributeCos: categoryOptionId,
                            startDate: startDate?.format("YYYY-MM-DD"),
                            endDate: endDate?.format("YYYY-MM-DD"),
                        })
                        .getData()
                );
            });

            return _(response)
                .flatten()
                .map(({ events }) => events)
                .flatten()
                .map(
                    ({
                        event,
                        orgUnit,
                        eventDate,
                        attributeOptionCombo,
                        coordinate,
                        dataValues,
                    }) => ({
                        id: event,
                        orgUnit,
                        period: moment(eventDate).format("YYYY-MM-DD"),
                        attribute: attributeOptionCombo,
                        coordinate,
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
                .value();
        } catch (error) {
            console.error("Error fetching events", error);
            return [];
        }
    }

    private formatDataValue(
        dataElement: string,
        value: string | number,
        metadata: MetadataPackage,
        translateCodes: boolean
    ): string | number {
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

export interface EventsPackage {
    events: Array<{
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
        dataValues: Array<{
            dataElement: string;
            value: string | number;
        }>;
    }>;
}

interface MetadataItem {
    id: string;
    code: string;
    [key: string]: any;
}

type MetadataPackage = Record<string, MetadataItem[] | undefined>;
