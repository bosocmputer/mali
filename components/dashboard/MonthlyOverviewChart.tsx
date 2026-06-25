"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const MONTH_SHORT_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

interface MonthlyData {
  month: number; // 1-12
  year: number;  // Gregorian
  submitted: number;
  processing: number;
  todo: number;
  overdue: number;
}

interface MonthlyOverviewChartProps {
  data: MonthlyData[];
  currentMonth: number; // 1-12
  currentYear: number;  // Gregorian
  isSupervisor: boolean;
  selectedYear: number; // Gregorian — used for Supervisor title only
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5">{label} · {total} งาน</p>
      {payload.map((p) =>
        p.value > 0 ? (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium text-foreground">{p.value}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

// สีที่ match theme blue ของเว็บ — light / dark แยกชัดเจน
const COLORS = {
  light: {
    overdue:    { base: "#EF4444", active: "#DC2626" }, // red-500 / red-600
    todo:       { base: "#93C5FD", active: "#60A5FA" }, // blue-300 / blue-400 (match primary)
    processing: { base: "#F59E0B", active: "#D97706" }, // amber-400 / amber-500
    submitted:  { base: "#34D399", active: "#10B981" }, // emerald-400 / emerald-500
  },
  dark: {
    overdue:    { base: "#F87171", active: "#EF4444" }, // red-400 / red-500 (สว่างขึ้นใน dark)
    todo:       { base: "#3B82F6", active: "#2563EB" }, // blue-500 / blue-600
    processing: { base: "#FBBF24", active: "#F59E0B" }, // amber-400 / amber-500
    submitted:  { base: "#10B981", active: "#059669" }, // emerald-500 / emerald-600
  },
};

export function MonthlyOverviewChart({
  data,
  currentMonth,
  currentYear,
  isSupervisor,
  selectedYear,
}: MonthlyOverviewChartProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const C = isDark ? COLORS.dark : COLORS.light;

  // สำหรับ Staff: ถ้าปีเปลี่ยน ให้แสดง "ก.ค. 70" เพื่อแยกปี
  const firstYear = data[0]?.year ?? currentYear;
  const chartData = data.map((d) => ({
    name: d.year !== firstYear
      ? `${MONTH_SHORT_TH[d.month - 1]}\n${String(d.year + 543).slice(2)}`
      : MONTH_SHORT_TH[d.month - 1],
    month: d.month,
    year: d.year,
    ยื่นแล้ว: d.submitted,
    กำลังดำเนินการ: d.processing,
    รอดำเนินการ: d.todo,
    เกินกำหนด: d.overdue,
    isCurrent: d.month === currentMonth && d.year === currentYear,
  }));

  const total = data.reduce((s, d) => s + d.submitted + d.processing + d.todo + d.overdue, 0);

  function handleBarClick(entry: { month: number; year: number }) {
    router.push(`/tasks?month=${entry.month}&year=${entry.year}`);
  }

  const title = isSupervisor
    ? `ภาพรวมงานรายเดือน ปี ${selectedYear + 543}`
    : "งานของคุณ 12 เดือนข้างหน้า";

  const subtitle = isSupervisor
    ? `${total} งานทั้งปี · คลิกเดือนเพื่อดูรายละเอียด`
    : `${total} งานทั้งหมด · คลิกเดือนเพื่อดูรายละเอียด`;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {subtitle}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              iconType="circle"
              iconSize={7}
            />
            <Bar dataKey="เกินกำหนด" stackId="a" fill={C.overdue.base} radius={[0, 0, 0, 0]}
              onClick={(data: unknown) => handleBarClick(data as { month: number; year: number })}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? C.overdue.active : C.overdue.base} opacity={entry.isCurrent ? 1 : 0.7} />
              ))}
            </Bar>
            <Bar dataKey="รอดำเนินการ" stackId="a" fill={C.todo.base} radius={[0, 0, 0, 0]}
              onClick={(data: unknown) => handleBarClick(data as { month: number; year: number })}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? C.todo.active : C.todo.base} opacity={entry.isCurrent ? 1 : 0.7} />
              ))}
            </Bar>
            <Bar dataKey="กำลังดำเนินการ" stackId="a" fill={C.processing.base} radius={[0, 0, 0, 0]}
              onClick={(data: unknown) => handleBarClick(data as { month: number; year: number })}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? C.processing.active : C.processing.base} opacity={entry.isCurrent ? 1 : 0.7} />
              ))}
            </Bar>
            <Bar dataKey="ยื่นแล้ว" stackId="a" fill={C.submitted.base} radius={[3, 3, 0, 0]}
              onClick={(data: unknown) => handleBarClick(data as { month: number; year: number })}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? C.submitted.active : C.submitted.base} opacity={entry.isCurrent ? 1 : 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
