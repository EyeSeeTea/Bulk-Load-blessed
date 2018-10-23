import React from "react";
import Select from 'react-select';

class ImportOptionsRow extends React.Component {
    render() {
        let handleChangeOptions = (selectedOption) => {
            this.props.onChange('Option', selectedOption);
        };

        let handleChangeYear = (selectedOption) => {
            this.props.onChange('Year', selectedOption);
        };

        let handleChangeMonth = (selectedOption) => {
            this.props.onChange('Month', selectedOption);
        };

        let handleChangeWeek = (selectedOption) => {
            this.props.onChange('Week', selectedOption);
        };

        let handleChangeDay = (selectedOption) => {
            this.props.onChange('Day', selectedOption);
        };

        return (
            <div className='row' style={{marginTop: '1em', marginLeft: '1em', marginRight: '1em'}}>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementOptions.length === 0}>
                    <Select
                        placeholder={'Options'}
                        options={this.props.importElementOptions}
                        onChange={handleChangeOptions}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementYear.length === 0}>
                    <Select
                        placeholder={'Year'}
                        options={this.props.importElementYear}
                        onChange={handleChangeYear}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementMonth.length === 0}>
                    <Select
                        placeholder={'Month'}
                        options={this.props.importElementMonth}
                        onChange={handleChangeMonth}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementWeek.length === 0}>
                    <Select
                        placeholder={'Week'}
                        options={this.props.importElementWeek}
                        onChange={handleChangeWeek}
                    />
                </div>
                <div style={{flexBasis: '35%', margin: '1em'}}
                     hidden={this.props.importElementDay.length === 0}>
                    <Select
                        placeholder={'Day'}
                        options={this.props.importElementDay}
                        onChange={handleChangeDay}
                    />
                </div>
            </div>
        );
    }
}

export default ImportOptionsRow;