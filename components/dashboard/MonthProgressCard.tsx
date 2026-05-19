"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthProgressCardProps {
  submitted: number;
  processing: number;
  todo: number;
  overdue: number;
  total: number;
  monthLabel: string;
}

type ActiveTab = "submitted" | "processing" | "todo" | "overdue" | "all";

const TABS: { key: ActiveTab; label: string; color: string; textColor: string }[] = [
  { key: "submitted",  label: "ยื่นแล้ว",          color: "bg-emerald-500", textColor: "text-emerald-600" },
  { key: "processing", label: "กำลังดำเนินการ",    color: "bg-amber-400",   textColor: "text-amber-600"  },
  { key: "todo",       label: "รอดำเนินการ",        color: "bg-slate-400",   textColor: "text-slate-600"  },
  { key: "overdue",    label: "เกินกำหนด",          color: "bg-red-500",     textColor: "text-red-600"    },
  { key: "all",        label: "ทั้งหมด",            color: "bg-primary",     textColor: "text-primary"    },
];

export function MonthProgressCard({ submitted, processing, todo, overdue, total, monthLabel }: MonthProgressCardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("submitted");

  const getValue = (tab: ActiveTab) => {
    if (tab === "submitted")  return submitted;
    if (tab === "processing") return processing;
    if (tab === "todo")       return todo;
    if (tab === "overdue")    return overdue;
    return total;
  };

  const current = getValue(activeTab);
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const tabInfo = TABS.find((t) => t.key === activeTab)!;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          ความคืบหน้าการยื่นแบบ {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ไม่มีงานในเดือนนี้</p>
        ) : (
          <>
            {/* Filter tabs — แนวนอน */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {tab.label} ({getValue(tab.key)})
                </button>
              ))}
            </div>

            {/* Big number */}
            <div className="flex items-end gap-3">
              <span className={cn("text-4xl font-bold", tabInfo.textColor)}>{current}</span>
              <span className="text-sm text-muted-foreground pb-1">/ {total} งาน · {pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={cn("h-3 rounded-full transition-all duration-700", tabInfo.color)}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border">
              <div className="text-center">
                <p className="text-base font-bold text-emerald-600">{submitted}</p>
                <p className="text-xs text-muted-foreground">ยื่นแล้ว</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-base font-bold text-amber-600">{processing}</p>
                <p className="text-xs text-muted-foreground">กำลังดำเนินการ</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-base font-bold text-slate-600">{todo}</p>
                <p className="text-xs text-muted-foreground">รอดำเนินการ</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-base font-bold text-red-500">{overdue}</p>
                <p className="text-xs text-muted-foreground">เกินกำหนด</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
