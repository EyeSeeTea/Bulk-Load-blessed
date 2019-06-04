import * as actionTypes from "../actions/actionTypes";

const dialog = (
    state = {
        snackbarOpen: false,
        snackbarMessage: "",
    },
    action
) => {
    let newState = { ...state };
    switch (action.type) {
        case actionTypes.SNACKBAR_UPDATE:
            newState.snackbarMessage = action.message;
            return newState;
        case actionTypes.SNACKBAR_SHOW:
            newState.snackbarOpen = action.show;
            return newState;
        default:
            return newState;
    }
};

export default dialog;
