import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { toRule } from "@/lib/dbMappers";
import { calculateDueDateByRule, type CalcMethod, type TaxRule } from "@/lib/ruleEngine";
import { adjustDueDateFromDb } from "@/lib/repositories/holidays";
import type { Rule } from "@/types";

export class DuplicateRuleCodeError extends Error {
  constructor() {
    super("DUPLICATE_RULE_CODE");
  }
}

type RuleRecord = {
  ruleCode: string;
  name: string;
  taxForm: string | null;
  calcMethod: string;
  fixedDay: number | null;
  offset: number | null;
  referenceDate: string;
  legalRef: string;
};

function toTaxRule(rule: RuleRecord): TaxRule {
  return {
    ruleCode: rule.ruleCode,
    name: rule.name,
    ...(rule.taxForm ? { taxForm: rule.taxForm } : {}),
    calcMethod: rule.calcMethod as CalcMethod,
    ...(rule.fixedDay !== null ? { fixedDay: rule.fixedDay } : {}),
    ...(rule.offset !== null ? { offset: rule.offset } : {}),
    referenceDate: rule.referenceDate as TaxRule["referenceDate"],
    legalRef: rule.legalRef,
  };
}

export async function getRuleByTaxFormFromDb(taxTypeName: string): Promise<TaxRule | null> {
  const rule = await prisma.rule.findFirst({
    where: { taxForm: taxTypeName },
    orderBy: { ruleCode: "asc" },
  });
  return rule ? toTaxRule(rule) : null;
}

export async function getAllRulesFromDb(): Promise<Rule[]> {
  const rules = await prisma.rule.findMany({
    orderBy: { ruleCode: "asc" },
  });
  return rules.map(toRule);
}

export async function createRuleInDb(
  data: Omit<Rule, "id">
): Promise<Rule> {
  try {
    const rule = await prisma.rule.create({
      data: {
        id: randomUUID(),
        ruleCode: data.ruleCode,
        name: data.name,
        description: data.description ?? null,
        taxForm: data.taxForm ?? null,
        calcMethod: data.calcMethod,
        fixedDay: data.fixedDay ?? null,
        offset: data.offset ?? null,
        referenceDate: data.referenceDate,
        legalRef: data.legalRef,
        updatedAt: new Date(),
        daysOffset: data.daysOffset ?? null,
        taxTypeName: data.taxTypeName ?? null,
      },
    });
    return toRule(rule);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new DuplicateRuleCodeError();
    }
    throw error;
  }
}

export async function updateRuleInDb(
  id: string,
  data: Partial<Omit<Rule, "id">>
): Promise<Rule | null> {
  try {
    const rule = await prisma.rule.update({
      where: { id },
      data: {
        ...(data.ruleCode !== undefined ? { ruleCode: data.ruleCode } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.taxForm !== undefined ? { taxForm: data.taxForm ?? null } : {}),
        ...(data.calcMethod !== undefined ? { calcMethod: data.calcMethod } : {}),
        ...(data.fixedDay !== undefined ? { fixedDay: data.fixedDay ?? null } : {}),
        ...(data.offset !== undefined ? { offset: data.offset ?? null } : {}),
        ...(data.referenceDate !== undefined ? { referenceDate: data.referenceDate } : {}),
        ...(data.legalRef !== undefined ? { legalRef: data.legalRef } : {}),
        ...(data.daysOffset !== undefined ? { daysOffset: data.daysOffset ?? null } : {}),
        ...(data.taxTypeName !== undefined ? { taxTypeName: data.taxTypeName ?? null } : {}),
        updatedAt: new Date(),
      },
    });
    return toRule(rule);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      if (error.code === "P2025") return null;
      if (error.code === "P2002") throw new DuplicateRuleCodeError();
    }
    throw error;
  }
}

export async function deleteRuleFromDb(id: string): Promise<boolean> {
  const deleted = await prisma.rule.deleteMany({
    where: { id },
  });
  return deleted.count > 0;
}

export async function getDueDateByTaxTypeFromDb(
  taxTypeName: string,
  baseDate: Date
): Promise<Date | null> {
  const rule = await getRuleByTaxFormFromDb(taxTypeName);
  if (!rule) return null;
  return adjustDueDateFromDb(calculateDueDateByRule(rule, baseDate));
}
