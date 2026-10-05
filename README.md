# LeadPredictor Calculator

A static, dependency-free campaign forecast dashboard built with vanilla HTML, CSS, and JavaScript.

## Run locally

Open `index.html` directly in a modern browser. No server, package installation, or build step is required.

## Forecast formulas

- Customers = `ceil(total revenue / average order value)`
- Leads = `ceil(customers * 100 / lead response rate)`
- Prospects = `ceil(leads * 100 / prospect response rate)`

Campaign dates set the inclusive calendar months displayed in the chart. Forecast totals are divided across those months, with any remainder assigned to earlier months. Revenue and average order value must both be finite positive numbers.