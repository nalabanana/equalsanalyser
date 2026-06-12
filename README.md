# Equals Analyser

A local, browser-based analyser for Equals Money **Transaction Activity** CSV exports. The app keeps all data on your computer: open the page, choose a CSV file, and filter the transactions directly in the browser.

## Run locally

No build step or package install is required.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173> in your browser.

You can also open `index.html` directly from the filesystem in most modern browsers.

## Supported CSV columns

The app expects the following Equals Money Transaction Activity columns for import, filtering, receipt detection, and summaries. It does not display `Reference` or `Attachment 1`; if `Attachment 1` through `Attachment 10` are present they are checked when deciding whether a receipt exists.

- `Completed date (UTC)`
- `Type`
- `Status`
- `Description`
- `Reference`
- `Name`
- `Balance`
- `Total credited`
- `Total debited`
- `Attachment lost`
- `Attachment 1` (used for receipt detection, not displayed)

## Features

- Upload a Transaction Activity CSV locally without sending data to a server.
- View all card holders or filter to a single holder using the `Name` column.
- Filter transactions by completed date range.
- Show only completed card transactions (`Type` = `Card`, `Status` = `Complete`) that do not have receipts attached.
- Show 🚨 in the `Attachment lost` column when the CSV value is true.
- Display one `Amount` column by combining `Total credited` and `Total debited`, with debits shown as negative values.
- Copy a personalised email message from the first table column for each missing-receipt transaction asking the card holder to log in to the Equals app and upload the receipt.
- When filtered to one card holder, copy one combined email covering all of that holder's currently filtered missing-receipt transactions.
- Review a bottom-of-page summary of summed `Total debited` values grouped by `Balance`.
