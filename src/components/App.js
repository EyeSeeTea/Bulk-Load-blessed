import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {MuiThemeProvider} from 'material-ui';
import {withStyles} from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Select from 'react-select';

import HeaderBarComponent from 'd2-ui/lib/app-header/HeaderBar';
import headerBarStore$ from 'd2-ui/lib/app-header/headerBar.store';
import withStateFrom from 'd2-ui/lib/component-helpers/withStateFrom';
import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';

import './App.css';
import theme from './Theme';
import {getUserInformation} from '../logic/dhisConnector';
import * as actionTypes from '../actions/actionTypes';
import OrgUnitTreeMultipleSelectAndSearch from './OrgUnitTreeMultipleSelectAndSearch';

const HeaderBar = withStateFrom(headerBarStore$, HeaderBarComponent);

const styles = theme => ({
    root: {
        ...theme.mixins.gutters(),
        paddingTop: theme.spacing.unit * 2,
        paddingBottom: theme.spacing.unit * 2,
    }
});

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            username: undefined,
            dataSets: [],
            programs: [],
            organisationUnits: [],
            orgUnitTreeSelected: [],
            orgUnitTreeRoots: [],
            orgUnitTreeBaseRoot: [],
            elementSelectOptions: [],
            selectedProgramOrDataSet: undefined
        };

        this.loadUserInformation();
        this.searchForOrgUnits();

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);

        //this.props.setLoading(true);
        /**getElementMetadata({
            d2: this.props.d2,
            element: {
                id: 'vFcxda6dJyT',
                type: 'program',
                endpoint: 'programs',
                displayName: 'Chagas disease - Diagnosis (individual data) (HMO16)',
                categoryCombo: {
                    id: 'JzvGfLYkX17'
                },
                programStages: [
                    {
                        id: 'bZyGv5YPlFt'
                    }
                ]
            }
        }).then(result => {
            buildSheet(result).then(() =>
                this.props.setLoading(false));
        });**/
    }

    getChildContext() {
        return {
            d2: this.props.d2,
        };
    }

    loadUserInformation() {
        getUserInformation({
            d2: this.props.d2
        }).then(result => {
            this.setState({
                ...result
            });
        });
    }

    handleOrgUnitTreeClick(event, orgUnit) {
        if (this.state.orgUnitTreeSelected.includes(orgUnit.path)) {
            this.setState(state => {
                state.orgUnitTreeSelected.splice(state.orgUnitTreeSelected.indexOf(orgUnit.path), 1);
                return { orgUnitTreeSelected: state.orgUnitTreeSelected };
            });
        } else {
            this.setState(state => {
                state.orgUnitTreeSelected.push(orgUnit.path);
                return { orgUnitTreeSelected: state.orgUnitTreeSelected };
            });
        }
    }

    searchForOrgUnits(searchValue = '') {
        let fields = 'id,displayName,path,children::isNotEmpty,access';

        if (searchValue.trim().length === 0) {
            this.props.d2.models.organisationUnits.list({
                fields,
                level: 1
            }).then((result) => {
                this.setState({
                    orgUnitTreeBaseRoot: result.toArray().map(model => model.path),
                    orgUnitTreeRoots: result.toArray()
                });
            });
        } else {
            this.props.d2.models.organisationUnits.list({
                fields,
                query: searchValue,
            }).then((result) => {
                this.setState({
                    orgUnitTreeRoots: result.toArray()
                });
            });
        }


    }

    render() {
        let handleModelChange = (selectedOption) => {
            this.setState({elementSelectOptions: this.state[selectedOption.value]});
        };

        let handleElementChange = (selectedOption) => {
            this.setState({selectedProgramOrDataSet: selectedOption.value})
        };

        return (
            <MuiThemeProvider muiTheme={theme} theme={theme}>
                <div>
                    <div id='loading' hidden={!this.props.loading}>
                        <LoadingMask large={true}/>
                    </div>
                    <div>
                        <HeaderBar d2={this.props.d2}/>
                        <div className='main-container' style={{margin: '1em', marginTop: '3em'}}>
                            <Paper style={{margin: '2em', marginTop: '2em', padding: '2em', width: '50%'}}>
                                <h1>Template Generation</h1>
                                <div className='row' style={{marginTop: '2em', marginLeft: '2em', marginRight: '2em'}}>
                                    <div style={{flexBasis: '30%', marginRight: '1em'}}>
                                        <Select
                                            placeholder={'Model'}
                                            onChange={handleModelChange}
                                            options={[{value: 'dataSets', label: 'Data Set'}, {
                                                value: 'programs',
                                                label: 'Program'
                                            }]}
                                        />
                                    </div>
                                    <div style={{flexBasis: '70%', marginLeft: '1em'}}>
                                        <Select
                                            placeholder={'Select element to export...'}
                                            onChange={handleElementChange}
                                            options={this.state.elementSelectOptions}
                                        />
                                    </div>
                                </div>
                                <OrgUnitTreeMultipleSelectAndSearch
                                    roots={this.state.orgUnitTreeRoots}
                                    onUpdateInput={this.searchForOrgUnits.bind(this)}
                                    initiallyExpanded={this.state.orgUnitTreeBaseRoot}
                                    selected={this.state.orgUnitTreeSelected}
                                    onSelectClick={this.handleOrgUnitTreeClick}
                                    noHitsLabel={'No Organisation Units found'}
                                />
                            </Paper>
                            <Paper style={{margin: '2em', marginTop: '2em', padding: '2em', width: '50%'}}>
                                <h1>Bulk Import</h1>
                            </Paper>
                        </div>
                    </div>
                </div>
            </MuiThemeProvider>
        );
    }
}

App.childContextTypes = {
    d2: PropTypes.object
};

const mapStateToProps = state => ({
    d2: state.d2,
    database: state.database,
    loading: state.loading
});

const mapDispatchToProps = dispatch => ({
    setLoading: (loading) => dispatch({type: actionTypes.LOADING, loading: loading})
});

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(App));