import { CustomTemplate } from "../../../../domain/entities/Template";
import { Maybe } from "../../../../types/utils";

export interface CustomTemplateProgramViewModel {
    code: string;
    name: string;
    description: string;

    dataFormId: Maybe<string>;

    eventIdSheet: string;
    eventIdColumn: string;
}

export class CustomTemplateProgramViewModelActions {
    static build(): CustomTemplateProgramViewModel {
        const viewModel: CustomTemplateProgramViewModel = {
            code: "",
            name: "",
            dataFormId: undefined,
            description: "",
            eventIdSheet: "Data Entry",
            eventIdColumn: "A",
        };

        return viewModel;
    }

    static fromTemplate(template: CustomTemplate): CustomTemplateProgramViewModel {
        const dataSource = template.dataSources?.[0];
        const empty = this.build();
        const dataSourceHasTypeRow = dataSource && "type" in dataSource && dataSource.type === "row";
        const eventId =
            dataSourceHasTypeRow && dataSource.eventId?.type === "column"
                ? { sheet: dataSource.eventId.sheet.toString(), column: dataSource.eventId.ref }
                : { sheet: empty.eventIdSheet, column: empty.eventIdColumn };

        return {
            code: template.id,
            name: template.name,
            dataFormId: template.dataFormId.type === "value" ? template.dataFormId.id : undefined,
            description: template.description,
            eventIdSheet: eventId.sheet,
            eventIdColumn: eventId.column,
        };
    }

    static update<Field extends keyof CustomTemplateProgramViewModel>(
        viewModel: CustomTemplateProgramViewModel,
        field: Field,
        value: CustomTemplateProgramViewModel[Field]
    ): CustomTemplateProgramViewModel {
        return { ...viewModel, [field]: value };
    }
}
