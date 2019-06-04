import d2 from "./d2Reducer";
import database from "./databaseReducer";
import loading from "./loadingReducer";
import dialog from "./dialogReducer";

const index = (state = {}, action: Action) => {
    return {
        d2: d2(state.d2, action),
        database: database(state.database, action),
        dialog: dialog(state.dialog, action),
        loading: loading(state.loading, action),
    };
};

export default index;
