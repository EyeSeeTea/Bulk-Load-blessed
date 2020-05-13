import { Popover } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import _ from "lodash";
import React, { useState } from "react";
import { PaletteCollection } from "../../../domain/entities/Palette";
import { getColorPalette, getColorScale } from "../../utils/colors";
import { palettes } from "../../utils/palettes";
import { ColorScale } from "./ColorScale";

export interface ColorScaleSelectProps {
    selected: string[];
    onChange: (palette: string[]) => void;
    width?: number;
    style?: object;
    additionalPalettes?: PaletteCollection;
    disableDefaultPalettes?: boolean;
}

// Returns one color scale based on a code and number of classes
export const ColorScaleSelect = ({
    selected,
    width = 260,
    style,
    onChange,
    additionalPalettes = {},
    disableDefaultPalettes = false,
}: ColorScaleSelectProps) => {
    const classes = useStyles();
    const [anchor, setAnchor] = useState<Element | null>(null);

    const availablePalettes = disableDefaultPalettes
        ? additionalPalettes
        : { ...palettes, ...additionalPalettes };

    const scale = getColorScale(availablePalettes, selected);
    if (!scale) throw new Error(`Invalid palette ${selected}, scale not found`);

    // Show/hide popover with allowed color scales
    const showColorScales = (event: React.MouseEvent) => setAnchor(event.currentTarget);
    const hideColorScales = () => setAnchor(null);

    // Called when a new color scale is selected in the popover
    const onColorScaleSelect = (_event: React.MouseEvent, scale: string) => {
        onChange(getColorPalette(availablePalettes, scale, selected.length));
        hideColorScales();
    };

    return (
        <div style={style}>
            <div className={classes.scale}>
                <ColorScale
                    palettes={availablePalettes}
                    bins={selected.length}
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
                    {_.keys(availablePalettes).map((scale, index) => (
                        <div key={index} className={classes.scaleItem}>
                            <ColorScale
                                palettes={availablePalettes}
                                scale={scale}
                                bins={selected.length}
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
