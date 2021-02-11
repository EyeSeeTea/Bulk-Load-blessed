import { makeStyles } from "@material-ui/core/styles";
import React from "react";

export interface ColorScaleProps {
    colors: string[];
    width?: number;
    onClick?: (event: React.MouseEvent) => void;
}

// Returns one color scale based on a code and number of classes
export const ColorScale = ({ width, colors, onClick = () => {} }: ColorScaleProps) => {
    const classes = useStyles();
    const bins = colors.length;
    const itemWidth = width ? width / bins : 36;

    return (
        <ul className={classes.scale} onClick={onClick} style={{ ...(width && { width }) }}>
            {colors.map((color, index) => (
                <li key={index} className={classes.item} style={{ backgroundColor: color, width: itemWidth }} />
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
