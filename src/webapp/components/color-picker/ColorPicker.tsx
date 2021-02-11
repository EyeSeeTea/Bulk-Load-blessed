import { IconButton, Popover } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import React, { useState } from "react";
import { ChromePicker, ColorResult } from "react-color";

export interface ColorPickerProps {
    color?: string;
    onChange?: (color: string) => void;
    label?: string;
    width?: string | number;
    height?: string | number;
    disableArrow?: boolean;
}

// Returns one color scale based on a code and number of classes
export const ColorPicker = ({
    color,
    onChange = () => {},
    label,
    width = "100%",
    height = 30,
    disableArrow = false,
}: ColorPickerProps) => {
    const classes = useStyles();
    const [anchor, setAnchor] = useState<Element | null>(null);
    const [currentColor, setCurrentColor] = useState<ColorResult>();

    const handleOpen = (event: React.MouseEvent) => setAnchor(event.currentTarget);
    const handleClose = () => setAnchor(null);

    const handleChange = (color: ColorResult) => {
        setCurrentColor(color);
        onChange(color.hex.toUpperCase());
    };

    const lightness = currentColor?.hsl.l ?? 0;
    const arrowColor = lightness < 0.7 ? "#fff" : "#333";

    return (
        <div className={classes.root}>
            {label && <div className={classes.label}>{label}</div>}
            <IconButton
                onClick={handleOpen}
                className={classes.button}
                style={{
                    background: color,
                    width,
                    height,
                }}
                disableTouchRipple={true}
            >
                {!disableArrow && <ArrowDropDownIcon htmlColor={arrowColor} className={classes.icon} />}
            </IconButton>
            <Popover open={!!anchor} onClose={handleClose} anchorEl={anchor}>
                <ChromePicker color={color} onChange={handleChange} disableAlpha={true} />
            </Popover>
        </div>
    );
};

const useStyles = makeStyles({
    root: {
        margin: 0,
        marginTop: 16,
        marginBottom: 16,
    },
    button: {
        padding: 0,
        textAlign: "right",
        borderRadius: 0,
        boxShadow: "0 1px 6px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.12)",
    },
    icon: {
        position: "absolute",
        right: 4,
    },
    label: {
        color: "#494949",
        fontSize: 14,
        paddingBottom: 6,
    },
});
