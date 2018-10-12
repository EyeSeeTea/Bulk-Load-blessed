import {applyMiddleware, createStore} from 'redux';
import reducers from './reducers/index';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

const DEBUG = process.env.REACT_APP_DEBUG;

export const store = createStore(
    reducers,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
    DEBUG ? applyMiddleware(thunk, logger) : applyMiddleware(thunk)
);