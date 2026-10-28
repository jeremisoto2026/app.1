import { buildExcelXml } from "./spreadsheet";

describe("Excel SpreadsheetML export", () => {
  test("calculates column widths from the longest visible value", () => {
    const xml = buildExcelXml(["Fecha", "Operación"], [["2026-10-24", "Compra"], ["2026-10-25", "Operación con descripción larga"]]);
    expect(xml).toContain('ss:AutoFitWidth="1"');
    expect(xml).toContain('ss:Width="94"');
    expect(xml).toContain("Operación con descripción larga");
  });

  test("escapes XML characters and emits a readable Excel worksheet", () => {
    const xml = buildExcelXml(["Nombre"], [["A & B < test"]]);
    expect(xml).toContain("A &amp; B &lt; test");
    expect(xml).toContain('<Worksheet ss:Name="Historial">');
    expect(xml).toContain('<Style ss:ID="Header">');
  });
  test("exports finite numeric values as numeric Excel cells", () => {
    const xml = buildExcelXml(["Cantidad", "Beneficio"], [[1.25, -0.5]]);
    expect(xml).toContain('<Data ss:Type="Number">1.25</Data>');
    expect(xml).toContain('<Data ss:Type="Number">-0.5</Data>');
  });

});
