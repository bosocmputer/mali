import { describe, expect, it } from "vitest";
import { buildFlexMessage, OPEN_MALI_LABEL, openMaliFooterContents, TAP_TO_OPEN_NOTICE, VPN_NOTICE } from "./lineFlex";

const NOW = new Date("2026-10-15T03:00:00.000Z"); // 15 Oct, Thailand
const URL = "http://10.158.8.86:3000/tasks?status=OVERDUE";

type Node = Record<string, unknown>;
function collect(node: unknown, pred: (n: Node) => boolean, out: Node[] = []): Node[] {
  if (Array.isArray(node)) node.forEach((n) => collect(n, pred, out));
  else if (node && typeof node === "object") {
    if (pred(node as Node)) out.push(node as Node);
    Object.values(node as Node).forEach((v) => collect(v, pred, out));
  }
  return out;
}
const texts = (msg: object) => collect(msg, (n) => n.type === "text").map((n) => String(n.text));

function task(id: string, due: string, url?: string, company = `Company ${id}`) {
  return { taxType: "ภ.ง.ด.3", company, dueDate: `${due}T00:00:00.000Z`, url };
}

describe("buildFlexMessage", () => {
  it("never adds a button to the main card — the rows are the links", () => {
    const msg = buildFlexMessage("ESCALATION", [task("a", "2026-09-15", "http://x/tasks?taskId=a")], undefined, { listUrl: URL, now: NOW });
    expect(collect(msg, (n) => n.type === "button")).toHaveLength(0);
  });

  it("tells people to tap a task (and to be on the VPN) only when something in the card is tappable", () => {
    const tappable = buildFlexMessage("ESCALATION", [task("a", "2026-09-15", "http://x/tasks?taskId=a")], undefined, { now: NOW });
    expect(texts(tappable)).toContain(TAP_TO_OPEN_NOTICE);

    const plain = buildFlexMessage("ESCALATION", [task("a", "2026-09-15")], undefined, { now: NOW });
    expect(texts(plain)).not.toContain(TAP_TO_OPEN_NOTICE);
  });

  it("makes the 'and N more' line open the full list, when a list url is given", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => task(`t${i}`, "2026-09-15", `http://x/tasks?taskId=t${i}`));
    const withList = buildFlexMessage("ESCALATION", tasks, undefined, { listUrl: URL, now: NOW });
    const overflow = collect(
      withList,
      (n) => n.type === "box" && (n.action as Node | undefined)?.uri === URL
    );
    expect(overflow).toHaveLength(1);
    expect(texts(withList)).toContain("และอีก 2 งาน...");

    const withoutList = buildFlexMessage("ESCALATION", tasks, undefined, { now: NOW });
    expect(collect(withoutList, (n) => (n.action as Node | undefined)?.uri === URL)).toHaveLength(0);
  });

  it("keeps LINE's limits: link URIs <= 1000 chars", () => {
    expect(URL.length).toBeLessThanOrEqual(1000);
  });

  it("still offers the open button helper for the summary cards", () => {
    const footer = openMaliFooterContents(URL);
    const button = footer.find((n) => (n as Node).type === "button") as Node;
    expect((button.action as Node)).toMatchObject({ type: "uri", uri: URL, label: OPEN_MALI_LABEL });
    expect(OPEN_MALI_LABEL.length).toBeLessThanOrEqual(20); // LINE's button label limit
    expect(footer.some((n) => (n as Node).text === VPN_NOTICE)).toBe(true);
  });

  it("makes a row tappable only when it has a url", () => {
    const msg = buildFlexMessage(
      "ESCALATION",
      [task("mine", "2026-09-15", "http://x/tasks?taskId=mine"), task("theirs", "2026-09-16")],
      undefined,
      { now: NOW }
    );
    const rowActions = collect(msg, (n) => n.type === "box" && (n.action as Node | undefined)?.type === "uri");
    expect(rowActions).toHaveLength(1);
    expect((rowActions[0].action as Node).uri).toBe("http://x/tasks?taskId=mine");
  });

  it("shows how many days overdue each task is, and flags today / tomorrow", () => {
    const msg = buildFlexMessage(
      "ESCALATION",
      [task("a", "2026-09-15"), task("b", "2026-10-15"), task("c", "2026-10-16")],
      undefined,
      { now: NOW }
    );
    const all = texts(msg).join("\n");
    expect(all).toContain("เกิน 30 วัน");
    expect(all).toContain("· วันนี้");
    expect(all).toContain("· พรุ่งนี้");
  });

  it("summarises the header: total, overdue, due today, due tomorrow", () => {
    const msg = buildFlexMessage(
      "ESCALATION",
      [task("a", "2026-09-15"), task("b", "2026-10-15"), task("c", "2026-10-16")],
      undefined,
      { now: NOW }
    );
    expect(texts(msg)).toContain("3 งาน · เกินกำหนด 1 · ครบวันนี้ 1 · ครบพรุ่งนี้ 1");
  });

  it("keeps the 'N days left' header for D-N reminders", () => {
    const msg = buildFlexMessage("REMINDER", [task("a", "2026-10-22")], 7, { now: NOW });
    expect(texts(msg)).toContain("(อีก 7 วัน) — 1 งาน");
  });

  it("lists the most overdue first and caps rows at 10 with an overflow line", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => task(`t${i}`, `2026-09-${String(20 - i).padStart(2, "0")}`));
    const msg = buildFlexMessage("ESCALATION", tasks, undefined, { now: NOW });
    const rowTitles = collect(msg, (n) => n.type === "text" && String(n.text).startsWith("Company ")).map((n) => String(n.text));
    expect(rowTitles).toHaveLength(10);
    expect(rowTitles[0]).toBe("Company t11"); // oldest due date (9 Sep)
    expect(texts(msg)).toContain("และอีก 2 งาน...");
  });
});
