import { Icon } from "@material-ui/core";
import { ObjectsTable, TableAction, TableColumn } from "d2-ui-components";
import React, { useState } from "react";
import { DataValue } from "../../../domain/entities/DataPackage";
import i18n from "../../../locales";

export interface ImportItem extends DataValue {
    id: string;
    description: string;
    dataElementName: string;
    categoryName: string;
    instanceValue?: string | number;
    ignore: boolean;
}

const dummyRows: ImportItem[] = [
    {
        id: "foo",
        description: "Global 2014 (MoH)",
        dataElementName: "Number of drop-outs",
        dataElement: "foo",
        categoryName: "External",
        category: "foo",
        value: 5,
        instanceValue: 6,
        ignore: false,
    },
    {
        id: "foo2",
        description: "Global 2014 (MoH)",
        dataElementName: "Number of drop-outs",
        dataElement: "foo",
        categoryName: "Medical doctors",
        category: "foo",
        value: 14,
        instanceValue: 14,
        ignore: true,
    },
    {
        id: "foo3",
        description: "Global 2014 (MoH)",
        dataElementName: "Number of drop-outs",
        dataElement: "foo",
        categoryName: "Medical assistants",
        category: "foo",
        value: 15,
        instanceValue: undefined,
        ignore: false,
    },
    {
        id: "foo4",
        description: "Global 2014 (MoH)",
        dataElementName: "Number of drop-outs",
        dataElement: "foo",
        categoryName: "Medical associates",
        category: "foo",
        value: 9,
        instanceValue: 9,
        ignore: true,
    },
];

export default function ImportPreviewTable({ baseRows = dummyRows }: { baseRows?: ImportItem[] }) {
    const [rows, setRows] = useState(baseRows);

    const columns: TableColumn<ImportItem>[] = [
        { name: "description", text: i18n.t("Name") },
        { name: "dataElementName", text: i18n.t("Data Element") },
        { name: "categoryName", text: i18n.t("Category Option") },
        { name: "value", text: i18n.t("Import Value") },
        { name: "instanceValue", text: i18n.t("Current Value") },
        {
            name: "ignore",
            text: i18n.t("Status"),
            getValue: ({ ignore, instanceValue }) => {
                if (ignore) return i18n.t("Ignored");
                else if (!instanceValue) return i18n.t("Created");
                else return i18n.t("Updated");
            },
        },
    ];

    const actions: TableAction<ImportItem>[] = [
        {
            name: "toggle-ignore",
            text: i18n.t("Toggle ignore data value"),
            primary: false,
            icon: <Icon>sync</Icon>,
            onClick: selectedIds => {
                setRows(rows =>
                    rows.map(row => {
                        if (selectedIds.includes(row.id)) {
                            row.ignore = !row.ignore;
                        }
                        return row;
                    })
                );
            },
        },
        {
            name: "include",
            text: i18n.t("Include data value"),
            primary: false,
            icon: <Icon>sync</Icon>,
            multiple: true,
            onClick: selectedIds => {
                setRows(rows =>
                    rows.map(row => {
                        if (selectedIds.includes(row.id)) {
                            row.ignore = false;
                        }
                        return row;
                    })
                );
            },
        },
        {
            name: "ignore",
            text: i18n.t("Ignore data value"),
            primary: false,
            multiple: true,
            icon: <Icon>sync_disabled</Icon>,
            onClick: selectedIds => {
                setRows(rows =>
                    rows.map(row => {
                        if (selectedIds.includes(row.id)) {
                            row.ignore = true;
                        }
                        return row;
                    })
                );
            },
        },
    ];

    return (
        <React.Fragment>
            <ObjectsTable<ImportItem> rows={rows} columns={columns} actions={actions} />
        </React.Fragment>
    );
}
