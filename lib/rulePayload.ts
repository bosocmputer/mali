import { z } from "zod";

const calcMethodSchema = z.enum(["fixed_day", "offset_days", "offset_months"]);
const referenceDateSchema = z.enum(["month_end", "fiscal_year_end", "agm_date"]);

function nullableTrimmedString() {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }, z.union([z.string(), z.null()]).optional());
}

function requiredTrimmedString() {
  return z.string().trim().min(1);
}

function nullableInt(min: number, max: number) {
  return z.preprocess((value) => {
    if (value === undefined || value === "") return undefined;
    if (value === null) return null;
    return Number(value);
  }, z.union([z.number().int().min(min).max(max), z.null()]).optional());
}

function validateCalculationFields(
  data: {
    calcMethod?: z.infer<typeof calcMethodSchema>;
    fixedDay?: number | null;
    offset?: number | null;
  },
  ctx: z.RefinementCtx
) {
  if (data.calcMethod === "fixed_day" && data.fixedDay == null) {
    ctx.addIssue({
      code: "custom",
      path: ["fixedDay"],
      message: "กรุณาระบุวันที่ครบกำหนด 1-31",
    });
  }

  if (
    (data.calcMethod === "offset_days" ||
      data.calcMethod === "offset_months") &&
    data.offset == null
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["offset"],
      message: "กรุณาระบุจำนวนวัน/เดือน",
    });
  }
}

const ruleFieldsSchema = z.object({
  ruleCode: requiredTrimmedString(),
  name: requiredTrimmedString(),
  description: nullableTrimmedString(),
  taxForm: nullableTrimmedString(),
  calcMethod: calcMethodSchema,
  fixedDay: nullableInt(1, 31),
  offset: nullableInt(1, 366),
  referenceDate: referenceDateSchema,
  legalRef: requiredTrimmedString(),
});

export const createRuleSchema = ruleFieldsSchema.superRefine(
  validateCalculationFields
);

export const updateRuleSchema = ruleFieldsSchema
  .partial()
  .extend({
    id: z.string().min(1),
  })
  .superRefine(validateCalculationFields);

export function firstRulePayloadError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "ข้อมูลเกณฑ์ไม่ถูกต้อง";
  if (issue.path.includes("id")) return "id is required";
  return issue.message || "ข้อมูลเกณฑ์ไม่ถูกต้อง";
}
