# HIV Data Generator Documentation

## Overview

The HIV Data Generator is a Node/TS script that generates synthetic HIV patient data. It creates Excel files ready to be imported by Bulk Load.

## System Requirements

### Required Software

1. **Node v16**
2. **yarn** (Node package manager)
3. **Git** (to clone Bulk Load repository)

```sh
$ git clone https://github.com/eyeseetea/bulk-load
$ git checkout feature/ocba-hiv-generate-dev-8697qpqp6
$ nvm use
$ yarn install
```

## Usage

### Basic Usage

Using bundled xlsx (hiv-bl-template.xlsx):

```sh
$ npx ts-node src/scripts/ocba-generate-hiv-data.ts --template src/scripts/hiv-bl-template.xlsx --output "hiv-data-INDEX.xlsx"
```

Notes:

-   Use your own xlsx template (bulk-load -> Download Template -> Select program "HIV" + select orgUnit (example: "MALAKAL HIV - PoC - Linelist") + [Download template])
-   Literal `INDEX` will be replaced in the output path for the current file index.

### Command Line Arguments

-   `--template`: Path to the HIV Bulk Load template Excel file (required)
-   `--max-consultations`: Maximum number of consultations per patient (default: 50)
-   `--max-tracked-entities`: Maximum number of tracked entities to generate (default: no limit)
-   `--closure-percentage`: Percentage of patients to include in closure sheet (default: 5%)
-   `--output`: Custom output Excel file path (required) with index interpolation. Example: `out-INDEX.xlsx`

## Output

The script generates an Excel file ready to be imported in Bulk Load. It contains three data sheets:

1. **TEI Instances:** Tracked entities / Enrollment data
2. **(1) HIV Consultation:** Consultation events
3. **(2) Closure:** Closure events

## Data Validation Rules

-   WHO Stage 3 or 4 automatically sets **Advanced HIV (AHD)** to "Yes"
-   Viral load is generated for all patients with **Advanced HIV (AHD) = "Yes"**
-   Consultation dates are sequential and monthly
-   Closure percentage determines how many patients have closure records

## Import

Import all generate xlsx files (a JSON report file will be generated for each imported file)

```sh
for file in hiv-data-*xlsx; do
    npx ts-node src/scripts/import-multiple-files.ts \
    --dhis2-url 'http://USER:PASSWORD@172.16.1.1:8093' \
    --results-path ./ \
    "$file"
done
```
