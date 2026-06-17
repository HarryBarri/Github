/**
 * Fluxon waitlist — Google Apps Script Web App
 * ------------------------------------------------
 * Receives signups from the Fluxon website and appends them as rows to the
 * spreadsheet this script is bound to.
 *
 * Setup (see SETUP.md in the repo for the full walkthrough):
 *   1. In your Google Sheet: Extensions > Apps Script.
 *   2. Paste this file in as Code.gs.
 *   3. (Optional) set SHARED_SECRET below and match it with the
 *      SHEETS_WEBHOOK_SECRET env var in Vercel.
 *   4. Deploy > New deployment > type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   5. Copy the Web app URL and set it as SHEETS_WEBHOOK_URL in Vercel.
 */

const SHEET_NAME = "Waitlist";
const SHARED_SECRET = ""; // optional; if set, must match SHEETS_WEBHOOK_SECRET in Vercel

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Email", "Name", "Company", "Use Case"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (SHARED_SECRET && data.secret !== SHARED_SECRET) {
      return json_({ ok: false, error: "Unauthorized" });
    }

    const email = String(data.email || "").trim().toLowerCase();
    if (!email) return json_({ ok: false, error: "Missing email" });

    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();

    let emails = [];
    if (lastRow >= 2) {
      emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat().map(String);
    }
    if (emails.indexOf(email) !== -1) {
      return json_({ ok: true, duplicate: true, count: emails.length });
    }

    sheet.appendRow([new Date(), email, data.name || "", data.company || "", data.useCase || ""]);
    return json_({ ok: true, duplicate: false, count: sheet.getLastRow() - 1 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  const sheet = getSheet_();
  return json_({ ok: true, count: Math.max(0, sheet.getLastRow() - 1) });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
