import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';

import {getManifest, init} from 'd2';
import LoadingMask from '@dhis2/d2-ui-core/loading-mask/LoadingMask.component';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import App from './components/App.js';
import theme from './components/Theme';
import {store} from './store';
import './index.css';

const DEBUG = process.env.REACT_APP_DEBUG;

getManifest('manifest.webapp').then((manifest) => {
    let config = {};

    // Set baseUrl
    config.baseUrl = manifest.activities !== undefined ? manifest.activities.dhis.href + '/api'
        : process.env.REACT_APP_DHIS2_BASE_URL !== undefined ? process.env.REACT_APP_DHIS2_BASE_URL + '/api'
            : config.baseUrl = window.location.href.includes('/api') ? window.location.href.split('/api')[0] + '/api'
                : undefined;

    // Set credentials
    if (process.env.REACT_APP_DEBUG === 'true') {
        console.log('Starting React App in DEBUG mode with user: ' + process.env.REACT_APP_DHIS2_USERNAME);
        config.headers = {
            Authorization: 'Basic ' + btoa(process.env.REACT_APP_DHIS2_USERNAME + ':' + process.env.REACT_APP_DHIS2_PASSWORD)
        }
    }

    // Init library
    init(config).then(d2 => {
        if (DEBUG) console.log({url: config.baseUrl, d2: d2});
        store.dispatch({type: 'SET_D2', d2});
        store.dispatch({type: 'LOADING', loading: false});
        ReactDOM.render(
            <Provider store={store}>
                <App/>
            </Provider>, document.getElementById('root')
        );
    });
}).catch((error) => {
    console.error('D2 initialization error:', error);
    ReactDOM.render((<div>Failed to connect with D2</div>), document.getElementById('root'));
});

ReactDOM.render(
    <MuiThemeProvider muiTheme={theme} theme={theme}>
        <LoadingMask
            large={true}
        />
    </MuiThemeProvider>, document.getElementById('root'));