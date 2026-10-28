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

const localExcelDate = (date) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000`;
};

const styledCell = (value, style, mergeAcross = 0) => {
  const merge = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `<Cell ss:StyleID="${style}"${merge}><Data ss:Type="DateTime">${localExcelDate(value)}</Data></Cell>`;
  }
  const numeric = typeof value === "number" && Number.isFinite(value);
  const type = numeric ? "Number" : "String";
  return `<Cell ss:StyleID="${style}"${merge}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
};

/** Build a reader-facing, branded history report while retaining exact values. */
export const buildProfessionalExcelXml = ({
  headers,
  rows,
  title = "JJXCAPITAL · HISTORIAL DE OPERACIONES",
  subtitle = "Exportación de historial",
  summary = [],
  note = "Los importes se conservan en su moneda de origen y no se agregan entre divisas. El beneficio realizado aplica a ventas emparejadas según FIFO.",
  sheetName = "Historial",
  numericColumns = [],
  dateColumns = [],
  typeColumn = -1,
  coverageColumn = -1,
}) => {
  const headerCount = headers.length;
  const headerRowIndex = 6;
  const widths = headers.map((header, columnIndex) => {
    const maxLength = rows.reduce((max, row) => {
      const value = row[columnIndex];
      const display = value instanceof Date && Number.isFinite(value.getTime())
        ? "00/00/0000 00:00"
        : String(value ?? "");
      return Math.max(max, display.length);
    }, String(header ?? "").length);
    return Math.min(280, Math.max(100, maxLength * 7 + 24));
  });
  const columns = widths.map((width) => `<Column ss:Width="${width}"/>`).join("");
  const mergedRow = (value, style) => `<Row>${styledCell(value, style, Math.max(0, headerCount - 1))}</Row>`;
  const summaryCells = (style) => {
    const groupWidth = Math.floor(headerCount / Math.max(summary.length, 1));
    let consumed = 0;
    return summary.map((item, index) => {
      const width = index === summary.length - 1 ? headerCount - consumed : groupWidth;
      consumed += width;
      return styledCell(item[style === "SummaryLabel" ? "label" : "value"], style, width - 1);
    }).join("");
  };
  const summaryRows = summary.length
    ? `<Row ss:Height="20">${summaryCells("SummaryLabel")}</Row><Row ss:Height="27">${summaryCells("SummaryValue")}</Row>`
    : "";
  const headerRow = `<Row ss:Height="34">${headers.map((header) => styledCell(header, "TableHeader")).join("")}</Row>`;
  const bodyRows = rows.map((row, rowIndex) => {
    const alternate = rowIndex % 2 === 1;
    const cells = headers.map((_, columnIndex) => {
      const value = row[columnIndex];
      let style = alternate ? "BodyAlt" : "Body";
      if (numericColumns.includes(columnIndex) && value !== "" && value !== null && value !== undefined) {
        style = alternate ? "NumberAlt" : "Number";
      }
      if (dateColumns.includes(columnIndex) && value instanceof Date) {
        style = alternate ? "DateAlt" : "DateCell";
      }
      if (columnIndex === typeColumn && value === "Compra") style = "Purchase";
      if (columnIndex === typeColumn && value === "Venta") style = "Sale";
      if (columnIndex === coverageColumn) {
        if (value === "Completo") style = "CoverageComplete";
        else if (value === "Parcial") style = "CoveragePartial";
      }
      return styledCell(value, style);
    }).join("");
    return `<Row ss:Height="22">${cells}</Row>`;
  }).join("");
  const filterEndRow = headerRowIndex + rows.length;

  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Color="#26354D"/></Style>
<Style ss:ID="Title"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#17243A"/></Style>
<Style ss:ID="Subtitle"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Color="#52627A"/></Style>
<Style ss:ID="SummaryLabel"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#52627A"/><Interior ss:Color="#F1F4F9" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D5DEEB"/></Borders></Style>
<Style ss:ID="SummaryValue"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#5144B8"/><Interior ss:Color="#F8F9FC" ss:Pattern="Solid"/></Style>
<Style ss:ID="ReportNote"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Color="#52627A" ss:Italic="1"/></Style>
<Style ss:ID="TableHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#24324A" ss:Pattern="Solid"/><Borders><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#53627A"/></Borders></Style>
<Style ss:ID="Body"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Color="#26354D"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E8F0"/></Borders></Style>
<Style ss:ID="BodyAlt"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Color="#26354D"/><Interior ss:Color="#F7F9FC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E3E8F0"/></Borders></Style>
<Style ss:ID="Number" ss:Parent="Body"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0.########"/></Style>
<Style ss:ID="NumberAlt" ss:Parent="BodyAlt"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><NumberFormat ss:Format="#,##0.########"/></Style>
<Style ss:ID="DateCell" ss:Parent="Body"><NumberFormat ss:Format="dd/mm/yyyy hh:mm"/></Style>
<Style ss:ID="DateAlt" ss:Parent="BodyAlt"><NumberFormat ss:Format="dd/mm/yyyy hh:mm"/></Style>
<Style ss:ID="Purchase"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#176B45"/><Interior ss:Color="#EFFAF4" ss:Pattern="Solid"/></Style>
<Style ss:ID="Sale"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#5144B8"/><Interior ss:Color="#F1EFFF" ss:Pattern="Solid"/></Style>
<Style ss:ID="CoverageComplete" ss:Parent="Purchase"/><Style ss:ID="CoveragePartial"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#845500"/><Interior ss:Color="#FFF8E8" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="${xmlEscape(sheetName)}"><Table>${columns}
${mergedRow(title, "Title")}<Row ss:Height="20">${styledCell(subtitle, "Subtitle", Math.max(0, headerCount - 1))}</Row>
${summaryRows}<Row ss:Height="25">${styledCell(note, "ReportNote", Math.max(0, headerCount - 1))}</Row>
${headerRow}${bodyRows}</Table>
<AutoFilter x:Range="R${headerRowIndex}C1:R${filterEndRow}C${headerCount}" xmlns="urn:schemas-microsoft-com:office:excel"/>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>${headerRowIndex}</SplitHorizontal><TopRowBottomPane>${headerRowIndex}</TopRowBottomPane><DoNotDisplayGridlines/></WorksheetOptions>
</Worksheet></Workbook>`;
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
