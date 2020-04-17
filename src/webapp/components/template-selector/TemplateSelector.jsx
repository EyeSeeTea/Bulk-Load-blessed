import i18n from "@dhis2/d2-i18n";
import React from "react";
import Select from "../select/Select";

export const TemplateSelector = ({
    action,
    onModelChange,
    onObjectChange,
    objectOptions,
    modelOptions,
}) => {
    const showModelSelector = modelOptions.length > 1;

    const rowStyle = showModelSelector
        ? { marginTop: "1em", marginRight: "1em" }
        : { justifyContent: "left" };

    const elementLabel = showModelSelector ? i18n.t("elements") : modelOptions[0].label;
    const key = modelOptions.map(option => option.value).join("-");

    return (
        <div className="row" style={rowStyle}>
            {showModelSelector && (
                <div style={{ flexBasis: "30%", margin: "1em", marginLeft: 0 }}>
                    <Select
                        key={key}
                        placeholder={i18n.t("Model")}
                        onChange={onModelChange}
                        options={modelOptions}
                    />
                </div>
            )}

            <div style={{ flexBasis: "70%", margin: "1em" }}>
                <Select
                    key={key}
                    placeholder={i18n.t("Select {{element}} to {{action}}...", {
                        element: elementLabel,
                        action,
                    })}
                    onChange={onObjectChange}
                    options={objectOptions}
                />
            </div>
        </div>
    );
};
