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
    Theme,
} from "@material-ui/core";
import _ from "lodash";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppRoute } from "../../pages/Router";

export interface AppDrawerProps {
    isOpen: boolean;
    routes: AppRoute[];
}

export const AppDrawer = ({ isOpen, routes }: AppDrawerProps) => {
    const classes = useStyles();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const sections = _.groupBy(routes, "section");

    const handleDrawerClick = (path: string) => {
        if (pathname !== path) navigate(path);
    };

    return (
        <Drawer open={isOpen} variant={"persistent"} classes={{ paper: classes.panel }}>
            {_.values(sections).map((section, idx) => (
                <React.Fragment key={`list-section-${idx}`}>
                    <List>
                        {section.map(({ key, name, icon, path }) => (
                            <ListItem
                                button={true}
                                key={`list-item-${key}`}
                                onClick={() => handleDrawerClick(path)}
                                selected={pathname === path}
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

export interface AppDrawerToggleProps {
    isOpen: boolean;
    setOpen: (open: boolean) => void;
}

export const AppDrawerToggle = ({ isOpen, setOpen }: AppDrawerToggleProps) => {
    const classes = useStyles();
    const toggle = () => setOpen(!isOpen);

    return (
        <IconButton
            onClick={toggle}
            className={classes.button}
            disableTouchRipple={true}
            style={isOpen ? {} : { left: 0 }}
        >
            <Icon>{isOpen ? "keyboard_arrow_left" : "keyboard_arrow_right"}</Icon>
        </IconButton>
    );
};

const HEADER_HEIGHT = 50;
const LAYERS_PANEL_WIDTH = 300;

const useStyles = makeStyles((theme: Theme) => ({
    panel: {
        top: HEADER_HEIGHT,
        width: 300,
    },
    button: {
        position: "fixed",
        top: HEADER_HEIGHT + 15,
        left: LAYERS_PANEL_WIDTH,
        width: 40,
        height: 40,
        padding: 0,
        background: theme.palette.background.paper,
        borderRadius: 0,
        boxShadow: "3px 1px 5px -1px rgba(0, 0, 0, 0.2)",
    },
}));
