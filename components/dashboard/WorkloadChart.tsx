"use client";

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

interface WorkloadChartProps {
  data: WorkloadData[];
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  if (data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
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
        <CardTitle className="text-base font-semibold">สรุปงานพนักงาน</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="submitted"
              name="ยื่นแล้ว"
              fill="#10B981"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="processing"
              name="กำลังดำเนินการ"
              fill="#F59E0B"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="todo"
              name="รอดำเนินการ"
              fill="#94A3B8"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="overdue"
              name="เกินกำหนด"
              fill="#EF4444"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
