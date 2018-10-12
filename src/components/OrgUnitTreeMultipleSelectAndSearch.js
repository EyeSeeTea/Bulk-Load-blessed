import React from 'react';
import OrganisationUnitTree from 'd2-ui/lib/org-unit-tree/OrgUnitTree.component';
import addD2Context from 'd2-ui/lib/component-helpers/addD2Context';
import noop from 'd2-utilizr/lib/noop';
import PropTypes from 'prop-types';
import TextField from "@material-ui/core/TextField/TextField";

function OrgUnitTreeMultipleSelectAndSearch(props, context) {
    const styles = {
        labelStyle: {
            whiteSpace: 'nowrap',
        },
        noHitsLabel: {
            fontStyle: 'italic',
            color: 'rgba(0, 0, 0, 0.4)',
        }
    };

    let currentTimeout = undefined;

    let handleChange = event => {
        let value = event.target.value;
        if (currentTimeout !== undefined) clearTimeout(currentTimeout);
        currentTimeout = setTimeout(() => {
            props.onUpdateInput(value);
            currentTimeout = undefined;
        }, 250);
    };

    return (
        <div style={{position: 'relative'}}>
            <TextField
                id="search"
                label="Search"
                onChange={handleChange}
                margin="normal"
                style={{width: '100%'}}
            />
            <div style={{height: '12em', overflow: 'auto', width: '100%'}}>
                {Array.isArray(props.roots) && props.roots.length > 0 ? props.roots.map(root => {
                    return (
                        <OrganisationUnitTree
                            key={root.id}
                            root={root}
                            selected={props.selected}
                            initiallyExpanded={props.initiallyExpanded}
                            labelStyle={styles.labelStyle}
                            onSelectClick={props.onSelectClick}
                            idsThatShouldBeReloaded={props.idsThatShouldBeReloaded}
                            hideCheckboxes={props.hideCheckboxes}
                            hideMemberCount={props.hideMemberCount}
                        />
                    )
                }) : <div style={styles.noHitsLabel}>{props.noHitsLabel}</div>}
            </div>
        </div>
    );
}

OrgUnitTreeMultipleSelectAndSearch.propTypes = {
    onOrgUnitSearch: PropTypes.func,
    onNewRequest: PropTypes.func,
    autoCompleteDataSource: PropTypes.array,
    onChangeSelectedOrgUnit: PropTypes.func,
    onAutoCompleteValueSelected: PropTypes.func,
    searchOrganisationUnits: PropTypes.func,
    roots: PropTypes.array,
    idsThatShouldBeReloaded: PropTypes.array,
    onUpdateInput: PropTypes.func,
    selected: PropTypes.array,
    initiallyExpanded: PropTypes.array,
    onSelectClick: PropTypes.func,
    noHitsLabel: PropTypes.string.isRequired,
    hideMemberCount: PropTypes.bool,
    hideCheckboxes: PropTypes.bool,
};
OrgUnitTreeMultipleSelectAndSearch.defaultProps = {
    onOrgUnitSearch: noop,
    onNewRequest: noop,
    onChangeSelectedOrgUnit: noop,
    onAutoCompleteValueSelected: noop,
    searchOrganisationUnits: noop,
    onUpdateInput: noop,
    initiallyExpanded: [],
    roots: [],
    autoCompleteDataSource: [],
    idsThatShouldBeReloaded: [],
    onClick: noop,
    hideMemberCount: false,
    hideCheckboxes: false,
};

export default addD2Context(OrgUnitTreeMultipleSelectAndSearch);