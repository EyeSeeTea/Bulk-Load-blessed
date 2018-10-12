import * as actionTypes from "../actions/actionTypes";

const loading = (state = true, action) => {
    switch (action.type) {
        case actionTypes.LOADING:
            return action.loading;
        default:
            return state;
    }
};

export default loading;