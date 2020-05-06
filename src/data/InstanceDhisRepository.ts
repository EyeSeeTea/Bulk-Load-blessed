import { D2Api, D2ApiDefault } from "d2-api";
import _ from "lodash";
import moment from "moment";
import { DataPackage } from "../domain/entities/DataPackage";
import { DataSet } from "../domain/entities/DataSet";
import { DhisInstance } from "../domain/entities/DhisInstance";
import { OrgUnit } from "../domain/entities/OrgUnit";
import { Program } from "../domain/entities/Program";
import {
    GetDataPackageParams,
    InstanceRepository,
} from "../domain/repositories/InstanceRepository";
import { promiseMap } from "../webapp/utils/common";

export class InstanceDhisRepository implements InstanceRepository {
    private api: D2Api;

    constructor({ url }: DhisInstance) {
        this.api = new D2ApiDefault({ baseUrl: url });
    }

    public async getDataSets(): Promise<DataSet[]> {
        const { objects } = await this.api.models.dataSets
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }

    public async getPrograms(): Promise<Program[]> {
        const { objects } = await this.api.models.programs
            .get({ paging: false, fields: { id: true, displayName: true, name: true } })
            .getData();
        return objects.map(({ id, displayName, name }) => ({ id, name: displayName ?? name }));
    }

    public async getOrgUnitRoots(): Promise<OrgUnit[]> {
        const { objects } = await this.api.models.organisationUnits
            .get({ userOnly: true, fields: { id: true, displayName: true, level: true } })
            .getData();
        return objects.map(({ id, level, displayName }) => ({ id, level, name: displayName }));
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

    private async getDataSetPackage({
        id,
        orgUnits,
        startDate,
        endDate,
    }: GetDataPackageParams): Promise<DataPackage[]> {
        const metadata = await this.api.get<MetadataPackage>(`/dataSets/${id}/metadata`).getData();
        const { dataValues } = await this.api
            .get<AggregatedPackage>("/dataValueSets", {
                dataSet: id,
                startDate: startDate?.format("YYYY-MM-DD"),
                endDate: endDate?.format("YYYY-MM-DD"),
                orgUnit: orgUnits,
            })
            .getData();

        return _(dataValues)
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
                            value: this.formatDataValue(value, metadata),
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
    }: GetDataPackageParams): Promise<DataPackage[]> {
        const metadata = await this.api.get<MetadataPackage>(`/programs/${id}/metadata`).getData();
        const response = await promiseMap(orgUnits, orgUnit =>
            this.api
                .get<EventsPackage>("/events", {
                    program: id,
                    orgUnit,
                    paging: false,
                })
                .getData()
        );

        return _(response)
            .map(({ events }) => events)
            .flatten()
            .map(({ event, orgUnit, eventDate, attributeOptionCombo, coordinate, dataValues }) => ({
                id: event,
                orgUnit,
                period: moment(eventDate).format("YYYY-MM-DD"),
                attribute: attributeOptionCombo,
                coordinate,
                dataValues: dataValues.map(({ dataElement, value }) => ({
                    dataElement,
                    value: this.formatDataValue(value, metadata),
                })),
            }))
            .value();
    }

    private formatDataValue(value: string | number, metadata: MetadataPackage): string | number {
        // Format options from CODE to UID
        const optionValue = metadata.options?.find(({ code }) => code === value);
        if (optionValue) return optionValue.id;

        // Return default case
        return value;
    }
}

interface EventsPackage {
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

interface AggregatedPackage {
    dataValues: Array<{
        dataElement: string;
        period: string;
        orgUnit: string;
        value: string;
        comment?: string;
        categoryOptionCombo?: string;
        attributeOptionCombo?: string;
    }>;
}

type MetadataPackage = Record<
    string,
    Array<{ id: string; code: string; [key: string]: unknown }> | undefined
>;
