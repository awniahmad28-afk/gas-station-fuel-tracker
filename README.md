# Gas Station Fuel Tracker

A simple fuel-sales tracking web app for a single gas station. Record shift
meter readings per fuel grade, and the app computes gallons sold and revenue
automatically, with shift history and daily summary views.

## Install

```
npm install
```

## Run

```
npm start
```

The server listens on port `3000` by default. Override with the `PORT`
environment variable:

```
PORT=8080 npm start
```

Then open `http://localhost:3000` in a browser.

## Data storage

Data is persisted to `data/data.json`, a JSON file created automatically on
first write. This file is git-ignored since it holds runtime data, not
source code.

## v1 feature set

This v1 supports a single station with a configurable list of fuel grades
(Regular, Mid, Premium, Diesel by default), each with an editable price per
gallon. Staff enter a shift by date and optional label, along with opening
and closing pump meter readings per grade; the server computes gallons sold
(closing minus opening) and revenue (gallons times the grade's price at the
time of entry) per grade, plus shift totals. A shift history view lists all
recorded shifts, and a daily summary view totals gallons and revenue by
grade for a chosen date or across all time.

## Ideas for v2

- Multi-location support for operators with more than one station
- Direct integration with pump/tank hardware (Gilbarco, Wayne, Veeder-Root
  protocols) to pull meter readings automatically instead of manual entry
- Employee shift and cash-drawer reconciliation (expected vs. actual cash,
  card settlement totals)
- Authentication and role-based access (managers vs. shift staff)
- A real database (e.g. PostgreSQL) in place of the JSON file store for
  concurrent access and larger history
- Reporting exports (CSV/PDF) and historical trend charts
