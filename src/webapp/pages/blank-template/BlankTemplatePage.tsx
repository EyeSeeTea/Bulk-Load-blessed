import i18n from "../../../locales";
import { DialogContentText } from "@material-ui/core";
import React from "react";

export default function BlankTemplatePage(): React.ReactElement {
    return (
        <React.Fragment>
            <h2>{i18n.t("User with no permissions")} </h2>
            <DialogContentText>
                {i18n.t(
                    "It seems this user account does not have any permission." +
                        " Please get in touch with the admin if you need access to these sections."
                )}
            </DialogContentText>
        </React.Fragment>
    );
}
