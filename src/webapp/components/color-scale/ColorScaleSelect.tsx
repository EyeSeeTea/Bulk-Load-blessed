import { Popover } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import React, { useState } from "react";
import { colorScales, getColorPalette, getColorScale } from "../../utils/colors";
import { ColorScale } from "./ColorScale";

export interface ColorScaleSelectProps {
    palette: string;
    onChange: Function;
    width?: number;
    style?: object;
}

// Returns one color scale based on a code and number of classes
export const ColorScaleSelect = ({ palette, width, style, onChange }: ColorScaleSelectProps) => {
    const classes = useStyles();
    const [anchor, setAnchor] = useState<Element | null>(null);

    // Show/hide popover with allowed color scales
    const showColorScales = (event: any) => setAnchor(event.currentTarget);
    const hideColorScales = () => setAnchor(null);

    // Called when a new color scale is selected in the popover
    const onColorScaleSelect = (_event: any, scale: string) => {
        onChange(getColorPalette(scale, palette.split(",").length));
        hideColorScales();
    };

    const bins = palette.split(",").length;
    const scale = getColorScale(palette);

    return (
        <div style={style}>
            <div className={classes.scale}>
                <ColorScale
                    bins={bins}
                    scale={scale}
                    onClick={showColorScales}
                    width={width || 260}
                />
            </div>

            {!!anchor && (
                <Popover
                    classes={{ paper: classes.popover }}
                    open={true}
                    anchorEl={anchor}
                    anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
                    onClose={hideColorScales}
                >
                    {colorScales.map((scale, index) => (
                        <div key={index} className={classes.scaleItem}>
                            <ColorScale
                                scale={scale}
                                bins={bins}
                                onClick={onColorScaleSelect}
                                width={width || 260}
                            />
                        </div>
                    ))}
                </Popover>
            )}
        </div>
    );
};

const useStyles = makeStyles({
    scale: {
        marginTop: 19,
        overflow: "visible",
        whiteSpace: "nowrap",
    },
    scaleItem: {
        display: "block",
        margin: "5px 12px 0 12px",
        overflow: "visible",
        whiteSpace: "nowrap",
    },
    popover: {
        maxHeight: "60%",
        overflowY: "scroll",
    },
});
