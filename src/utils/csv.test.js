import { escapeCsvCell, serializeCsv } from "./csv";

describe("CSV helpers", () => {
  test("quotes delimiters and doubles embedded quotes", () => {
    expect(escapeCsvCell('López, "Jeremi"')).toBe('"López, ""Jeremi"""');
    expect(escapeCsvCell("línea 1\r\nlínea 2")).toBe('"línea 1\r\nlínea 2"');
  });

  test("protects text values that begin with spreadsheet formulas", () => {
    const formulaCell = escapeCsvCell("=HYPERLINK(\"https://example.com\")", true);
    expect(formulaCell.startsWith('"')).toBe(true);
    expect(formulaCell).toContain("'=HYPERLINK(");
    expect(formulaCell).toContain('""https://example.com""');
    expect(escapeCsvCell("+SUM(A1:A2)", true)).toBe("'+SUM(A1:A2)");
    expect(escapeCsvCell("normal text", true)).toBe("normal text");
  });

  test("keeps negative numeric results numeric and emits UTF-8 BOM/CRLF", () => {
    const csv = serializeCsv(
      ["ID", "Nombre", "Beneficio"],
      [["safe-id", 'López, "Jere"', "-12.50"]],
      [0, 1]
    );

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"López, ""Jere"""');
    expect(csv).toContain("-12.50");
    expect(csv).toContain("\r\n");
    expect(csv).not.toContain("'-12.50");
  });
});
