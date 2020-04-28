import { DataSource, StyleSource, Template } from "../../domain/entities/Template";

export default class implements Template {
    public readonly id = "WMR_IR_v0";
    public readonly name = "WMR_IR_Discriminating_Concentration_Bioassay";
    public readonly url = "templates/WMR_IR_discriminating_concentration_bioassays_v0_EN.xlsx";

    public readonly dataSources: DataSource[] = [];

    public readonly styleSources: StyleSource[] = [
        {
            section: "title",
            source: {
                type: "range",
                ref: "H3:N3",
                sheet: "DiscriminatingBioassays",
            },
        },
        {
            section: "subtitle",
            source: {
                type: "range",
                ref: "H4:N4",
                sheet: "DiscriminatingBioassays",
            },
        },
        {
            section: "logo",
            source: {
                type: "range",
                ref: "D2:E8",
                sheet: "DiscriminatingBioassays",
            },
        },
    ];
}
