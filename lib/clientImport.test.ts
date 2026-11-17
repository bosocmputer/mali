import { describe, expect, it } from "vitest";
import { validateImportRows, type ImportContext } from "./clientImport";

const ctx: ImportContext = {
  taxForms: new Set(["ภ.ง.ด.1", "ภ.พ.30"]),
  usersByEmail: new Map([["nes@x.com", "u-nes"]]),
  existingKeys: new Set(["0105500000001|00000"]),
};
const row = (over: Record<string, string>, rowNumber = 2) => ({
  rowNumber,
  companyName: "บจก.ใหม่",
  taxId: "0105500000009",
  businessType: "ธุรกิจบริการ",
  fiscalYearEnd: "31/12",
  taxTypes: "ภ.ง.ด.1, ภ.พ.30",
  ...over,
});

describe("validateImportRows (FR-106)", () => {
  it("accepts a good row and fills defaults", () => {
    const r = validateImportRows([row({ assigneeEmail: "NES@x.com", filingMethod: "ออนไลน์", monthlyFee: "3,640", branchCode: "1" })], ctx);
    expect(r.errors).toEqual([]);
    expect(r.valid[0]).toMatchObject({ branchCode: "00001", fiscalYearEnd: 12, fiscalYearEndDay: 31, filingMethod: "E_FILING", monthlyFee: 3640, assignedStaffId: "u-nes", taxTypes: ["ภ.ง.ด.1", "ภ.พ.30"] });
  });

  it("reports every problem of a row with a reason", () => {
    const r = validateImportRows([row({ companyName: "", taxId: "123", fiscalYearEnd: "31/02", taxTypes: "ภงด.99", assigneeEmail: "who@x.com", filingMethod: "fax" })], ctx);
    expect(r.valid).toHaveLength(0);
    expect(r.errors[0].messages).toEqual(
      expect.arrayContaining([
        "ไม่มีชื่อบริษัท",
        "เลขนิติบุคคลต้องเป็นตัวเลข 13 หลัก",
        "วันสิ้นรอบบัญชีไม่ใช่วันที่จริง",
        "วิธียื่นต้องเป็น ออนไลน์ หรือ กระดาษ",
        "ไม่พบผู้ใช้อีเมล who@x.com",
      ])
    );
  });

  it("catches duplicates against MALI and within the file", () => {
    const r = validateImportRows([row({ taxId: "0105500000001" }, 2), row({}, 3), row({}, 4)], ctx);
    expect(r.errors.map((e) => e.rowNumber)).toEqual([2, 4]);
    expect(r.errors[1].messages[0]).toContain("ซ้ำกับแถวที่ 3");
    expect(r.valid.map((v) => v.rowNumber)).toEqual([3]);
  });
});
