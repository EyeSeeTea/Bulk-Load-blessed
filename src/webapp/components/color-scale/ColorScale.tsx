import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { palettes } from "../../utils/palettes";

export interface ColorScaleProps {
    bins: number;
    scale: string;
    width?: number;
    onClick?: (event: React.MouseEvent, scale: string) => void;
}

// Returns one color scale based on a code and number of classes
export const ColorScale = ({ scale, bins, width, onClick = () => {} }: ColorScaleProps) => {
    const classes = useStyles();
    const colors = palettes[scale][bins];
    const itemWidth = width ? width / bins : 36;

    return (
        <ul
            className={classes.scale}
            onClick={event => onClick(event, scale)}
            style={{ ...(width && { width }) }}
        >
            {colors.map((color, index) => (
                <li
                    key={index}
                    className={classes.item}
                    style={{ backgroundColor: color, width: itemWidth }}
                />
            ))}
        </ul>
    );
};

const useStyles = makeStyles({
    scale: {
        paddingLeft: 0,
        height: 36,
        cursor: "pointer",
        boxShadow: "0 1px 6px rgba(0,0,0,0.12),0 1px 4px rgba(0,0,0,0.12)",
        display: "inline-block",
        whiteSpace: "nowrap",
    },
    item: {
        marginLeft: 0,
        display: "inline-block",
        height: "100%",
    },
});
