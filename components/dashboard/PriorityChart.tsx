"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface PriorityData {
  name: string;
  count: number;
  color: string;
}

interface PriorityChartProps {
  data: PriorityData[];
}

export function PriorityChart({ data }: PriorityChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          ความเร่งด่วนของงานที่รอดำเนินการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
            ไม่มีงานที่รอดำเนินการ
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value} งาน`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
                    <circle cx="5" cy="5" r="5" fill={d.color} />
                  </svg>
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-semibold">{d.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
