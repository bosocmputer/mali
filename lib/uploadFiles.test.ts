import { describe, expect, it } from "vitest";
import { fileNameOf } from "./uploadFiles";

describe("fileNameOf", () => {
  it("shows the original name kept in the stored file name", () => {
    const stored = "user_d999cdad-2c8b-47aa-9a5a-94c01cdc5fe5-1794891523097-สลิป_ลูกค้า.jpg";
    expect(fileNameOf(`/api/uploads/${encodeURIComponent(stored)}`)).toBe("สลิป_ลูกค้า.jpg");
  });
  it("older uploads show only their type, not the user id", () => {
    expect(fileNameOf("/api/uploads/user_d999cdad-2c8b-47aa-9a5a-94c01cdc5fe5-1794891523097.pdf")).toBe("ไฟล์แนบ.pdf");
  });
});
