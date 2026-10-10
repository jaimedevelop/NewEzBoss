# Finance ledger

The `/finances` page manages manually entered or imported records using the authenticated `/finance-records` API. Records belong to the authenticated account and require finances page permissions. Apply `ezboss-api/src/db/schema/077_finance_records.sql` through the existing migration process and deploy the API before using the page. This change does not run migrations or deploy services.

Imports accept Excel (`.xlsx`, `.xls`), CSV, and a JSON array of flat objects. The first nonempty spreadsheet row is the header. Choose a worksheet and match its columns, then review the first five rows before importing. English and common Spanish names match automatically; all matches are editable. Unmapped fields are blank and unused source columns are omitted. Imports append; importing the same file again intentionally creates new rows. Retrying a failed import uses the same IDs to avoid duplicate insertion after an uncertain network response.

Files are parsed in the browser. Maximum file size is 10 MB, import size is 1,000 mapped rows / 900 KB, and each cell is limited to 2,000 characters. Values remain text to retain reference numbers, source date formats, and currency formatting. There are no computed totals yet. Spreadsheet formulas import their cached displayed values; formulas are not executed or stored.

Rows can be added, edited, searched, and deleted with confirmation. Edits check the row version to prevent overwriting a concurrent edit. On a conflict, close the editor and reload before editing again. The database reserves `estimateId` for later integration; this release does not synchronize estimates or payments automatically.

Import checks: from the workspace root, run `node --import ./ezboss-api/node_modules/tsx/dist/loader.mjs --test NewEzBoss/tests/financeImport.test.ts`.
