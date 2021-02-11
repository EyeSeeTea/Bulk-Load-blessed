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
    additionalPalettes?: PaletteCollection;
    disableDefaultPalettes?: boolean;
}

// Returns one color scale based on a code and number of classes
export const ColorScaleSelect = ({
    selected,
    width = 260,
    onChange,
    additionalPalettes = {},
    disableDefaultPalettes = false,
}: ColorScaleSelectProps) => {
    const classes = useStyles();
    const [anchor, setAnchor] = useState<Element | null>(null);

    const availablePalettes = disableDefaultPalettes ? additionalPalettes : { ...additionalPalettes, ...palettes };

    const scale = getColorScale(availablePalettes, selected);
    const palette = scale ? availablePalettes[scale] : undefined;
    const selectedColors = palette ? palette[selected.length] ?? selected : selected;

    // Show/hide popover with allowed color scales
    const showColorScales = (event: React.MouseEvent) => setAnchor(event.currentTarget);
    const hideColorScales = () => setAnchor(null);

    // Called when a new color scale is selected in the popover
    const onColorScaleSelect = (scale: string) => {
        onChange(getColorPalette(availablePalettes, scale, selected.length));
        hideColorScales();
    };

    return (
        <React.Fragment>
            <div className={classes.scale}>
                <ColorScale colors={selectedColors} onClick={showColorScales} width={width} />
            </div>

            {!!anchor && (
                <Popover
                    classes={{ paper: classes.popover }}
                    open={true}
                    anchorEl={anchor}
                    anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
                    onClose={hideColorScales}
                >
                    {_.keys(availablePalettes).map((scale, index) => {
                        const palette = availablePalettes[scale];
                        if (!palette) return null;

                        const colors = palette[selectedColors.length];
                        return colors ? (
                            <div key={index} className={classes.scaleItem}>
                                <ColorScale colors={colors} onClick={() => onColorScaleSelect(scale)} width={width} />
                            </div>
                        ) : null;
                    })}
                </Popover>
            )}
        </React.Fragment>
    );
};

const useStyles = makeStyles({
    scale: {
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
