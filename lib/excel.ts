import ExcelJS from "exceljs";

export type Column = { header: string; key: string; width?: number; money?: boolean };
export type Sheet = { name: string; columns: Column[]; rows: Record<string, unknown>[] };

/**
 * FR-103: build an .xlsx. Only report/task columns go in — never government-site passwords
 * (NFR-10); callers pass plain row objects, there is no path from credentials to here.
 */
export async function toXlsx(sheets: Sheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MALI";
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const row of sheet.rows) ws.addRow(row);
    sheet.columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = "#,##0.00";
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function xlsxResponse(buf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
