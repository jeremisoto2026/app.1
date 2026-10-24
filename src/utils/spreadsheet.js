// Excel-compatible SpreadsheetML export with calculated column widths.
// This format stores column widths in the file; CSV cannot do that.
const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export const buildExcelXml = (headers, rows) => {
  const allRows = [headers, ...rows];
  const widths = headers.map((header, index) => {
    const maxLength = allRows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length), String(header ?? "").length);
    return Math.min(360, Math.max(90, maxLength * 7 + 24));
  });
  const columns = widths.map(width => `<Column ss:Width="${width}" ss:AutoFitWidth="1"/>`).join("");
  const rowXml = allRows.map((row, rowIndex) => {
    const cells = headers.map((_, columnIndex) => {
      const value = row[columnIndex] ?? "";
      const numeric = rowIndex > 0 && typeof value === "number" && Number.isFinite(value);
      const type = numeric ? "Number" : "String";
      const style = rowIndex === 0 ? ' ss:StyleID="Header"' : "";
      return `<Cell${style}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
    }).join("");
    return `<Row>${cells}</Row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#24324A" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="Historial"><Table>${columns}${rowXml}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet>
</Workbook>`;
};

export const downloadExcelXml = (filename, xml) => {
  const blob = new Blob(["\uFEFF", xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
