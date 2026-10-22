// CSV helpers shared by exports and their regression tests.
const FORMULA_PREFIX = /^[\t\r\n ]*[=+@]/;

export const escapeCsvCell = (value, protectFormula = false) => {
  let text = String(value ?? "");

  // Spreadsheet cells beginning with =, + or @ can execute as formulas.
  // Apply this only to untrusted text columns so negative numeric results
  // remain real numbers in the exported file.
  if (protectFormula && FORMULA_PREFIX.test(text)) {
    text = "'" + text;
  }

  return /[",\r\n]/.test(text)
    ? '"' + text.replace(/"/g, '""') + '"'
    : text;
};

export const serializeCsv = (headers, rows, safeTextColumns = []) => {
  const allRows = [headers, ...rows];
  const csvRows = allRows.map((row, rowIndex) =>
    row.map((value, columnIndex) =>
      escapeCsvCell(value, rowIndex > 0 && safeTextColumns.includes(columnIndex))
    ).join(",")
  );

  // UTF-8 BOM helps spreadsheet software display Spanish accents correctly.
  return "\uFEFF" + csvRows.join("\r\n");
};
