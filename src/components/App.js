import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Select from 'react-select';
import Dropzone from 'react-dropzone';
import {MuiThemeProvider} from 'material-ui';
import {withStyles} from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button/Button';
import CloudUploadIcon from 'material-ui/svg-icons/file/cloud-upload';
import CloudDoneIcon from 'material-ui/svg-icons/file/cloud-done';

import HeaderBarComponent from 'd2-ui/lib/app-header/HeaderBar';
import headerBarStore$ from 'd2-ui/lib/app-header/headerBar.store';
import withStateFrom from 'd2-ui/lib/component-helpers/withStateFrom';
import LoadingMask from 'd2-ui/lib/loading-mask/LoadingMask.component';

import * as sheetImport from "../logic/sheetImport";
import * as sheetBuilder from "../logic/sheetBuilder";
import * as dhisConnector from "../logic/dhisConnector";

import './App.css';
import theme from './Theme';
import * as actionTypes from '../actions/actionTypes';
import OrgUnitTreeMultipleSelectAndSearch from './OrgUnitTreeMultipleSelectAndSearch';
import ImportOptionsRow from "./ImportOptionsRow";
import AlertSnackbar from "./AlertSnackbar";

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
            orgUnitTreeSelected: [],
            orgUnitTreeRoots: [],
            orgUnitTreeBaseRoot: [],
            elementSelectOptions1: [],
            elementSelectOptions2: [],
            selectedProgramOrDataSet1: undefined,
            selectedProgramOrDataSet2: undefined,
            importElementOptions: [],
            importElementYear: [],
            importElementMonth: [],
            importElementWeek: [],
            importElementDay: [],
            importDataSheet: undefined
        };

        this.loadUserInformation();
        this.searchForOrgUnits();

        this.handleOrgUnitTreeClick = this.handleOrgUnitTreeClick.bind(this);
        this.handleTemplateDownloadClick = this.handleTemplateDownloadClick.bind(this);
        this.handleDataImportClick = this.handleDataImportClick.bind(this);
    }

    getChildContext() {
        return {
            d2: this.props.d2,
        };
    }

    loadUserInformation() {
        dhisConnector.getUserInformation({
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
                return {orgUnitTreeSelected: state.orgUnitTreeSelected};
            });
        } else {
            this.setState(state => {
                state.orgUnitTreeSelected.push(orgUnit.path);
                return {orgUnitTreeSelected: state.orgUnitTreeSelected};
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

    handleTemplateDownloadClick() {
        let orgUnits = this.state.orgUnitTreeSelected.map(element =>
            element.substr(element.lastIndexOf('/') + 1));

        // TODO: Add validation error message
        if (orgUnits.length === 0) return;
        if (this.state.selectedProgramOrDataSet1 === undefined) return;

        this.props.setLoading(true);
        dhisConnector.getElementMetadata({
            d2: this.props.d2,
            element: this.state.selectedProgramOrDataSet1,
            organisationUnits: orgUnits
        }).then(result => {
            sheetBuilder.buildSheet(result).then(() =>
                this.props.setLoading(false));
        });
    }

    onDrop(file) {
        this.setState({
            importDataSheet: file[0]
        });
    }

    handleDataImportClick() {
        // TODO: Missing options error checking
        // TODO: Add validation error message
        if (this.state.selectedProgramOrDataSet2 === undefined) return;
        if (this.state.importDataSheet === undefined) return;

        this.props.setLoading(true);
        dhisConnector.getElementMetadata({
            d2: this.props.d2,
            element: this.state.selectedProgramOrDataSet2,
            organisationUnits: []
        }).then(result => {
            return sheetImport.readSheet({
                ...result,
                d2: this.props.d2,
                file: this.state.importDataSheet
            });
        }).then((data) => {
            console.log(data);
            return dhisConnector.importData({
                d2: this.props.d2,
                element: this.state.selectedProgramOrDataSet2,
                data: data
            });
        }).then(response => {
            this.props.setLoading(false);
            console.log(response);
            this.props.showSnackbar(response.data.message + ' Imported: ' + response.data.response.imported + ' elements');
        }).catch((reason => {
            // TODO Output errors on snackbar
            this.props.setLoading(false);
            console.error(reason);
            this.props.showSnackbar(reason.message);
        }));
    }

    onChangeImportOptions(selector, option) {
        // TODO
    }

    render() {
        const {
            snackbarOpen, snackbarMessage
        } = this.props.dialog;

        let handleModelChange1 = (selectedOption) => {
            this.setState({elementSelectOptions1: this.state[selectedOption.value]});
        };

        let handleElementChange1 = (selectedOption) => {
            this.setState({selectedProgramOrDataSet1: selectedOption})
        };

        let handleModelChange2 = (selectedOption) => {
            this.setState({elementSelectOptions2: this.state[selectedOption.value]});
        };

        let handleElementChange2 = (selectedOption) => {
            this.setState({selectedProgramOrDataSet2: selectedOption})
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
                                <div className='row' style={{marginTop: '1em', marginLeft: '1em', marginRight: '1em'}}>
                                    <div style={{flexBasis: '30%', margin: '1em'}}>
                                        <Select
                                            placeholder={'Model'}
                                            onChange={handleModelChange1}
                                            options={[{value: 'dataSets', label: 'Data Set'}, {
                                                value: 'programs',
                                                label: 'Program'
                                            }]}
                                        />
                                    </div>
                                    <div style={{flexBasis: '70%', margin: '1em'}}>
                                        <Select
                                            placeholder={'Select element to export...'}
                                            onChange={handleElementChange1}
                                            options={this.state.elementSelectOptions1}
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
                                <div className='row' style={{marginTop: '2em', marginLeft: '2em', marginRight: '2em'}}>
                                    <Button variant='contained' color='primary'
                                            onClick={this.handleTemplateDownloadClick}>
                                        Download template
                                    </Button>
                                </div>
                            </Paper>
                            <Paper style={{margin: '2em', marginTop: '2em', padding: '2em', width: '50%'}}>
                                <h1>Bulk Import</h1>
                                <div className='row' style={{marginTop: '1em', marginLeft: '1em', marginRight: '1em'}}>
                                    <div style={{flexBasis: '30%', margin: '1em'}}>
                                        <Select
                                            placeholder={'Model'}
                                            onChange={handleModelChange2}
                                            options={[{value: 'dataSets', label: 'Data Set'}, {
                                                value: 'programs',
                                                label: 'Program'
                                            }]}
                                        />
                                    </div>
                                    <div style={{flexBasis: '70%', margin: '1em'}}>
                                        <Select
                                            placeholder={'Select element to import...'}
                                            onChange={handleElementChange2}
                                            options={this.state.elementSelectOptions2}
                                        />
                                    </div>
                                </div>
                                <ImportOptionsRow
                                    importElementOptions={this.state.importElementOptions}
                                    importElementYear={this.state.importElementYear}
                                    importElementMonth={this.state.importElementMonth}
                                    importElementWeek={this.state.importElementWeek}
                                    importElementDay={this.state.importElementDay}
                                    onChange={this.onChangeImportOptions.bind(this)}
                                />
                                <Dropzone
                                    accept={'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
                                    className={'dropZone'}
                                    acceptClassName={'stripes'}
                                    rejectClassName={'rejectStripes'}
                                    onDrop={this.onDrop.bind(this)}
                                    multiple={false}
                                >
                                    <div className={'dropzoneTextStyle'}
                                         hidden={this.state.importDataSheet !== undefined}>
                                        <p className={'dropzoneParagraph'}>{'Drag and drop file to import'}</p>
                                        <br/>
                                        <CloudUploadIcon className={'uploadIconSize'}/>
                                    </div>
                                    <div className={'dropzoneTextStyle'}
                                         hidden={this.state.importDataSheet === undefined}>
                                        {this.state.importDataSheet !== undefined &&
                                        <p className={'dropzoneParagraph'}>{this.state.importDataSheet.name}</p>}
                                        <br/>
                                        <CloudDoneIcon className={'uploadIconSize'}/>
                                    </div>
                                </Dropzone>
                                <div className='row' style={{marginTop: '2em', marginLeft: '2em', marginRight: '2em'}}>
                                    <Button variant='contained' color='primary' onClick={this.handleDataImportClick}>
                                        Import data
                                    </Button>
                                </div>
                            </Paper>
                        </div>
                    </div>
                    <AlertSnackbar open={snackbarOpen} message={snackbarMessage} onClose={this.props.hideSnackbar}/>
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
    loading: state.loading,
    dialog: state.dialog
});

const mapDispatchToProps = dispatch => ({
    setLoading: (loading) => dispatch({type: actionTypes.LOADING, loading: loading}),
    hideSnackbar: () => {
        dispatch({type: actionTypes.SNACKBAR_SHOW, show: false});
    },
    showSnackbar: (message) => {
        dispatch({type: actionTypes.SNACKBAR_UPDATE, message});
        dispatch({type: actionTypes.SNACKBAR_SHOW, show: true});
    }
});

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(App));