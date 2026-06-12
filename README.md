# Equals Analyser

A local, browser-based analyser for Equals Money **Transaction Activity** CSV exports. The app keeps all data on your computer: open the page, choose a CSV file, and filter the transactions directly in the browser.

## Run locally

No build step or package install is required.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173> in your browser.

The app includes an anonymised sample export at `examples/transaction-activity-sample.csv`. Use the **Load example CSV** button when running from a local web server, or choose that file manually with the upload control.

You can also open `index.html` directly from the filesystem in most modern browsers, but the **Load example CSV** button may be blocked by browser file-access rules. If that happens, use the upload control instead.

## Supported CSV columns

The app expects the following Equals Money Transaction Activity columns for display and filtering. It ignores most other columns, but if `Attachment 2` through `Attachment 10` are present they are also checked when deciding whether a receipt exists.

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
- `Attachment 1`

## Features

- Upload a Transaction Activity CSV locally without sending data to a server.
- Load an included anonymised example CSV for development and testing.
- View all card holders or filter to a single holder using the `Name` column.
- Filter transactions by completed date range.
- Show only transactions that do not have receipts attached.
- Review a summary of summed `Total debited` values grouped by `Balance`.

## Example data notes

The included sample CSV mirrors the structure of an Equals Money Transaction Activity export and includes:

- multiple card holders from the `Name` column;
- complete, declined, debit, credit, fee, and refund rows;
- rows with and without receipt attachments;
- a blank line and a repeated header row, matching the kind of export artefacts the parser now ignores.
