import React from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import _ from "lodash";
import { MenuItem, FormControl, InputLabel, Select as MuiSelect } from "@material-ui/core";

type Option = { value: string; label: string };

interface SelectProps {
    placeholder: string;
    options: Array<Option>;
    onChange: (option: Option) => void;
    defaultValue?: Option;
}

const Select: React.FC<SelectProps> = props => {
    const { placeholder, options, onChange, defaultValue } = props;
    const [value, setValue] = React.useState(defaultValue ? defaultValue.value : "");
    const classes = useStyles();
    const optionsByValue = React.useMemo(() => _.keyBy(options, option => option.value), [options]);

    const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        const newValue = event.target.value as string;
        const option = _(optionsByValue).get(newValue, undefined);
        setValue(newValue);
        if (option) onChange(option);
    };

    return (
        <div>
            <FormControl className={classes.formControl}>
                <InputLabel id="demo-simple-select-label">{placeholder}</InputLabel>
                <MuiSelect onChange={handleChange} value={value} autoWidth={true}>
                    <MenuItem value="" disabled>
                        {placeholder}
                    </MenuItem>
                    {options.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </MuiSelect>
            </FormControl>
        </div>
    );
};

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        formControl: {
            margin: 0,
            display: "flex",
        },
    })
);

export default Select;
