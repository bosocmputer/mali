"use client";

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
} from "recharts";
import { WorkloadData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const COLORS = {
  light: {
    overdue:    "#EF4444",
    todo:       "#93C5FD",
    processing: "#F59E0B",
    submitted:  "#34D399",
    grid:       "hsl(var(--border))",
  },
  dark: {
    overdue:    "#F87171",
    todo:       "#3B82F6",
    processing: "#FBBF24",
    submitted:  "#10B981",
    grid:       "hsl(var(--border))",
  },
};

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
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium text-foreground">{p.value}</span>
          </div>
        ) : null
      )}
    </div>
  );
}

interface WorkloadChartProps {
  data: WorkloadData[];
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  const { resolvedTheme } = useTheme();
  const C = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            สรุปงานพนักงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            ไม่มีข้อมูล
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          สรุปงานพนักงาน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="submitted"  name="ยื่นแล้ว"       fill={C.submitted}  radius={[3, 3, 0, 0]} />
            <Bar dataKey="processing" name="กำลังดำเนินการ" fill={C.processing} radius={[3, 3, 0, 0]} />
            <Bar dataKey="todo"       name="รอดำเนินการ"    fill={C.todo}       radius={[3, 3, 0, 0]} />
            <Bar dataKey="overdue"    name="เกินกำหนด"      fill={C.overdue}    radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
