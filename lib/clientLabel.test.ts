import { describe, expect, it } from "vitest";
import { clientLabel } from "./clientLabel";

describe("clientLabel", () => {
  it("head office shows the plain name", () => {
    expect(clientLabel({ companyName: "บจก.เอ", branchCode: "00000" })).toBe("บจก.เอ");
    expect(clientLabel({ companyName: "บจก.เอ" })).toBe("บจก.เอ");
  });
  it("head office of a company with branches says so", () => {
    expect(clientLabel({ companyName: "บจก.เอ", branchCode: "00000", hasBranches: true })).toBe("บจก.เอ (สำนักงานใหญ่)");
  });
  it("branches show code and optional name", () => {
    expect(clientLabel({ companyName: "บจก.เอ", branchCode: "00001" })).toBe("บจก.เอ (สาขา 00001)");
    expect(clientLabel({ companyName: "บจก.เอ", branchCode: "00002", branchName: "เชียงใหม่" })).toBe(
      "บจก.เอ (สาขา 00002 เชียงใหม่)"
    );
  });
});
