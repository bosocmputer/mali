"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardYearFilterProps {
  currentYear: number;
  yearOptions: number[];
}

export function DashboardYearFilter({
  currentYear,
  yearOptions,
}: DashboardYearFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleYearChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", value);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <Select value={String(currentYear)} onValueChange={handleYearChange}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {yearOptions.map((y) => (
          <SelectItem key={y} value={String(y)}>
            ปี {y + 543}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
