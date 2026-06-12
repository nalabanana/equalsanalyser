const REQUIRED_COLUMNS = [
  "Completed date (UTC)",
  "Type",
  "Status",
  "Description",
  "Reference",
  "Name",
  "Balance",
  "Total credited",
  "Total debited",
  "Attachment lost",
  "Attachment 1",
];

const AMOUNT_COLUMN = "Amount";
const RECEIPT_EMAIL_COLUMN = "Missing receipt email";

const DATE_COLUMN = "Completed date (UTC)";
const NAME_COLUMN = "Name";
const BALANCE_COLUMN = "Balance";
const CREDIT_COLUMN = "Total credited";
const DEBIT_COLUMN = "Total debited";
const TYPE_COLUMN = "Type";
const STATUS_COLUMN = "Status";
const ATTACHMENT_LOST_COLUMN = "Attachment lost";
const ATTACHMENT_COLUMN_PATTERN = /^Attachment \d+$/;
const INTERNAL_HAS_RECEIPT = "__hasReceipt";

const DISPLAY_COLUMNS = [
  DATE_COLUMN,
  TYPE_COLUMN,
  STATUS_COLUMN,
  "Description",
  NAME_COLUMN,
  BALANCE_COLUMN,
  AMOUNT_COLUMN,
  ATTACHMENT_LOST_COLUMN,
];

const state = {
  rows: [],
  filteredRows: [],
};

const elements = {
  csvFile: document.querySelector("#csvFile"),
  fileName: document.querySelector("#fileName"),
  statusMessage: document.querySelector("#statusMessage"),
  personFilter: document.querySelector("#personFilter"),
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  missingReceipts: document.querySelector("#missingReceipts"),
  resetFilters: document.querySelector("#resetFilters"),
  transactionCount: document.querySelector("#transactionCount"),
  missingReceiptCount: document.querySelector("#missingReceiptCount"),
  grandDebitTotal: document.querySelector("#grandDebitTotal"),
  balanceSummaryBody: document.querySelector("#balanceSummaryBody"),
  transactionHeader: document.querySelector("#transactionHeader"),
  transactionBody: document.querySelector("#transactionBody"),
  bulkEmailActions: document.querySelector("#bulkEmailActions"),
  copyFeedback: document.querySelector("#copyFeedback"),
};

elements.csvFile.addEventListener("change", handleFileSelection);
elements.personFilter.addEventListener("change", applyFilters);
elements.startDate.addEventListener("change", applyFilters);
elements.endDate.addEventListener("change", applyFilters);
elements.missingReceipts.addEventListener("change", applyFilters);
elements.resetFilters.addEventListener("click", resetFilters);

renderTransactionHeader();

function handleFileSelection(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  elements.fileName.textContent = file.name;
  setStatus(`Reading ${file.name}...`);

  const reader = new FileReader();
  reader.addEventListener("load", () => loadCsv(String(reader.result || "")));
  reader.addEventListener("error", () => setStatus("The CSV file could not be read.", true));
  reader.readAsText(file);
}

function loadCsv(csvText) {
  try {
    const { headers, records } = parseCsv(csvText);
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

    if (missingColumns.length) {
      setStatus(`Missing required columns: ${missingColumns.join(", ")}.`, true);
      disableFilters();
      state.rows = [];
      applyFilters();
      return;
    }

    state.rows = records.map((record) => normalizeRecord(record));
    populatePeopleFilter(state.rows);
    setDateBounds(state.rows);
    enableFilters();
    applyFilters();
    setStatus(`Loaded ${state.rows.length.toLocaleString()} transactions.`);
  } catch (error) {
    setStatus(error.message || "The CSV file could not be parsed.", true);
    disableFilters();
    state.rows = [];
    applyFilters();
  }
}

function parseCsv(csvText) {
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  if (!rows.length) {
    throw new Error("The CSV file is empty.");
  }

  const headers = rows[0].map((header) => header.trim());
  const records = rows.slice(1).reduce((validRecords, row) => {
    const cells = row.map((cell) => cell.trim());

    if (isRepeatedHeaderRow(cells, headers)) {
      return validRecords;
    }

    const record = headers.reduce((currentRecord, header, index) => {
      currentRecord[header] = cells[index] || "";
      return currentRecord;
    }, {});

    if (hasTransactionData(record)) {
      validRecords.push(record);
    }

    return validRecords;
  }, []);

  return { headers, records };
}

function isRepeatedHeaderRow(row, headers) {
  return headers.every((header, index) => (row[index] || "") === header);
}

function hasTransactionData(record) {
  return REQUIRED_COLUMNS.some((column) => Boolean(record[column]));
}

function normalizeRecord(record) {
  const normalized = REQUIRED_COLUMNS.reduce((currentRecord, column) => {
    currentRecord[column] = record[column] || "";
    return currentRecord;
  }, {});

  normalized[INTERNAL_HAS_RECEIPT] = Object.entries(record).some(([column, value]) => {
    return ATTACHMENT_COLUMN_PATTERN.test(column) && Boolean(value);
  });

  return normalized;
}

function populatePeopleFilter(rows) {
  const people = Array.from(new Set(rows.map((row) => row[NAME_COLUMN]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  elements.personFilter.innerHTML = '<option value="">All card holders</option>';
  people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person;
    option.textContent = person;
    elements.personFilter.append(option);
  });
}

function setDateBounds(rows) {
  const dates = rows.map((row) => toDateInputValue(row[DATE_COLUMN])).filter(Boolean).sort();
  elements.startDate.value = dates[0] || "";
  elements.endDate.value = dates[dates.length - 1] || "";
}

function enableFilters() {
  [elements.personFilter, elements.startDate, elements.endDate, elements.missingReceipts].forEach((element) => {
    element.disabled = false;
  });
}

function disableFilters() {
  [elements.personFilter, elements.startDate, elements.endDate, elements.missingReceipts].forEach((element) => {
    element.disabled = true;
  });
}

function resetFilters() {
  elements.personFilter.value = "";
  elements.missingReceipts.checked = false;
  setDateBounds(state.rows);
  applyFilters();
}

function applyFilters() {
  const selectedPerson = elements.personFilter.value;
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;
  const onlyMissingReceipts = elements.missingReceipts.checked;

  state.filteredRows = state.rows.filter((row) => {
    const rowDate = toDateInputValue(row[DATE_COLUMN]);
    const matchesPerson = !selectedPerson || row[NAME_COLUMN] === selectedPerson;
    const matchesStart = !startDate || !rowDate || rowDate >= startDate;
    const matchesEnd = !endDate || !rowDate || rowDate <= endDate;
    const matchesReceipt = !onlyMissingReceipts || isMissingReceipt(row);

    return matchesPerson && matchesStart && matchesEnd && matchesReceipt;
  });

  renderMetrics();
  renderBalanceSummary();
  renderTransactions();
  renderBulkReceiptEmailAction();
}

function renderMetrics() {
  const missingCount = state.filteredRows.filter(isMissingReceipt).length;
  const totalDebit = state.filteredRows.reduce((sum, row) => sum + parseCurrency(row[DEBIT_COLUMN]), 0);

  elements.transactionCount.textContent = state.filteredRows.length.toLocaleString();
  elements.missingReceiptCount.textContent = missingCount.toLocaleString();
  elements.grandDebitTotal.textContent = formatCurrency(totalDebit);
}

function renderBalanceSummary() {
  elements.balanceSummaryBody.innerHTML = "";

  if (!state.filteredRows.length) {
    elements.balanceSummaryBody.append(emptyRow("No matching transactions.", 2));
    return;
  }

  const totalsByBalance = state.filteredRows.reduce((summary, row) => {
    const balance = row[BALANCE_COLUMN] || "Unspecified";
    summary.set(balance, (summary.get(balance) || 0) + parseCurrency(row[DEBIT_COLUMN]));
    return summary;
  }, new Map());

  Array.from(totalsByBalance.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([balance, total]) => {
      const tr = document.createElement("tr");
      tr.append(createCell(balance));
      tr.append(createCell(formatCurrency(total), "numeric"));
      elements.balanceSummaryBody.append(tr);
    });
}

function renderTransactionHeader() {
  elements.transactionHeader.innerHTML = "";

  const actionHeader = document.createElement("th");
  actionHeader.textContent = RECEIPT_EMAIL_COLUMN;
  elements.transactionHeader.append(actionHeader);

  DISPLAY_COLUMNS.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    if (column === AMOUNT_COLUMN) {
      th.classList.add("numeric");
    }
    elements.transactionHeader.append(th);
  });
}

function renderTransactions() {
  elements.transactionBody.innerHTML = "";

  if (!state.filteredRows.length) {
    elements.transactionBody.append(emptyRow("No matching transactions.", DISPLAY_COLUMNS.length + 1));
    return;
  }

  state.filteredRows.forEach((row) => {
    const tr = document.createElement("tr");
    if (isMissingReceipt(row)) {
      tr.classList.add("missing-receipt");
    }

    tr.append(createReceiptEmailCell(row));
    DISPLAY_COLUMNS.forEach((column) => {
      const classes = column === AMOUNT_COLUMN ? "numeric" : "";
      tr.append(createCell(formatDisplayValue(row, column), classes));
    });

    elements.transactionBody.append(tr);
  });
}

function createCell(text, className = "") {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) {
    td.className = className;
  }
  return td;
}

function formatDisplayValue(row, column) {
  if (column === ATTACHMENT_LOST_COLUMN) {
    return isTruthyValue(row[column]) ? "🚨" : "";
  }

  if (column === AMOUNT_COLUMN) {
    return formatTransactionAmount(row);
  }

  return row[column];
}

function formatTransactionAmount(row) {
  const debited = parseCurrency(row[DEBIT_COLUMN]);

  if (debited) {
    return `-${formatCurrency(Math.abs(debited))}`;
  }

  return formatCurrency(parseCurrency(row[CREDIT_COLUMN]));
}

function createReceiptEmailCell(row) {
  const td = document.createElement("td");

  if (!isMissingReceipt(row)) {
    return td;
  }

  td.append(createCopyEmailButton("Copy email", () => generateMissingReceiptEmail(row), row[NAME_COLUMN] || "this transaction"));

  return td;
}

function renderBulkReceiptEmailAction() {
  elements.bulkEmailActions.innerHTML = "";
  elements.bulkEmailActions.hidden = true;

  const selectedPerson = elements.personFilter.value;
  if (!selectedPerson) {
    return;
  }

  const missingReceiptRows = state.filteredRows.filter(isMissingReceipt);
  if (!missingReceiptRows.length) {
    return;
  }

  const helperText = document.createElement("p");
  helperText.textContent = `${selectedPerson} has ${missingReceiptRows.length.toLocaleString()} transaction${missingReceiptRows.length === 1 ? "" : "s"} without receipts in the current filter.`;

  const button = createCopyEmailButton(
    "Copy email for all missing receipts",
    () => generateBulkMissingReceiptEmail(selectedPerson, missingReceiptRows),
    `${selectedPerson}'s missing receipt transactions`,
  );

  elements.bulkEmailActions.append(helperText, button);
  elements.bulkEmailActions.hidden = false;
}

function createCopyEmailButton(label, getMessage, copiedLabel) {
  const button = document.createElement("button");
  button.className = "copy-email-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    try {
      await copyTextToClipboard(getMessage());
      announceCopied(`Copied email message to clipboard for ${copiedLabel}.`);
      button.textContent = "Copied!";
      window.setTimeout(() => {
        button.textContent = label;
      }, 2000);
    } catch (error) {
      announceCopied("The email text could not be copied. Please try again.", true);
    }
  });
  return button;
}

function generateMissingReceiptEmail(row) {
  const cardHolder = row[NAME_COLUMN] || "there";

  return [
    `Hi ${cardHolder},`,
    "",
    "Please log in to the Equals app and upload a receipt for this card transaction as soon as possible.",
    "",
    "Transaction details:",
    formatEmailTransactionDetails(row),
    "",
    "Thank you.",
  ].join("\n");
}

function generateBulkMissingReceiptEmail(cardHolder, rows) {
  return [
    `Hi ${cardHolder},`,
    "",
    "Please log in to the Equals app and upload receipts for the following card transactions as soon as possible.",
    "",
    "Transactions missing receipts:",
    rows.map((row, index) => formatEmailTransactionDetails(row, index + 1)).join("\n\n"),
    "",
    "Thank you.",
  ].join("\n");
}

function formatEmailTransactionDetails(row, itemNumber = null) {
  const prefix = itemNumber ? `${itemNumber}. ` : "- ";
  const description = row["Description"] || "No description supplied";
  const completedDate = row[DATE_COLUMN] || "No completed date supplied";
  const balance = row[BALANCE_COLUMN] || "No balance supplied";
  const amount = formatTransactionAmount(row);

  return [
    `${prefix}Completed date: ${completedDate}`,
    `  Description: ${description}`,
    `  Balance: ${balance}`,
    `  Amount: ${amount}`,
  ].join("\n");
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function emptyRow(message, colSpan) {
  const tr = document.createElement("tr");
  tr.className = "empty-row";
  const td = document.createElement("td");
  td.colSpan = colSpan;
  td.textContent = message;
  tr.append(td);
  return tr;
}

function isMissingReceipt(row) {
  if (!isReceiptRequiredTransaction(row)) {
    return false;
  }

  const lostValue = row[ATTACHMENT_LOST_COLUMN].toLowerCase();
  const hasNoAttachment = !row[INTERNAL_HAS_RECEIPT];
  const isMarkedLost = isTruthyValue(lostValue) || lostValue === "lost";
  return hasNoAttachment || isMarkedLost;
}

function isTruthyValue(value) {
  return ["yes", "true", "1", "y"].includes(String(value || "").trim().toLowerCase());
}

function isReceiptRequiredTransaction(row) {
  return row[TYPE_COLUMN].trim().toLowerCase() === "card" && row[STATUS_COLUMN].trim().toLowerCase() === "complete";
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const ukMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ukMatch) {
    return `${ukMatch[3]}-${ukMatch[2].padStart(2, "0")}-${ukMatch[1].padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function parseCurrency(value) {
  if (!value) {
    return 0;
  }

  const normalized = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function announceCopied(message, isError = false) {
  setStatus(message, isError);
  elements.copyFeedback.textContent = message;
  elements.copyFeedback.classList.toggle("is-error", isError);
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", isError);
}
