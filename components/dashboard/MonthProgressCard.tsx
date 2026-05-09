"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthProgressCardProps {
  submitted: number;
  total: number;
  monthLabel: string;
}

export function MonthProgressCard({ submitted, total, monthLabel }: MonthProgressCardProps) {
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const remaining = total - submitted;

  const color =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 50 ? "bg-amber-500" :
                "bg-red-400";

  const textColor =
    pct >= 80 ? "text-emerald-600" :
    pct >= 50 ? "text-amber-600" :
                "text-red-500";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          ความคืบหน้า {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ไม่มีงานในเดือนนี้</p>
        ) : (
          <>
            {/* Big percentage */}
            <div className="flex items-end gap-3">
              <span className={cn("text-4xl font-bold", textColor)}>{pct}%</span>
              <span className="text-sm text-muted-foreground pb-1">ยื่นแล้ว</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={cn("h-3 rounded-full transition-all duration-700", color)}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{submitted}</p>
                <p className="text-xs text-muted-foreground">ยื่นแล้ว</p>
              </div>
              <div className="text-center border-x border-border">
                <p className="text-xl font-bold text-amber-600">{remaining}</p>
                <p className="text-xs text-muted-foreground">ยังค้างอยู่</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{total}</p>
                <p className="text-xs text-muted-foreground">ทั้งหมด</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
