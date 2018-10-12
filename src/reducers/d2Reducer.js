import * as actionTypes from "../actions/actionTypes";

const d2 = (state = {}, action) => {
    switch (action.type) {
        case actionTypes.SET_D2:
            return action.d2;
        default:
            return state;
    }
};

export default d2;