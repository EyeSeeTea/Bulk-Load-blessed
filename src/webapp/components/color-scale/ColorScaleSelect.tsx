import { Popover } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import React, { useState } from "react";
import { colorScales, getColorPalette, getColorScale } from "../../utils/colors";
import { ColorScale } from "./ColorScale";

export interface ColorScaleSelectProps {
    palette: string[];
    onChange: (palette: string[]) => void;
    width?: number;
    style?: object;
}

// Returns one color scale based on a code and number of classes
export const ColorScaleSelect = ({
    palette,
    width = 260,
    style,
    onChange,
}: ColorScaleSelectProps) => {
    const classes = useStyles();
    const [anchor, setAnchor] = useState<Element | null>(null);

    const scale = getColorScale(palette);
    if (!scale) throw new Error(`Invalid palette ${palette}, scale not found`);

    // Show/hide popover with allowed color scales
    const showColorScales = (event: React.MouseEvent) => setAnchor(event.currentTarget);
    const hideColorScales = () => setAnchor(null);

    // Called when a new color scale is selected in the popover
    const onColorScaleSelect = (_event: React.MouseEvent, scale: string) => {
        onChange(getColorPalette(scale, palette.length));
        hideColorScales();
    };

    return (
        <div style={style}>
            <div className={classes.scale}>
                <ColorScale
                    bins={palette.length}
                    scale={scale}
                    onClick={showColorScales}
                    width={width}
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
                                bins={palette.length}
                                onClick={onColorScaleSelect}
                                width={width}
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
