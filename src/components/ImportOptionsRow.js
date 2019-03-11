import React from "react";
import Select from 'react-select';

class ImportOptionsRow extends React.Component {
    render() {
        let handleChangeOptions = (selectedOption) => {
            this.props.onChange('option', selectedOption);
        };

        let handleChangeYear = (selectedOption) => {
            this.props.onChange('year', selectedOption);
        };

        let handleChangeMonth = (selectedOption) => {
            this.props.onChange('month', selectedOption);
        };

        let handleChangeWeek = (selectedOption) => {
            this.props.onChange('week', selectedOption);
        };

        let handleChangeDay = (selectedOption) => {
            this.props.onChange('day', selectedOption);
        };

        return (
            <div className='row' style={{marginTop: '1em', marginLeft: '1em', marginRight: '1em'}}>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementOptionsValues.length === 0}>
                    <Select
                        placeholder={'Options'}
                        options={this.props.importElementOptionsValues}
                        onChange={handleChangeOptions}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementYearValues.length === 0}>
                    <Select
                        placeholder={'Year'}
                        options={this.props.importElementYearValues}
                        onChange={handleChangeYear}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementMonthValues.length === 0}>
                    <Select
                        placeholder={'Month'}
                        options={this.props.importElementMonthValues}
                        onChange={handleChangeMonth}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementWeekValues.length === 0}>
                    <Select
                        placeholder={'Week'}
                        options={this.props.importElementWeekValues}
                        onChange={handleChangeWeek}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementDayValues.length === 0}>
                    <Select
                        placeholder={'Day'}
                        options={this.props.importElementDayValues}
                        onChange={handleChangeDay}
                    />
                </div>
            </div>
        );
    }
}

export default ImportOptionsRow;