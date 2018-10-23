import React from "react";
import Snackbar from "@material-ui/core/Snackbar/Snackbar";

export default class AlertSnackbar extends React.Component {
    handleClose = () => {
        this.props.onClose();
    };

    render() {
        const {open, message} = this.props;

        return (
            <Snackbar
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
                open={open}
                onClose={this.handleClose}
                autoHideDuration={3000}
                message={<span id="message-id">{message}</span>}
            />
        );
    }
}