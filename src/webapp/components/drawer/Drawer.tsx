import {
    Divider,
    Drawer,
    Icon,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    makeStyles,
} from "@material-ui/core";
import _ from "lodash";
import React from "react";
import { useHistory } from "react-router-dom";
import { AppRoute } from "../../pages/root/RootPage";

const HEADER_HEIGHT = 50;
const LAYERS_PANEL_WIDTH = 300;

const useStyles = makeStyles((theme: any) => ({
    panel: {
        top: HEADER_HEIGHT,
        backgroundColor: theme.palette.background.default,
        boxShadow: `1px 0 1px 0 ${theme.palette.shadow}`,
        height: "auto",
        maxHeight: "100%",
        bottom: 0,
        overflowX: "hidden",
        overflowY: "auto",
        zIndex: 1190,
        width: 300,
    },
    button: {
        position: "fixed",
        top: HEADER_HEIGHT + 15,
        left: LAYERS_PANEL_WIDTH,
        width: 24,
        height: 40,
        padding: 0,
        background: theme.palette.background.paper,
        borderRadius: 0,
        boxShadow: "3px 1px 5px -1px rgba(0, 0, 0, 0.2)",
        zIndex: 1100,
        "&:hover": {
            backgroundColor: theme.palette.background.hover,
        },
    },
}));

interface AppDrawerProps {
    isOpen: boolean;
    routes: AppRoute[];
}

export const AppDrawer = ({ isOpen, routes }: AppDrawerProps) => {
    const classes = useStyles();
    const history = useHistory();

    const sections = _.groupBy(routes, "section");

    const handleDrawerClick = (path: string) => {
        if (history.location.pathname !== path) history.push(path);
    };

    return (
        <Drawer open={isOpen} variant="persistent" classes={{ paper: classes.panel }}>
            {_.values(sections).map((section, idx) => (
                <React.Fragment key={`list-section-${idx}`}>
                    <List>
                        {section.map(({ key, name, icon, path }) => (
                            <ListItem
                                button
                                key={`list-item-${key}`}
                                onClick={() => handleDrawerClick(path)}
                            >
                                <ListItemIcon>
                                    <Icon>{icon}</Icon>
                                </ListItemIcon>
                                <ListItemText primary={name} />
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                </React.Fragment>
            ))}
        </Drawer>
    );
};

export const AppDrawerToggle = ({ isOpen, setOpen }: any) => {
    const classes = useStyles();

    const toggle = () => {
        setOpen(!isOpen);
    };

    return (
        <IconButton
            onClick={toggle}
            className={classes.button}
            disableTouchRipple={true}
            style={isOpen ? {} : { left: 0 }}
        >
            {isOpen ? <Icon>keyboard_arrow_left</Icon> : <Icon>keyboard_arrow_right</Icon>}
        </IconButton>
    );
};
