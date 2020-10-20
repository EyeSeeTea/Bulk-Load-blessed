import { CustomTemplate, DataSource, StyleSource } from "../../../domain/entities/Template";

export class NHWAModule701 implements CustomTemplate {
    public readonly type = "custom";
    public readonly id = "NHWA_MODULE_7_v1";
    public readonly name = "NHWA Module 7";
    public readonly url = "templates/NHWA_Module_7.xlsx";
    public readonly dataFormId = { type: "value" as const, id: "ZRsZdd2AvAR" };
    public readonly dataFormType = { type: "value" as const, id: "dataSets" as const };

    public readonly dataSources: DataSource[] = [
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "iM5NIZBqAUL" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Expenditure", ref: "D8" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "GeY6o2BMvp1" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "E8" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "hBzWHe6kuvu" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "F8" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "C8MvR5CNwpG" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "D12" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "wsmvhizfctg" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "D16" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "KlsBVkjtkkV" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "E16" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "N6VNhZ2PCG7" },
            categoryOption: { type: "value", id: "aBpbcEgtzgw" },
            ref: { type: "cell", sheet: "Expenditure", ref: "F16" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "GeY6o2BMvp1" },
            categoryOption: { type: "value", id: "LHbCtHlZr3Y" },
            ref: { type: "cell", sheet: "Expenditure", ref: "G16" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "hBzWHe6kuvu" },
            categoryOption: { type: "value", id: "LHbCtHlZr3Y" },
            ref: { type: "cell", sheet: "Expenditure", ref: "D20" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "C8MvR5CNwpG" },
            categoryOption: { type: "value", id: "LHbCtHlZr3Y" },
            ref: { type: "cell", sheet: "Expenditure", ref: "E20" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Expenditure", type: "cell", ref: "V2" },
            period: { sheet: "Expenditure", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "wsmvhizfctg" },
            categoryOption: { type: "value", id: "LHbCtHlZr3Y" },
            ref: { type: "cell", sheet: "Expenditure", ref: "F20" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "qqVKuhK0RgY" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "D10" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "iS6Vzt6PPjr" },
            categoryOption: { type: "value", id: "OYOzRJlu3B5" },
            ref: { type: "cell", sheet: "Remuneration", ref: "E10" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "iS6Vzt6PPjr" },
            categoryOption: { type: "value", id: "JfxMvAwKsR7" },
            ref: { type: "cell", sheet: "Remuneration", ref: "F10" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "iS6Vzt6PPjr" },
            categoryOption: { type: "value", id: "MfcVRlA41v6" },
            ref: { type: "cell", sheet: "Remuneration", ref: "G10" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "iS6Vzt6PPjr" },
            categoryOption: { type: "value", id: "xeQGICllTPa" },
            ref: { type: "cell", sheet: "Remuneration", ref: "H10" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "Ii26DODuUbB" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "N20" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "cV7DhKFPk3R" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "N21" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "FXC8HIEHwHI" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "E20" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "d7hKlZbQARX" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "E21" },
        },
        {
            type: "cell",
            orgUnit: { sheet: "Remuneration", type: "cell", ref: "N2" },
            period: { sheet: "Remuneration", type: "cell", ref: "I4" },
            dataElement: { type: "value", id: "TiqoQCq1BL4" },
            categoryOption: { type: "value", id: "Xr12mI7VPn3" },
            ref: { type: "cell", sheet: "Remuneration", ref: "E22" },
        },
    ];

    public readonly styleSources: StyleSource[] = [];
}
