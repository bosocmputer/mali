"use client";

import { useRouter } from "next/navigation";
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

export function MonthlyOverviewChart({
  data,
  currentMonth,
  currentYear,
  isSupervisor,
  selectedYear,
}: MonthlyOverviewChartProps) {
  const router = useRouter();

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
            onClick={(e: unknown) => {
              const ev = e as { activePayload?: { payload: { month: number; year: number } }[] } | null;
              if (ev?.activePayload?.[0]?.payload) {
                handleBarClick(ev.activePayload[0].payload);
              }
            }}
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
            <Bar dataKey="เกินกำหนด" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? "#DC2626" : "#EF4444"} opacity={entry.isCurrent ? 1 : 0.75} />
              ))}
            </Bar>
            <Bar dataKey="รอดำเนินการ" stackId="a" fill="#94A3B8" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? "#64748B" : "#94A3B8"} opacity={entry.isCurrent ? 1 : 0.75} />
              ))}
            </Bar>
            <Bar dataKey="กำลังดำเนินการ" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? "#D97706" : "#F59E0B"} opacity={entry.isCurrent ? 1 : 0.75} />
              ))}
            </Bar>
            <Bar dataKey="ยื่นแล้ว" stackId="a" fill="#10B981" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isCurrent ? "#059669" : "#10B981"} opacity={entry.isCurrent ? 1 : 0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
