import { FormControl, InputLabel, MenuItem, Select as MuiSelect } from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import _ from "lodash";
import React from "react";

export type SelectOption = { value: string; label: string };

export interface SelectProps {
    placeholder?: string;
    options: Array<SelectOption>;
    onChange: (option: SelectOption) => void;
    defaultValue?: SelectOption;
    value?: string;
    allowEmpty?: boolean;
    emptyLabel?: string;
    variant?: "filled" | "outlined";
}

export const Select: React.FC<SelectProps> = ({
    placeholder,
    options,
    onChange,
    defaultValue,
    value,
    allowEmpty = false,
    emptyLabel = "",
    variant,
}) => {
    const classes = useStyles();
    const [stateValue, setValue] = React.useState(defaultValue ? defaultValue.value : "");
    const optionsByValue = React.useMemo(() => _.keyBy(options, option => option.value), [options]);
    const defaultOption = allowEmpty ? { label: "", value: "" } : undefined;

    const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const newValue = event.target.value as string;
        const option = _(optionsByValue).get(newValue, defaultOption);
        setValue(newValue);
        if (option) onChange(option);
    };

    const defaultLabel = allowEmpty ? emptyLabel : placeholder;

    return (
        <div>
            <FormControl className={classes.formControl}>
                {!!placeholder && (
                    <InputLabel id="demo-simple-select-label">{placeholder}</InputLabel>
                )}
                <MuiSelect
                    onChange={handleChange}
                    value={value ?? stateValue}
                    autoWidth={true}
                    variant={variant}
                >
                    {!!defaultLabel && (
                        <MenuItem value="" disabled={!allowEmpty} className={classes.menuItem}>
                            {defaultLabel}
                        </MenuItem>
                    )}
                    {options.map(option => (
                        <MenuItem
                            key={option.value}
                            value={option.value}
                            className={classes.menuItem}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </MuiSelect>
            </FormControl>
        </div>
    );
};

const useStyles = makeStyles(() =>
    createStyles({
        formControl: {
            margin: 0,
            display: "flex",
        },
        menuItem: {
            minHeight: 35,
        },
    })
);
