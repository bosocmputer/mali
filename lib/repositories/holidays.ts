import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { toThaiHoliday } from "@/lib/dbMappers";
import type { ThaiHoliday } from "@/types";

type CreateHolidayInput = Omit<ThaiHoliday, "id">;

export class DuplicateHolidayDateError extends Error {
  constructor() {
    super("DUPLICATE_HOLIDAY_DATE");
  }
}

export function parseHolidayDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === date ? parsed : null;
}

export async function getAllHolidaysFromDb(): Promise<ThaiHoliday[]> {
  const holidays = await prisma.thaiHoliday.findMany({
    orderBy: { date: "asc" },
  });
  return holidays.map(toThaiHoliday);
}

export async function getHolidayDatesFromDb(): Promise<Set<string>> {
  const holidays = await prisma.thaiHoliday.findMany({
    select: { date: true },
  });
  return new Set(holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)));
}

export async function createHolidayInDb(
  data: CreateHolidayInput
): Promise<ThaiHoliday> {
  const date = parseHolidayDate(data.date);
  if (!date) throw new Error("INVALID_HOLIDAY_DATE");

  try {
    const holiday = await prisma.thaiHoliday.create({
      data: {
        id: randomUUID(),
        date,
        nameTh: data.name_th,
        nameEn: data.name_en,
        type: data.type,
        isSubstitution: data.is_substitution,
        note: data.note ?? null,
      },
    });
    return toThaiHoliday(holiday);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new DuplicateHolidayDateError();
    }
    throw error;
  }
}

export async function deleteHolidayFromDb(id: string): Promise<boolean> {
  const deleted = await prisma.thaiHoliday.deleteMany({
    where: { id },
  });
  return deleted.count > 0;
}

export async function syncHolidaysToDb(
  items: Array<Pick<ThaiHoliday, "date" | "name_th" | "name_en">>
): Promise<number> {
  const validItems = items
    .map((item) => ({
      ...item,
      parsedDate: parseHolidayDate(item.date),
    }))
    .filter((item): item is typeof item & { parsedDate: Date } => Boolean(item.parsedDate));

  if (validItems.length === 0) return 0;

  const result = await prisma.thaiHoliday.createMany({
    data: validItems.map((item) => ({
      id: randomUUID(),
      date: item.parsedDate,
      nameTh: item.name_th,
      nameEn: item.name_en,
      type: "public_holiday",
      isSubstitution: false,
      note: null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

export async function adjustDueDateFromDb(date: Date): Promise<Date> {
  const holidayDates = await getHolidayDatesFromDb();
  let adjusted = new Date(date);

  while (
    isWeekend(adjusted) ||
    holidayDates.has(adjusted.toISOString().slice(0, 10))
  ) {
    adjusted = new Date(
      Date.UTC(
        adjusted.getUTCFullYear(),
        adjusted.getUTCMonth(),
        adjusted.getUTCDate() + 1
      )
    );
  }

  return adjusted;
}
