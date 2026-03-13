# Forecast Monitor

Live demo: https://forecastmonitor.tanbir.in/

This project is a responsive forecast monitoring app for UK national wind power generation in January 2024. It compares actual generation against forecasted generation and lets the user choose a start time, end time, and forecast horizon to see how forecast quality changes over time.

The current implementation serves pre-fetched January 2024 BMRS snapshots from local JSON files through Next.js API routes. The UI then matches each actual value with the latest forecast published at or before `targetTime - horizon`.

## What the application does

- Lets the user choose a datetime range and forecast horizon in hours.
- Fetches filtered actual and forecast records from local API routes.
- Plots actual vs forecast generation on a responsive Chart.js line chart.
- Leaves missing forecast values empty instead of inventing data.
- Calculates summary metrics from the plotted range:
  - Mean absolute error
  - Average actual generation
  - Peak actual generation
  - Forecast coverage

Default UI state:

- Start time: `2024-01-01T00:00`
- End time: `2024-01-07T23:30`
- Horizon: `4` hours

## End-to-end flow

1. The user selects a time window and a forecast horizon.
2. The client page calls:
   - `/api/actuals?from=<iso>&to=<iso>`
   - `/api/forecasts?from=<iso>&to=<iso>`
3. Each API route loads its JSON snapshot from `public/`, caches it in memory, and filters records by the requested ISO timestamp range.
4. `buildChartData()` in `lib/dataUtils.ts` groups forecasts by target `startTime`, sorts them by `publishTime`, and picks the latest forecast published on or before `startTime - horizon`.
5. If no eligible forecast exists for a target time, the chart receives `null` for that forecast point and renders a gap.
6. The page computes the visible summary stats from the matched dataset and renders them below the chart.

## Tech stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Chart.js and `react-chartjs-2`
- `date-fns`

## Project structure

- `app/page.tsx`
  Main client page. Manages filters, fetches API data, builds chart state, and computes summary cards.
- `app/layout.tsx`
  Root layout and global metadata/fonts setup.
- `app/globals.css`
  Global Tailwind import and base theme variables.
- `app/api/actuals/route.ts`
  Filters and returns actual generation records from the local January 2024 snapshot.
- `app/api/forecasts/route.ts`
  Filters and returns forecast records from the local January 2024 snapshot.
- `components/Controls.tsx`
  Start/end datetime inputs, horizon slider, and update button.
- `components/Chart.tsx`
  Line chart rendering for actual and forecast series.
- `lib/dataUtils.ts`
  Shared types and forecast-to-actual matching logic.
- `scripts/fetchJanData.mjs`
  One-off data preparation script used to fetch, merge, clean, and save January 2024 BMRS data into `public/`.
- `notebook/forecast_error_analysis.ipynb`
  Forecast error analysis notebook using actuals and forecasts.
- `notebook/reliability_analysis.ipynb`
  Wind generation reliability analysis notebook using historical actuals.
- `public/actuals-jan2024-clean.json`
  Cleaned actual wind generation snapshot.
- `public/forecasts-jan2024.json`
  Forecast snapshot used by the app.
- `assignment.txt`
  Original take-home assignment brief.

## Data sources and snapshot details

The app is based on Elexon BMRS data for January 2024:

- Actual generation source:
  BMRS actual generation endpoint for wind data
- Forecast source:
  BMRS wind forecast endpoints

Current repository snapshot:

- `public/actuals-jan2024-clean.json`
  - `1472` actual half-hour points
  - Range: `2024-01-01T00:00:00Z` to `2024-01-31T23:30:00Z`
- `public/forecasts-jan2024.json`
  - `1426` forecast records
  - `744` unique forecast target times
  - Horizon coverage in the saved file ranges from `0.5` to `66.5` hours

The fetch script combines forecast records from multiple BMRS forecast streams, removes invalid records where `publishTime >= startTime`, and aggregates wind onshore + wind offshore actual generation into a single national wind total.

## Local development

Prerequisites:

- Node.js and npm

Install and run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

No environment variables are required for the current implementation.

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Analysis notebooks

- `notebook/forecast_error_analysis.ipynb`
  Uses `actuals-jan2024-clean.json` and `forecasts-jan2024.json` to analyze forecast error characteristics, including horizon-based error, time-of-day variation, error distribution, and forecast bias. The notebook filters forecast records to the `0-48h` horizon range for the analysis.
- `notebook/reliability_analysis.ipynb`
  Uses `actuals-jan2024-clean.json` to analyze historical January 2024 wind generation and estimate dependable wind capacity. The notebook's recommendation is based on percentile-style reliability thresholds and concludes that roughly `5 GW` can be treated as a conservative reliable level.
- Both notebooks are currently set up for Google Colab/Jupyter-style execution and begin by uploading the JSON files from `public/`.

## API contract

### `GET /api/actuals`

Query params:

- `from`: ISO timestamp
- `to`: ISO timestamp

Returns:

- Filtered actual generation records from `public/actuals-jan2024-clean.json`

### `GET /api/forecasts`

Query params:

- `from`: ISO timestamp
- `to`: ISO timestamp

Returns:

- Filtered forecast records from `public/forecasts-jan2024.json`

## Notes on current behavior

- The production app does not fetch live BMRS data at request time. It serves static January 2024 snapshots from the repository.
- The horizon slider currently allows `0` to `66` hours because the saved forecast dataset contains horizons beyond `48` hours.
- Forecast coverage is intentionally incomplete where no eligible forecast exists. Those gaps are shown as missing forecast values in the chart.
- The browser page metadata is still using the default Next.js title/description values from `app/layout.tsx`.
- This repository now includes the analysis notebooks under the `notebook/` directory.

## Verification status

- `npm run build`: passes
- `npm run lint`: currently fails because several files still use `any`

## AI Assistance Disclosure

AI tools were used during development for limited assistance, including:

- Debugging TypeScript and Next.js issues
- Refactoring utility functions
- Generating small code snippets
- Improving documentation and README structure

All application logic, data processing decisions, and analysis notebooks were implemented and verified manually.
