import * as actionTypes from "../actions/actionTypes";

const database = (state = {}, action) => {
    switch (action.type) {
        case actionTypes.SET_DATABASE:
            return action.database;
        default:
            return state;
    }
};

export default database;